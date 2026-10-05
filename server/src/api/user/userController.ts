import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import bcrypt from "bcrypt";
import jwt, { sign } from "jsonwebtoken";
import { createHash, createHmac, randomBytes } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { validationResult } from "express-validator";
import { db, users, userRoleEnum, businessPartners } from "../../db";
import { eq, desc, asc, count, sql, ilike, or, inArray, type SQL } from "drizzle-orm";
import { config } from "../../config/config";
import { claimOnce } from "../../config/redisClient";
import { sendResetPasswordEmail as sendResetPasswordEmailMaileroo, sendVerificationEmail as sendVerificationEmailMaileroo } from "../../controller/maileroo";
import { uploadSellerDocuments } from "../../services/sellerDocumentService";
import { ensureMediaFolder } from "../../services/mediaFolderService";
import { HTTP_STATUS, sendSuccess, sendPaginatedResponse } from "../../utils/apiResponse";
import { getAuthCookieOptions, getClearCookieOptions, COOKIE_NAMES, COOKIE_DURATIONS } from "../../utils/cookieUtils";
import * as pgUsers from "./userRepo.pg";
import type { SellerInfo } from "./userTypes";
import { coerceUserRole, isUserRole } from "../../utils/roles";
import { invalidateAgency } from '../../services/cacheInvalidation';

const SORTABLE = new Set(['createdAt', 'name', 'email']);

// These accounts are businesses. The list shows the business name, and the person's name as the contact.
const BUSINESS_NAME_ROLES = new Set(['seller', 'hotel', 'guesthouse', 'restaurant', 'transport', 'advertiser']);

/**
 * These are plain signed JWTs with no server-side record of issuance, so
 * nothing stops the same link being used twice within its 1h expiry (e.g.
 * if a reset email gets forwarded or sits in a shared inbox). Redis gives
 * us cheap single-use enforcement without turning the token into a
 * stateful session: claim the hash once, TTL matches the token's own
 * expiry so the marker cleans itself up. Fails open (allows the request)
 * if Redis is unavailable — see claimOnce.
 */
const tokenClaimKey = (kind: 'verify-email' | 'reset-password', token: string) =>
  `used-token:${kind}:${createHash('sha256').update(token).digest('hex')}`;

// create user
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return next(createHttpError(400, "All fields are required"));
  }

  try {
    const existing = await pgUsers.findUserByEmail(email);
    if (existing) {
      return next(createHttpError(400, "User already exists with this email."));
    }
  } catch (err) {
    return next(createHttpError(500, "Error while getting user"));
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const isDevMode = config.env === 'development';

    const newUser = await pgUsers.createUser({
      name,
      email,
      phone,
      password: hashedPassword,
      verified: isDevMode, // Auto-verify in development
    });

    if (isDevMode) {
      const userResponse = { id: newUser.id, name: newUser.name, email: newUser.email };
      return sendSuccess(res, userResponse, 'User created successfully (auto-verified in development mode)', HTTP_STATUS.CREATED);
    }

    // Send verification email in production
    try {
      const verificationToken = jwt.sign({ sub: newUser.id }, config.jwtSecret, {
        expiresIn: '1h',
        algorithm: 'HS256',
      });
      await sendVerificationEmailMaileroo(email, name, verificationToken);
      return sendSuccess(res, null, 'Verification email sent. Please check your inbox.', HTTP_STATUS.CREATED);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      const userResponse = { id: newUser.id, name: newUser.name, email: newUser.email };
      return sendSuccess(res, userResponse, 'User created successfully but verification email could not be sent. Please contact support.', HTTP_STATUS.CREATED);
    }
  } catch (err) {
    console.error('Error while creating user:', err);
    return next(createHttpError(500, "Error while creating user"));
  }
};

// Login a user
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, keepMeSignedIn = false } = req.body;
  if (!email || !password) {
    return next(createHttpError(400, "All fields are required"));
  }

  try {
    const user = await pgUsers.findUserByEmail(email);
    if (!user) {
      return next(createHttpError(404, "User not found."));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(createHttpError(400, "Username or password incorrect!"));
    }

    return sendSuccess(res, { user: startSession(res, user, keepMeSignedIn) }, 'Login successful');
  } catch (err) {
    console.error('Error while logging in user:', err);
    next(createHttpError(500, "Error while logging in user"));
  }
};

