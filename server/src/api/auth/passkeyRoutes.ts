import express, { type Response } from 'express';
import createHttpError from 'http-errors';
import { createHash } from 'crypto';
import { sign, verify } from 'jsonwebtoken';
import { and, desc, eq } from 'drizzle-orm';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import { db, passkeys } from '../../db';
import { config } from '../../config/config';
import { claimOnce } from '../../config/redisClient';
import { authenticate } from '../../middlewares/authenticate';
import { authLimiter } from '../../middlewares/rateLimiter';
import { asyncAuthHandler } from '../../utils/routeWrapper';
import { sendSuccess } from '../../utils/apiResponse';
import { getAuthCookieOptions, getClearCookieOptions } from '../../utils/cookieUtils';
import { findUserById } from '../user/userRepo.pg';
import { startSession } from '../user/userController';

/**
 * Passkeys (WebAuthn): sign in with the device's fingerprint, face or screen lock.
 *
 * A signed-in person adds a passkey from their profile; the device keeps the private key and we store only the
 * public key. To sign in, the browser asks the device to sign a one-time challenge, and we check the signature.
 *
 * The challenge travels in a short-lived signed cookie (no server session needed) and can be used once.
 *
 * Settings: WEBAUTHN_RP_ID (the site's domain, e.g. tourbnt.com; defaults to the host of the first FRONTEND_DOMAIN)
 * and FRONTEND_DOMAIN (the allowed page origins). Browsers only allow passkeys on https pages or on localhost.
 */
const router = express.Router();

const CHALLENGE_COOKIE = 'pk_challenge';
const CHALLENGE_TTL_S = 5 * 60;
const RP_NAME = 'TourBNT';
const MAX_PASSKEYS = 10;

function allowedOrigins(): string[] {
  return (config.frontendDomain ?? '').split(',').map((d) => d.trim().replace(/\/+$/, '')).filter((d) => /^https?:\/\//.test(d));
}

function rpId(): string {
  if (process.env.WEBAUTHN_RP_ID) return process.env.WEBAUTHN_RP_ID;
  const first = allowedOrigins()[0];
  return first ? new URL(first).hostname : 'tourbnt.com';
}

type Purpose = 'register' | 'login';

function setChallenge(res: Response, challenge: string, purpose: Purpose, userId?: string) {
  const token = sign({ c: challenge, p: purpose, u: userId ?? null }, config.jwtSecret, { expiresIn: CHALLENGE_TTL_S });
  res.cookie(CHALLENGE_COOKIE, token, getAuthCookieOptions(CHALLENGE_TTL_S * 1000));
}

/** Reads and consumes the challenge cookie; throws if it is missing, expired, for another purpose, or already used. */
async function takeChallenge(req: express.Request, res: Response, purpose: Purpose, userId?: string): Promise<string> {
  const raw = req.cookies?.[CHALLENGE_COOKIE];
  res.clearCookie(CHALLENGE_COOKIE, getClearCookieOptions());
  const expired = createHttpError(400, 'This request has expired. Please try again.');
  if (!raw) throw expired;
  let data: { c?: string; p?: string; u?: string | null };
  try {
    data = verify(raw, config.jwtSecret) as typeof data;
  } catch {
    throw expired;
  }
  if (!data.c || data.p !== purpose || (purpose === 'register' && data.u !== userId)) throw expired;
  if (!(await claimOnce(`passkey:challenge:${createHash('sha256').update(data.c).digest('hex')}`, CHALLENGE_TTL_S))) throw expired;
  return data.c;
}

const listFor = (userId: string) =>
  db.select({ id: passkeys.id, name: passkeys.name, deviceType: passkeys.deviceType, backedUp: passkeys.backedUp, createdAt: passkeys.createdAt, lastUsedAt: passkeys.lastUsedAt })
    .from(passkeys).where(eq(passkeys.userId, userId)).orderBy(desc(passkeys.createdAt));

// ---------------------------------------------------------------------------
// managing your passkeys (signed in)
// ---------------------------------------------------------------------------
router.get('/', authenticate, asyncAuthHandler(async (req, res) => {
  sendSuccess(res, await listFor(req.user!.id), 'Passkeys');
}));

router.post('/register/options', authenticate, asyncAuthHandler(async (req, res) => {
  const user = await findUserById(req.user!.id);
  if (!user) throw createHttpError(404, 'User not found');
  const existing = await db.select({ id: passkeys.id, transports: passkeys.transports }).from(passkeys).where(eq(passkeys.userId, user.id));
  if (existing.length >= MAX_PASSKEYS) throw createHttpError(400, `You can add up to ${MAX_PASSKEYS} passkeys. Remove one you no longer use first.`);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpId(),
    userID: isoUint8Array.fromUTF8String(user.id),
    userName: user.email,
    userDisplayName: user.name,
    attestationType: 'none',
    // Don't register the same device twice.
    excludeCredentials: existing.map((p) => ({ id: p.id, transports: (p.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined })),
    // A discoverable credential lets the person sign in without typing their email; the device must check it is them.
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });
  setChallenge(res, options.challenge, 'register', user.id);
  sendSuccess(res, options, 'Registration options');
}));