/** Signs the user in: sets the auth cookie and returns the user fields the app keeps in its store. */
export function startSession(res: Response, user: pgUsers.PgUser, keepMeSignedIn: boolean) {
  const expiresIn = keepMeSignedIn ? '30d' : '2h';
  const token = sign({ sub: user.id, roles: user.role, keepMeSignedIn }, config.jwtSecret, { expiresIn });
  const maxAge = keepMeSignedIn ? COOKIE_DURATIONS.LONG_SESSION : COOKIE_DURATIONS.SHORT_SESSION;
  res.cookie(COOKIE_NAMES.AUTH_TOKEN, token, getAuthCookieOptions(maxAge));
  return {
    id: user.id,
    roles: user.role,
    email: user.email,
    name: user.name,
    phone: user.phone,
    verified: user.verified,
    avatar: user.avatar,
  };
}

/**
 * Sign in (or sign up) with Google. The browser gets a signed ID token from Google; we check its signature and that it
 * was issued for OUR client id, then use the verified email (see findOrCreateSocialUser). Off until GOOGLE_CLIENT_ID is set.
 */
export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return next(createHttpError(503, 'Google sign-in is not available right now.'));
  const { credential, keepMeSignedIn = false } = req.body ?? {};
  if (!credential || typeof credential !== 'string') return next(createHttpError(400, 'Missing Google credential.'));

  let payload: { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string } | undefined;
  try {
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    return next(createHttpError(401, 'Google sign-in could not be verified. Please try again.'));
  }
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    return next(createHttpError(400, 'Your Google account needs a verified email address.'));
  }

  try {
    const user = await findOrCreateSocialUser({ provider: 'google', providerId: payload.sub, email: payload.email, name: payload.name, picture: payload.picture });
    return sendSuccess(res, { user: startSession(res, user, !!keepMeSignedIn) }, 'Login successful');
  } catch (err) {
    console.error('Error while signing in with Google:', err);
    next(createHttpError(500, 'Error while signing in with Google'));
  }
};

/**
 * The account for a person who signed in with Google or Facebook, given the identity the provider vouched for:
 *  - known provider account          -> that user
 *  - existing account, same email    -> link it (the provider has confirmed the mailbox) and use it
 *  - new person                      -> create a verified account (no usable password)
 */
async function findOrCreateSocialUser(p: { provider: 'google' | 'facebook'; providerId: string; email: string; name?: string; picture?: string | null }) {
  const column = p.provider === 'google' ? users.googleId : users.facebookId;
  const link = p.provider === 'google' ? { googleId: p.providerId } : { facebookId: p.providerId };
  const known = (await db.select().from(users).where(eq(column, p.providerId)).limit(1))[0];
  if (known) return known;

  const email = p.email.trim().toLowerCase();
  const byEmail = await pgUsers.findUserByEmail(email);
  if (byEmail) {
    return (await pgUsers.updateUser(byEmail.id, { ...link, verified: true, avatar: byEmail.avatar ?? p.picture ?? null }))!;
  }
  return pgUsers.createUser({
    name: p.name?.trim() || email.split('@')[0],
    email,
    // Nobody knows this password; the account is entered through the provider (or a password reset).
    password: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
    verified: true,
    avatar: p.picture ?? null,
    ...link,
  });
}

/**
 * Sign in (or sign up) with Facebook. The browser gets a user access token from the Facebook SDK; we ask Facebook
 * whether that token is valid and was issued to OUR app (debug_token), then read the person's id and email with it.
 * Off until FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are set.
 */
export const facebookLogin = async (req: Request, res: Response, next: NextFunction) => {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) return next(createHttpError(503, 'Facebook sign-in is not available right now.'));
  const { accessToken, keepMeSignedIn = false } = req.body ?? {};
  if (!accessToken || typeof accessToken !== 'string' || accessToken.length > 2048) return next(createHttpError(400, 'Missing Facebook access token.'));

  const graph = 'https://graph.facebook.com';
  let profile: { id?: string; name?: string; email?: string; picture?: { data?: { url?: string; is_silhouette?: boolean } } };
  try {
    // 1. Was this token issued to our app, and is it still valid? (A token minted for another app must not work here.)
    const debug = await fetch(`${graph}/debug_token?${new URLSearchParams({ input_token: accessToken, access_token: `${appId}|${appSecret}` })}`, { signal: AbortSignal.timeout(8000) });
    const info = ((await debug.json()) as { data?: { is_valid?: boolean; app_id?: string; user_id?: string } }).data;
    if (!debug.ok || !info?.is_valid || info.app_id !== appId || !info.user_id) throw new Error('token rejected');

    // 2. Who is it? appsecret_proof proves the call comes from our server, not just someone holding the token.
    const proof = createHmac('sha256', appSecret).update(accessToken).digest('hex');
    const me = await fetch(`${graph}/me?${new URLSearchParams({ fields: 'id,name,email,picture.type(large)', access_token: accessToken, appsecret_proof: proof })}`, { signal: AbortSignal.timeout(8000) });
    profile = (await me.json()) as typeof profile;
    if (!me.ok || profile.id !== info.user_id) throw new Error('profile mismatch');
  } catch {
    return next(createHttpError(401, 'Facebook sign-in could not be verified. Please try again.'));
  }
  // Facebook only returns an email address the person has confirmed. Some accounts have none (phone sign-up),
  // or the person declined to share it.
  if (!profile.email) {
    return next(createHttpError(400, 'We need your email address. Allow TourBNT to see your email on Facebook, or sign up with email instead.'));
  }

  try {
    const picture = profile.picture?.data?.is_silhouette ? null : profile.picture?.data?.url ?? null;
    const user = await findOrCreateSocialUser({ provider: 'facebook', providerId: profile.id!, email: profile.email, name: profile.name, picture });
    return sendSuccess(res, { user: startSession(res, user, !!keepMeSignedIn) }, 'Login successful');
  } catch (err) {
    console.error('Error while signing in with Facebook:', err);
    next(createHttpError(500, 'Error while signing in with Facebook'));
  }
};

export const logoutUser = (req: Request, res: Response) => {
  const cookieOptions = getClearCookieOptions();
  res.clearCookie(COOKIE_NAMES.AUTH_TOKEN, cookieOptions);
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, cookieOptions);
  res.json({ message: 'Logged out successfully' });
};

// Get current authenticated user
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(createHttpError(HTTP_STATUS.UNAUTHORIZED, "Not authenticated"));
    }

    const user = req.authAccount ?? (await pgUsers.findUserById(req.user.id));
    if (!user) {
      return next(createHttpError(HTTP_STATUS.NOT_FOUND, "User not found"));
    }

    const keepMeSignedIn = req.user?.keepMeSignedIn === true;
    const expiresIn = keepMeSignedIn ? '30d' : '2h';
    const maxAge = keepMeSignedIn ? COOKIE_DURATIONS.LONG_SESSION : COOKIE_DURATIONS.SHORT_SESSION;

    const newToken = sign(
      { sub: user.id, roles: user.role, keepMeSignedIn },
      config.jwtSecret,
      { expiresIn }
    );

    const cookieOptions = getAuthCookieOptions(maxAge);
    res.cookie(COOKIE_NAMES.AUTH_TOKEN, newToken, cookieOptions);

    const sellerStatus = pgUsers.computeSellerStatus(user.sellerInfo as SellerInfo | null);

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.role,
      phone: user.phone,
      verified: user.verified,
      avatar: user.avatar,
      sellerStatus,
      // The profile page's Banking/Company tabs read this straight off
      // /users/me — without it they render blank on every fresh load
      // (a PATCH response happens to include it, masking the gap until reload).
      sellerInfo: user.sellerInfo,
    };

    return sendSuccess(res, userResponse, 'User data retrieved successfully');
  } catch (error) {
    return next(createHttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Error fetching user data"));
  }
};

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conditions: SQL[] = [];
    const roleFilter = req.filters?.roles;
    if (roleFilter && (userRoleEnum.enumValues as readonly string[]).includes(roleFilter)) {
      conditions.push(eq(users.role, roleFilter as (typeof userRoleEnum.enumValues)[number]));
    }
    if (req.filters?.sellerStatus === 'pending') {
      conditions.push(sql`${users.sellerInfo} IS NOT NULL AND (${users.sellerInfo}->>'isApproved')::boolean IS NOT TRUE AND (${users.sellerInfo}->>'rejectionReason') IS NULL`);
    } else if (req.filters?.sellerStatus === 'approved') {
      conditions.push(sql`(${users.sellerInfo}->>'isApproved')::boolean IS TRUE`);
    } else if (req.filters?.sellerStatus === 'rejected') {
      conditions.push(sql`(${users.sellerInfo}->>'rejectionReason') IS NOT NULL`);
    }
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q) {
      const like = `%${q}%`;
      const search = or(
        ilike(users.name, like),
        ilike(users.email, like),
        ilike(users.phone, like),
        sql`${users.sellerInfo}->>'companyName' ILIKE ${like}`,
        sql`EXISTS (SELECT 1 FROM business_partners bp WHERE bp.owner_id = ${users.id} AND bp.name ILIKE ${like})`,
      );
      if (search) conditions.push(search);
    }
    const where = conditions.length ? sql.join(conditions, sql` AND `) : undefined;

    const sortField = req.sort?.field && SORTABLE.has(req.sort.field) ? req.sort.field : 'createdAt';
    const sortOrder = req.sort?.order === 'asc' ? asc : desc;
    const orderColumn = users[sortField as 'createdAt' | 'name' | 'email'];

    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const pageLimit = typeof limit === 'number' ? limit : 10;

    const [rows, [{ value: totalItems }]] = await Promise.all([
      db.select().from(users).where(where).orderBy(sortOrder(orderColumn)).limit(pageLimit).offset(skip),
      db.select({ value: count() }).from(users).where(where),
    ]);

    const partnerOwnerIds = rows.filter((u) => BUSINESS_NAME_ROLES.has(u.role) && u.role !== 'seller').map((u) => u.id);
    const partnerRows = partnerOwnerIds.length
      ? await db
        .select({ ownerId: businessPartners.ownerId, name: businessPartners.name, type: businessPartners.type })
        .from(businessPartners)
        .where(inArray(businessPartners.ownerId, partnerOwnerIds))
      : [];
    const partnersByOwner = new Map<string, Array<{ name: string; type: string }>>();
    for (const partner of partnerRows) {
      const list = partnersByOwner.get(partner.ownerId) ?? [];
      list.push({ name: partner.name, type: partner.type });
      partnersByOwner.set(partner.ownerId, list);
    }

    const items = rows.map((u) => {
      const isBusiness = BUSINESS_NAME_ROLES.has(u.role);
      let businessName: string | null = null;
      if (u.role === 'seller') {
        const company = (u.sellerInfo as { companyName?: string } | null)?.companyName?.trim();
        businessName = company || null;
      } else if (isBusiness) {
        const owned = partnersByOwner.get(u.id) ?? [];
        businessName = (owned.find((p) => p.type === u.role) ?? owned[0])?.name?.trim() || null;
      }
      return { ...pgUsers.withoutPassword(u), businessName, contactPerson: isBusiness ? u.name : null };
    });

    sendPaginatedResponse(res, items, {
      page,
      limit: pageLimit,
      totalItems,
      totalPages: Math.ceil(totalItems / pageLimit),
    }, 'Users retrieved successfully');
  } catch (err) {
    console.error("Error in getAllUsers:", err);
    return next(createHttpError(500, "Error while getting users"));
  }
};