router.post('/register/verify', authenticate, asyncAuthHandler(async (req, res) => {
  const userId = req.user!.id;
  const expectedChallenge = await takeChallenge(req, res, 'register', userId);
  let result;
  try {
    result = await verifyRegistrationResponse({
      response: req.body?.response,
      expectedChallenge,
      expectedOrigin: allowedOrigins(),
      expectedRPID: rpId(),
      requireUserVerification: true,
    });
  } catch (err) {
    throw createHttpError(400, `This passkey could not be added: ${(err as Error).message}`);
  }
  if (!result.verified || !result.registrationInfo) throw createHttpError(400, 'This passkey could not be verified.');

  const { credential, credentialDeviceType, credentialBackedUp } = result.registrationInfo;
  const name = String(req.body?.name ?? '').trim().slice(0, 60) || null;
  await db.insert(passkeys).values({
    id: credential.id,
    userId,
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ?? null,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    name,
  }).onConflictDoNothing();
  sendSuccess(res, await listFor(userId), 'Passkey added', 201);
}));

router.patch('/:id', authenticate, asyncAuthHandler(async (req, res) => {
  const name = String(req.body?.name ?? '').trim().slice(0, 60);
  if (!name) throw createHttpError(400, 'Give the passkey a name.');
  const updated = await db.update(passkeys).set({ name, updatedAt: new Date() })
    .where(and(eq(passkeys.id, req.params.id), eq(passkeys.userId, req.user!.id))).returning({ id: passkeys.id });
  if (!updated.length) throw createHttpError(404, 'Passkey not found');
  sendSuccess(res, await listFor(req.user!.id), 'Passkey renamed');
}));

router.delete('/:id', authenticate, asyncAuthHandler(async (req, res) => {
  const removed = await db.delete(passkeys).where(and(eq(passkeys.id, req.params.id), eq(passkeys.userId, req.user!.id))).returning({ id: passkeys.id });
  if (!removed.length) throw createHttpError(404, 'Passkey not found');
  sendSuccess(res, await listFor(req.user!.id), 'Passkey removed');
}));

// ---------------------------------------------------------------------------
// signing in with a passkey (public)
// ---------------------------------------------------------------------------
router.post('/login/options', authLimiter, asyncAuthHandler(async (_req, res) => {
  // No allowCredentials: the device offers whichever of its passkeys belong to this site.
  const options = await generateAuthenticationOptions({ rpID: rpId(), userVerification: 'required' });
  setChallenge(res, options.challenge, 'login');
  sendSuccess(res, options, 'Authentication options');
}));

router.post('/login/verify', authLimiter, asyncAuthHandler(async (req, res) => {
  const response = req.body?.response;
  const expectedChallenge = await takeChallenge(req, res, 'login');
  const notRecognised = createHttpError(401, 'This passkey is not recognised. It may have been removed from your account.');
  if (!response?.id || typeof response.id !== 'string') throw notRecognised;

  const [pk] = await db.select().from(passkeys).where(eq(passkeys.id, response.id)).limit(1);
  if (!pk) throw notRecognised;

  let result;
  try {
    result = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: allowedOrigins(),
      expectedRPID: rpId(),
      credential: {
        id: pk.id,
        publicKey: isoBase64URL.toBuffer(pk.publicKey),
        counter: pk.counter,
        transports: (pk.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined,
      },
      requireUserVerification: true,
    });
  } catch {
    throw createHttpError(401, 'Passkey sign-in could not be verified. Please try again.');
  }
  if (!result.verified) throw createHttpError(401, 'Passkey sign-in could not be verified. Please try again.');

  const user = await findUserById(pk.userId);
  if (!user) throw notRecognised;
  await db.update(passkeys).set({ counter: result.authenticationInfo.newCounter, lastUsedAt: new Date(), updatedAt: new Date() }).where(eq(passkeys.id, pk.id));

  sendSuccess(res, { user: startSession(res, user, req.body?.keepMeSignedIn === true) }, 'Login successful');
}));

export default router;