// Lightweight, grouped people list for the "New chat" picker (admin only): a handful of
// rows per kind of account plus the true total, returned in one request. Only the columns the
// picker shows are selected (the full user rows carry seller documents and are much heavier).
const DIRECTORY_GROUPS: Array<{ key: string; label: string; roles: string[] }> = [
  { key: 'seller', label: 'Sellers', roles: ['seller'] },
  { key: 'transport', label: 'Transport', roles: ['transport'] },
  { key: 'hotel', label: 'Hotels & guesthouses', roles: ['hotel', 'guesthouse'] },
  { key: 'guide', label: 'Guides', roles: ['guide'] },
  { key: 'restaurant', label: 'Restaurants', roles: ['restaurant'] },
  { key: 'advertiser', label: 'Advertisers', roles: ['advertiser'] },
  { key: 'user', label: 'Customers', roles: ['user'] },
];

export const getUserDirectory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limit = Math.min(Math.max(parseInt(String(req.query.limit)) || 15, 1), 50);
    const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
    const roles = DIRECTORY_GROUPS.flatMap((g) => g.roles);
    // Which group a role belongs to (hotel + guesthouse share one).
    // Constants from DIRECTORY_GROUPS (never user input), inlined as literals.
    const groupOf = sql.raw(DIRECTORY_GROUPS.flatMap((g) => g.roles.map((r) => `WHEN '${r}' THEN '${g.key}'`)).join(' '));

    // ONE query: group, count and take the first N per group with window functions —
    // a single round trip to the remote database instead of one (or two) per group.
    const rows = (await db.execute(sql`
      SELECT id, name, email, avatar, role::text AS role, grp, total
      FROM (
        SELECT id, name, email, avatar, role, grp,
               count(*) OVER (PARTITION BY grp) AS total,
               row_number() OVER (PARTITION BY grp ORDER BY name) AS rn
        FROM (
          SELECT id, name, email, avatar, role, CASE role::text ${groupOf} END AS grp
          FROM users
          WHERE role::text IN (${sql.raw(roles.map((r) => `'${r}'`).join(','))})
          ${q ? sql`AND (name ILIKE ${like} OR email ILIKE ${like})` : sql``}
        ) t
      ) x
      WHERE rn <= ${limit}
      ORDER BY grp, name
    `)) as unknown as Array<{ id: string; name: string; email: string; avatar: string | null; role: string; grp: string; total: string | number }>;

    const groups = DIRECTORY_GROUPS.map((g) => {
      const items = rows.filter((r) => r.grp === g.key);
      return {
        key: g.key,
        label: g.label,
        total: items.length ? Number(items[0].total) : 0,
        items: items.map(({ id, name, email, avatar, role }) => ({ id, name, email, avatar, role })),
      };
    });

    return sendSuccess(res, { groups }, 'User directory retrieved successfully');
  } catch (err) {
    console.error('Error in getUserDirectory:', err);
    return next(createHttpError(500, 'Error while loading the user directory'));
  }
};

// Per-role head-count for the admin Users tabs (admin only)
export const getUserRoleCounts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db.select({ role: users.role, value: count() }).from(users).groupBy(users.role);
    const counts: Record<string, number> = {};
    let total = 0;
    for (const r of rows) { counts[r.role] = Number(r.value); total += Number(r.value); }
    return sendSuccess(res, { counts, total }, 'User role counts retrieved successfully');
  } catch (err) {
    console.error('Error in getUserRoleCounts:', err);
    return next(createHttpError(500, 'Error while getting user role counts'));
  }
};

// Get a single user by ID (admin only)
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params;
  if (!userId) {
    return next(createHttpError(400, "User ID is required"));
  }

  try {
    const user = await pgUsers.findUserById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    return sendSuccess(res, pgUsers.withoutPassword(user), 'User retrieved successfully');
  } catch (err) {
    return next(createHttpError(500, "Error while getting user"));
  }
};

// Update a user by ID (self or admin)
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ errors: errors.array() });
  }

  const userId = req.user?.id;
  if (!userId) {
    return next(createHttpError(401, 'Not authenticated'));
  }

  try {
    const user = await pgUsers.findUserById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    const isAdmin = req.user?.roles.includes('admin') || false;
    if (!(userId === req.user?.id || isAdmin)) {
      return next(createHttpError(403, "You cannot update other users."));
    }

    const isSellerApplication = req.body.companyName && req.body.companyRegistrationNumber && req.body.sellerType;

    if (isSellerApplication) {
      const existingSellerInfo = user.sellerInfo as SellerInfo | null;
      if (existingSellerInfo?.isApproved) {
        return next(createHttpError(400, "You already have an approved seller account."));
      }

      let uploadedDocuments = {};
      if (req.files && Object.keys(req.files).length > 0) {
        try {
          uploadedDocuments = await uploadSellerDocuments(req.files as { [fieldname: string]: Express.Multer.File[] });
        } catch (uploadError) {
          console.error('Failed to upload documents:', uploadError);
          return next(createHttpError(500, "Failed to upload documents. Please try again."));
        }
      }

      const sellerInfo: SellerInfo = {
        companyName: req.body.companyName,
        companyRegistrationNumber: req.body.companyRegistrationNumber,
        companyType: req.body.companyType,
        registrationDate: req.body.registrationDate,
        taxId: req.body.taxId,
        website: req.body.website || '',
        contactPerson: req.body.contactPerson,
        phone: req.body.phone,
        alternatePhone: req.body.alternatePhone,
        businessAddress: {
          address: req.body.address,
          city: req.body.city,
          state: req.body.state,
          postalCode: req.body.postalCode,
          country: req.body.country,
        },
        bankDetails: {
          bankName: req.body.bankName,
          accountNumber: req.body.accountNumber,
          accountHolderName: req.body.accountHolderName,
          branchCode: req.body.branchCode,
        },
        businessDescription: req.body.businessDescription,
        sellerType: req.body.sellerType,
        documents: uploadedDocuments,
        isApproved: false,
        appliedAt: new Date(),
        rejectionReason: undefined,
        reapplicationCount: existingSellerInfo?.reapplicationCount ? existingSellerInfo.reapplicationCount + 1 : 1,
      };

      const updatedUser = await pgUsers.updateUser(userId, { sellerInfo });
      if (!updatedUser) {
        return next(createHttpError(404, "User not found"));
      }

      return sendSuccess(res, {
        user: pgUsers.withoutPassword(updatedUser),
        documentsUploaded: Object.keys(uploadedDocuments)
      }, "Seller application submitted successfully. It will be reviewed by our team.");
    } else {
      const { name, email, roles, password, phone } = req.body;

      const updateData: Partial<typeof users.$inferInsert> = {
        name: name || user.name,
        email: email || user.email,
        role: coerceUserRole(roles, user.role),
        phone: phone || user.phone,
      };

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await pgUsers.updateUser(userId, updateData);
      if (!updatedUser) {
        return next(createHttpError(404, "User not found"));
      }
      return sendSuccess(res, pgUsers.withoutPassword(updatedUser), 'User updated successfully');
    }
  } catch (err) {
    console.error('Error while updating user:', err);
    next(createHttpError(500, "Error while updating user"));
  }
};

// Get all seller applications (admin only)
export const getSellerApplications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user?.roles.includes('admin') || false;
    if (!isAdmin) {
      return next(createHttpError(403, "Only admin can view seller applications"));
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const hasApplication = sql`${users.sellerInfo} IS NOT NULL`;
    const isRejected = sql`(${users.sellerInfo}->>'rejectionReason') IS NOT NULL`;
    const isApproved = sql`(${users.sellerInfo}->>'isApproved')::boolean IS TRUE`;
    const isPending = sql`(${users.sellerInfo}->>'isApproved')::boolean IS NOT TRUE AND (${users.sellerInfo}->>'rejectionReason') IS NULL`;

    const conditions: SQL[] = [hasApplication];
    if (status === 'pending') conditions.push(isPending);
    else if (status === 'approved') conditions.push(isApproved);
    else if (status === 'rejected') conditions.push(isRejected);
    if (q) {
      const like = `%${q}%`;
      const search = or(ilike(users.name, like), ilike(users.email, like), sql`${users.sellerInfo}->>'companyName' ILIKE ${like}`);
      if (search) conditions.push(search);
    }
    const where = sql.join(conditions, sql` AND `);

    const [rows, [{ value: totalItems }], [statusCounts]] = await Promise.all([
      db.select().from(users).where(where).orderBy(desc(users.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ value: count() }).from(users).where(where),
      db.select({
        pending: sql<number>`count(*) filter (where ${isPending})`,
        approved: sql<number>`count(*) filter (where ${isApproved})`,
        rejected: sql<number>`count(*) filter (where ${isRejected})`,
      }).from(users).where(hasApplication),
    ]);

    const applications = rows.map((user) => {
      const sellerInfo = user.sellerInfo as SellerInfo | null;
      return {
        _id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        roles: user.role,
        sellerApplicationStatus: sellerInfo?.rejectionReason ? 'rejected' : (sellerInfo?.isApproved ? 'approved' : 'pending'),
        rejectionReason: sellerInfo?.rejectionReason,
        sellerInfo: sellerInfo ? {
          companyName: sellerInfo.companyName,
          companyRegistrationNumber: sellerInfo.companyRegistrationNumber,
          companyType: sellerInfo.companyType,
          registrationDate: sellerInfo.registrationDate,
          taxId: sellerInfo.taxId,
          website: sellerInfo.website,
          businessAddress: sellerInfo.businessAddress,
          bankDetails: sellerInfo.bankDetails,
          businessDescription: sellerInfo.businessDescription,
          sellerType: sellerInfo.sellerType,
          isApproved: sellerInfo.isApproved || false,
          appliedAt: sellerInfo.appliedAt || user.createdAt,
          approvedAt: sellerInfo.approvedAt,
          documents: sellerInfo.documents,
          contactPerson: sellerInfo.contactPerson,
          phone: sellerInfo.phone,
          alternatePhone: sellerInfo.alternatePhone,
          reapplicationCount: sellerInfo.reapplicationCount,
        } : undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });

    res.json({
      success: true,
      items: applications,
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
      counts: { pending: Number(statusCounts.pending), approved: Number(statusCounts.approved), rejected: Number(statusCounts.rejected) },
    });
  } catch (err) {
    console.error('Error while fetching seller applications:', err);
    next(createHttpError(500, "Error while fetching seller applications"));
  }
};

export const approveSellerApplication = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params;
  if (!userId) {
    return next(createHttpError(400, 'User ID is required'));
  }

  try {
    const isAdmin = req.user?.roles.includes('admin') || false;
    if (!isAdmin) {
      return next(createHttpError(403, "Only admin can approve seller applications"));
    }

    const user = await pgUsers.findUserById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    const sellerInfo = user.sellerInfo as SellerInfo | null;
    if (!sellerInfo) {
      return next(createHttpError(400, "User has not submitted a seller application"));
    }
    if (sellerInfo.isApproved) {
      return next(createHttpError(400, "Seller application already approved"));
    }

    const updatedSellerInfo: SellerInfo = { ...sellerInfo, isApproved: true, approvedAt: new Date(), rejectionReason: undefined, rejectedAt: undefined };

    // Never downgrade an admin to 'seller' — approving their own seller
    // application (e.g. a test/dual-role account) must not cost them admin
    // access. Any other current role (business-partner type, plain 'user')
    // legitimately becomes 'seller', since tour-management routes gate on
    // role === 'seller' exactly and the approval is explicitly granting that.
    const nextRole = user.role === 'admin' ? user.role : 'seller';

    const [updatedUser] = await db
      .update(users)
      .set({ role: nextRole, sellerInfo: updatedSellerInfo, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    await invalidateAgency(userId);

    // Create their tour-media R2 folder now, so it's ready before their first upload.
    await ensureMediaFolder(userId, sellerInfo.companyName);

    res.json({ user: pgUsers.withoutPassword(updatedUser), message: "Seller application approved successfully" });
  } catch (err) {
    console.error('Error while approving seller application:', err);
    next(createHttpError(500, "Error while approving seller application"));
  }
};

export const rejectSellerApplication = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params;
  const { reason } = req.body;
  if (!userId) {
    return next(createHttpError(400, 'User ID is required'));
  }

  try {
    const isAdmin = req.user?.roles.includes('admin') || false;
    if (!isAdmin) {
      return next(createHttpError(403, "Only admin can reject seller applications"));
    }

    const user = await pgUsers.findUserById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    const sellerInfo = user.sellerInfo as SellerInfo | null;
    if (!sellerInfo) {
      return next(createHttpError(400, "User has not submitted a seller application"));
    }

    const updatedSellerInfo: SellerInfo = { ...sellerInfo, isApproved: false, rejectionReason: reason, rejectedAt: new Date() };

    const [updatedUser] = await db
      .update(users)
      .set({ sellerInfo: updatedSellerInfo, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    await invalidateAgency(userId);

    res.json({ user: pgUsers.withoutPassword(updatedUser), message: "Seller application rejected" });
  } catch (err) {
    console.error('Error while rejecting seller application:', err);
    next(createHttpError(500, "Error while rejecting seller application"));
  }
};

// Delete a user by ID (self)
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(createHttpError(401, 'Not authenticated'));
    }

    const deleted = await pgUsers.removeUser(userId);
    if (!deleted) {
      return next(createHttpError(404, 'User not found'));
    }
    res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (err) {
    return next(createHttpError(500, "Error while deleting user"));
  }
};

// Change user roles (admin only)
export const changeUserRole = async (req: Request, res: Response, next: NextFunction) => {
  const adminUserId = req.user?.id;
  const targetUserId = req.params.userId;
  const newRole = req.body.role;

  if (!adminUserId) {
    return next(createHttpError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated'));
  }
  if (!targetUserId || newRole === undefined) {
    return next(createHttpError(HTTP_STATUS.BAD_REQUEST, 'User id and role are required'));
  }
  if (!isUserRole(newRole)) {
    return next(createHttpError(HTTP_STATUS.BAD_REQUEST, 'Invalid role'));
  }

  try {
    const adminUser = await pgUsers.findUserById(adminUserId);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'Only an admin can change user roles' });
    }

    const targetUser = await pgUsers.findUserById(targetUserId);
    if (!targetUser) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Target user not found' });
    }

    const updatedUser = await pgUsers.updateUser(targetUserId, { role: newRole });
    if (!updatedUser) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Target user not found' });
    }
    res.json(pgUsers.withoutPassword(updatedUser));
  } catch (err) {
    return next(createHttpError(500, "Error while changing user role"));
  }
};

export const verifyUser = async (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.body;
  if (!token) {
    return next(createHttpError(400, "Token is required"));
  }

  try {
    const decoded = jwt.verify(token as string, config.jwtSecret) as { sub: string };

    if (!(await claimOnce(tokenClaimKey('verify-email', token as string), 60 * 60))) {
      return next(createHttpError(400, "This verification link has already been used"));
    }

    const user = await pgUsers.findUserById(decoded.sub);
    if (!user) {
      return next(createHttpError(400, "Invalid token"));
    }

    await pgUsers.updateUser(user.id, { verified: true });
    res.status(HTTP_STATUS.OK).json({ message: 'Email verified successfully' });
  } catch (err) {
    return next(createHttpError(400, "Invalid or expired token"));
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  if (!email) {
    return next(createHttpError(400, 'Email is required'));
  }

  try {
    const user = await pgUsers.findUserByEmail(email);
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }

    if (!config.jwtSecret) {
      throw new Error('JWT Secret is not defined');
    }

    const resetToken = jwt.sign({ sub: user.id }, config.jwtSecret, {
      expiresIn: '1h',
      algorithm: 'HS256',
    });

    const isDevMode = config.env === 'development';

    if (isDevMode) {
      return res.status(HTTP_STATUS.OK).json({
        message: 'Development mode: Password reset token generated (check server logs)',
        resetToken,
        resetUrl: `${config.frontendDomain}/auth/login?forgottoken=${resetToken}`
      });
    }

    try {
      await sendResetPasswordEmailMaileroo(email, user.name, resetToken);
      res.status(HTTP_STATUS.OK).json({ message: 'Password reset email sent. Please check your inbox.' });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      res.status(HTTP_STATUS.OK).json({
        message: 'Password reset initiated but email could not be sent. Please contact support.',
      });
    }
  } catch (err) {
    console.error('Error in forgotPassword:', err);
    return next(createHttpError(500, 'Error while processing password reset'));
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return next(createHttpError(400, 'Token and new password are required'));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { sub: string };

    if (!(await claimOnce(tokenClaimKey('reset-password', token), 60 * 60))) {
      return next(createHttpError(400, 'This reset link has already been used'));
    }

    const user = await pgUsers.findUserById(decoded.sub);
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pgUsers.updateUser(user.id, { password: hashedPassword });

    res.status(HTTP_STATUS.OK).json({ message: 'Password reset successful' });
  } catch (err) {
    return next(createHttpError(400, 'Invalid or expired token'));
  }
};

export const deleteSellerApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return next(createHttpError(400, "User ID is required"));
    }

    const isAdmin = req.user?.roles.includes('admin') || false;
    if (!isAdmin) {
      return next(createHttpError(403, "Only admin can delete seller applications"));
    }

    const user = await pgUsers.findUserById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }
    if (!user.sellerInfo) {
      return next(createHttpError(400, "User is not a seller applicant"));
    }

    await pgUsers.updateUser(userId, { sellerInfo: null, role: 'user' });

    res.status(HTTP_STATUS.OK).json({
      message: "Seller application deleted successfully. User converted to normal user."
    });
  } catch (error) {
    return next(createHttpError(500, "Error deleting seller application"));
  }
};

// Update current user's profile
export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ errors: errors.array() });
  }

  const userId = req.user?.id;
  if (!userId) {
    return next(createHttpError(401, 'Not authenticated'));
  }

  try {
    const user = await pgUsers.findUserById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    const { name, email, phone, bankName, accountNumber, accountHolderName, branchCode } = req.body;

    const updateData: Partial<typeof users.$inferInsert> = {
      name: name || user.name,
      email: email || user.email,
      phone: phone || user.phone,
      updatedAt: new Date(),
    };

    if (bankName || accountNumber || accountHolderName || branchCode) {
      const existingSellerInfo = (user.sellerInfo as SellerInfo | null) || ({} as SellerInfo);
      updateData.sellerInfo = {
        ...existingSellerInfo,
        bankDetails: {
          ...existingSellerInfo.bankDetails,
          ...(bankName !== undefined && { bankName }),
          ...(accountNumber !== undefined && { accountNumber }),
          ...(accountHolderName !== undefined && { accountHolderName }),
          ...(branchCode !== undefined && { branchCode }),
        },
      };
    }

    const updatedUser = await pgUsers.updateUser(userId, updateData);
    if (!updatedUser) {
      return next(createHttpError(404, "User not found"));
    }
    res.json(pgUsers.withoutPassword(updatedUser));
  } catch (err) {
    console.error('Error while updating profile:', err);
    next(createHttpError(500, "Error while updating profile"));
  }
};

// Change current user's password
export const changeMyPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return next(createHttpError(400, "Current password and new password are required"));
  }

  const userId = req.user?.id;
  if (!userId) {
    return next(createHttpError(401, 'Not authenticated'));
  }

  try {
    const user = await pgUsers.findUserById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return next(createHttpError(400, "Current password is incorrect"));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pgUsers.updateUser(userId, { password: hashedPassword });

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error('Error while changing password:', err);
    next(createHttpError(500, "Error while changing password"));
  }
};

// Update user by ID (admin only)
export const updateUserById = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ errors: errors.array() });
  }

  const { userId } = req.params;
  if (!userId) {
    return next(createHttpError(400, "User ID is required"));
  }

  try {
    const user = await pgUsers.findUserById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    const { name, email, roles, password, phone } = req.body;
    // The route lets people edit their own account, but only an admin may change a role, an email address or
    // set a password here. Otherwise anyone could make themselves admin, or take over an account by switching
    // its email. People change their own password at PATCH /users/me/password (which asks for the current one).
    const isAdmin = req.user?.roles.includes('admin') === true;
    const wantsEmailChange = typeof email === 'string' && email.trim() !== '' && email.trim().toLowerCase() !== user.email.toLowerCase();
    if (!isAdmin && wantsEmailChange) {
      return next(createHttpError(403, 'Contact support to change the email address on your account.'));
    }

    const updateData: Partial<typeof users.$inferInsert> = {
      name: name || user.name,
      phone: phone || user.phone,
    };
    if (isAdmin) {
      updateData.email = email || user.email;
      updateData.role = coerceUserRole(roles, user.role);
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }
    }

    const updatedUser = await pgUsers.updateUser(userId, updateData);
    if (!updatedUser) {
      return next(createHttpError(404, "User not found"));
    }
    res.json(pgUsers.withoutPassword(updatedUser));
  } catch (err) {
    console.error('Error while updating user:', err);
    next(createHttpError(500, "Error while updating user"));
  }
};
