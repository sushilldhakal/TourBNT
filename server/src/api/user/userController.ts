import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import bcrypt from "bcrypt";
import userModel from "./userModel";
import jwt from "jsonwebtoken";
import { sign } from "jsonwebtoken";
import { validationResult } from "express-validator";
import { config } from "../../config/config";
import { sendResetPasswordEmail as sendResetPasswordEmailMaileroo, sendVerificationEmail as sendVerificationEmailMaileroo } from "../../controller/maileroo";
import { uploadSellerDocuments } from "../../services/sellerDocumentService";
import { hybridPagination } from "../../utils/paginationUtils";
import { HTTP_STATUS } from "../../utils/apiResponse";
import { getAuthCookieOptions, getClearCookieOptions, COOKIE_NAMES, COOKIE_DURATIONS } from "../../utils/cookieUtils";
import { sendSuccess, sendPaginatedResponse } from "../../utils/apiResponse";
import * as pgUsers from "./userRepo.pg";

// create user
// Postgres (via @tourbnt/db) is the single source of truth for identity.
// The new account is also mirrored into the legacy MongoDB collection
// (best-effort, non-fatal) so endpoints not yet migrated off Mongoose
// (profile, avatar, seller workflows, admin user list) keep working.
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    const error = createHttpError(400, "All fields are required");
    return next(error);
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
    const sharedId = pgUsers.generateSharedUserId();

    const newUser = await pgUsers.createUser({
      id: sharedId,
      name,
      email,
      phone,
      password: hashedPassword,
      verified: isDevMode, // Auto-verify in development
    });

    await pgUsers.dualWriteToMongo(newUser);

    if (isDevMode) {
      const userResponse = { id: newUser.id, name: newUser.name, email: newUser.email };
      return sendSuccess(res, userResponse, 'User created successfully (auto-verified in development mode)', HTTP_STATUS.CREATED);
    }

    // Send verification email in production
    try {
      const verificationToken = jwt.sign({ sub: newUser.id }, config.jwtSecret, {
        expiresIn: '1h', // 1 hour
        algorithm: 'HS256',
      });
      await sendVerificationEmailMaileroo(email, name, verificationToken);
      return sendSuccess(res, null, 'Verification email sent. Please check your inbox.', HTTP_STATUS.CREATED);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Still create the user but notify about email failure
      const userResponse = { id: newUser.id, name: newUser.name, email: newUser.email };
      return sendSuccess(res, userResponse, 'User created successfully but verification email could not be sent. Please contact support.', HTTP_STATUS.CREATED);
    }

  } catch (err) {
    console.error('Error while creating user:', err);
    return next(createHttpError(500, "Error while creating user"));
  }
};

// Login a user — verifies against Postgres (source of truth for identity).
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

    const expiresIn = keepMeSignedIn ? '30d' : '2h';

    // Create JWT token with user ID, roles, and keepMeSignedIn flag
    const token = sign(
      {
        sub: user.id,
        roles: user.role,
        keepMeSignedIn: keepMeSignedIn, // Store in JWT to preserve during sliding session
      },
      config.jwtSecret,
      { expiresIn }
    );

    // Set token as HTTP-only cookie with proper configuration for dev/prod
    const maxAge = keepMeSignedIn ? COOKIE_DURATIONS.LONG_SESSION : COOKIE_DURATIONS.SHORT_SESSION;
    const cookieOptions = getAuthCookieOptions(maxAge);

    res.cookie(COOKIE_NAMES.AUTH_TOKEN, token, cookieOptions);

    const userResponse = {
      id: user.id,
      roles: user.role,
      email: user.email,
      name: user.name,
      phone: user.phone,
      verified: user.verified,
      avatar: user.avatar,
    };

    return sendSuccess(res, { user: userResponse }, 'Login successful');

  } catch (err) {
    console.error('Error while logging in user:', err);
    next(createHttpError(500, "Error while logging in user"));
  }
};

export const logoutUser = (req: Request, res: Response) => {
  const cookieOptions = getClearCookieOptions();

  res.clearCookie(COOKIE_NAMES.AUTH_TOKEN, cookieOptions);
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, cookieOptions);
  res.json({ message: 'Logged out successfully' });
};

// Get current authenticated user — reads from Postgres (source of truth for identity).
export const getCurrentUser = async (req: Request
  , res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(createHttpError(HTTP_STATUS.UNAUTHORIZED, "Not authenticated"));
    }

    const user = await pgUsers.findUserById(req.user.id);

    if (!user) {
      return next(createHttpError(HTTP_STATUS.NOT_FOUND, "User not found"));
    }

    // Extend session cookie on successful authentication check (sliding session)
    // This keeps users logged in as long as they're active
    // Preserve the original "keep me signed in" preference from JWT
    const keepMeSignedIn = req.user?.keepMeSignedIn === true;
    const expiresIn = keepMeSignedIn ? '30d' : '2h';
    const maxAge = keepMeSignedIn ? COOKIE_DURATIONS.LONG_SESSION : COOKIE_DURATIONS.SHORT_SESSION;

    // Create a new token with extended expiration (preserving keepMeSignedIn preference)
    const newToken = sign(
      {
        sub: user.id,
        roles: user.role,
        keepMeSignedIn: keepMeSignedIn, // Preserve the original preference
      },
      config.jwtSecret,
      { expiresIn }
    );

    // Set the new token with extended expiration (respecting original preference)
    const cookieOptions = getAuthCookieOptions(maxAge);
    res.cookie(COOKIE_NAMES.AUTH_TOKEN, newToken, cookieOptions);

    const sellerStatus = pgUsers.computeSellerStatus(user.sellerInfo as Record<string, unknown> | null);

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.role,
      phone: user.phone,
      verified: user.verified,
      avatar: user.avatar,
      sellerStatus,
    };

    return sendSuccess(res, userResponse, 'User data retrieved successfully');
  } catch (error) {
    return next(createHttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Error fetching user data"));
  }
};

// Get all users
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Build query based on filters from middleware (AND logic - all filters must match)
    const query: any = {};
    if (req.filters) {
      if (req.filters.roles) query.roles = req.filters.roles;
      if (req.filters.sellerStatus) {
        // Filter by seller application status
        if (req.filters.sellerStatus === 'pending') {
          query['sellerInfo'] = { $exists: true };
          query['sellerInfo.isApproved'] = false;
          query['sellerInfo.rejectionReason'] = { $exists: false };
        } else if (req.filters.sellerStatus === 'approved') {
          query['sellerInfo.isApproved'] = true;
        } else if (req.filters.sellerStatus === 'rejected') {
          query['sellerInfo.rejectionReason'] = { $exists: true };
        }
      }
    }

    // Build sort object from middleware
    const sort: any = {};
    if (req.sort) {
      sort[req.sort.field] = req.sort.order === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // Default sort by newest first
    }

    console.log("Final query:", JSON.stringify(query, null, 2));
    console.log("Sort:", sort);

    // Use hybrid pagination utility
    // Note: We'll use select in the query builder, but hybridPagination uses lean() which doesn't support select
    // So we'll filter password in the fieldFilter
    return hybridPagination(
      userModel,
      query,
      req,
      res,
      {
        fieldFilter: (user: any) => {
          // Exclude password field
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        },
        sort,
        memoryThreshold: 100,
        message: 'Users retrieved successfully'
      }
    );
  } catch (err) {
    console.error("Error in getAllUsers:", err);
    return next(createHttpError(500, "Error while getting users"));
  }
};


// Get a single user by ID (admin only)
export const getUserById = async (req: Request
  , res: Response, next: NextFunction) => {
  const { userId } = req.params;
  if (!userId) {
    return next(createHttpError(400, "User ID is required"));
  }

  try {
    const user = await userModel.findById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    return sendSuccess(res, user, 'User retrieved successfully');
  } catch (err) {
    return next(createHttpError(500, "Error while getting user"));
  }
};

// Update a user by ID
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
    const user = await userModel.findOne({ _id: userId });

    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    const _req = req;
    // Check if the current user is authorized to update the user
    const isAdmin = _req.user?.roles.includes('admin') || false;
    if (!(userId === _req.user?.id || isAdmin)) {
      return next(createHttpError(403, "You cannot update other users."));
    }

    // Check if this is a seller application
    const isSellerApplication = req.body.companyName && req.body.companyRegistrationNumber && req.body.sellerType;
    console.log('🏢 Is seller application:', isSellerApplication);

    if (isSellerApplication) {
      console.log('🏢 Processing seller application...');

      // Check if user has existing seller info and handle reapplication
      const existingUser = await userModel.findById(userId);
      if (existingUser?.sellerInfo) {
        if (existingUser.sellerInfo.isApproved) {
          return next(createHttpError(400, "You already have an approved seller account."));
        }
        // If rejected or pending, allow reapplication
        console.log('🔄 User reapplying after previous application status:',
          existingUser.sellerInfo.rejectionReason ? 'rejected' : 'pending');
      }

      // Handle file uploads to Cloudinary if files are present
      let uploadedDocuments = {};
      if (req.files && Object.keys(req.files).length > 0) {
        console.log('📁 Files detected, uploading to Cloudinary...');
        try {
          uploadedDocuments = await uploadSellerDocuments(req.files as { [fieldname: string]: Express.Multer.File[] });
          console.log('✅ Documents uploaded successfully:', Object.keys(uploadedDocuments));
        } catch (uploadError) {
          console.error('❌ Failed to upload documents to Cloudinary:', uploadError);
          return next(createHttpError(500, "Failed to upload documents. Please try again."));
        }
      }

      // Construct the seller info object from the request body
      const sellerInfo = {
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
        documents: uploadedDocuments, // Store Cloudinary URLs
        isApproved: false, // Reset to not approved for new/reapplication
        appliedAt: new Date(), // Update application date
        rejectionReason: undefined, // Clear any previous rejection reason
        reapplicationCount: existingUser?.sellerInfo?.reapplicationCount ?
          existingUser.sellerInfo.reapplicationCount + 1 : 1, // Track reapplication attempts
      };

      console.log('💾 Saving seller info to database...');

      // Update user with seller info and keep existing role as 'user' until approved
      const updatedUser = await userModel.findOneAndUpdate(
        { _id: userId },
        {
          sellerInfo: sellerInfo
          // Don't change the role to 'seller' yet - this will happen when admin approves
        },
        { new: true }
      );

      console.log('✅ Seller application saved successfully for user:', userId);

      return sendSuccess(res, {
        user: updatedUser,
        documentsUploaded: Object.keys(uploadedDocuments)
      }, "Seller application submitted successfully. It will be reviewed by our team.");
    } else {
      // Regular user update
      const { name, email, roles, password, phone } = req.body;

      const updateData: any = {
        name: name || user.name,
        email: email || user.email,
        roles: roles || user.roles,
        phone: phone || user.phone
      };

      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }

      const updatedUser = await userModel.findOneAndUpdate(
        { _id: userId },
        updateData,
        { new: true }
      );
      return sendSuccess(res, updatedUser, 'User updated successfully');
    }
  } catch (err) {
    console.error('Error while updating user:', err);
    next(createHttpError(500, "Error while updating user"));
  }
};

// Approve a seller application (admin only)
// Get all seller applications (admin only)
export const getSellerApplications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('🔍 getSellerApplications called');
    const _req = req;
    console.log('👤 User roles:', _req.user?.roles);
    console.log('👤 User ID:', _req.user?.id);

    // Only admin can view seller applications
    const isAdmin = _req.user?.roles.includes('admin') || false;
    if (!isAdmin) {
      console.log('❌ Access denied - user is not admin');
      return next(createHttpError(403, "Only admin can view seller applications"));
    }

    console.log('✅ Admin access confirmed, fetching seller applications...');
    // Find all users who have submitted seller applications
    const users = await userModel.find({
      sellerInfo: { $exists: true }
    }).select('-password').sort({ createdAt: -1 });

    console.log('📊 Found users with seller applications:', users.length);
    console.log('📋 Users with sellerInfo:', users.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      companyName: u.sellerInfo?.companyName,
      sellerType: u.sellerInfo?.sellerType,
      isApproved: u.sellerInfo?.isApproved
    })));

    // Transform the data to match frontend expectations
    const applications = users.map(user => ({
      _id: user._id.toString(), // Convert MongoDB ObjectId to string
      name: user.name,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
      sellerApplicationStatus: user.sellerInfo?.rejectionReason ? 'rejected' : (user.sellerInfo?.isApproved ? 'approved' : 'pending'),
      rejectionReason: user.sellerInfo?.rejectionReason,
      sellerInfo: {
        companyName: user.sellerInfo?.companyName,
        companyRegistrationNumber: user.sellerInfo?.companyRegistrationNumber,
        companyType: user.sellerInfo?.companyType,
        registrationDate: user.sellerInfo?.registrationDate,
        taxId: user.sellerInfo?.taxId,
        website: user.sellerInfo?.website,
        businessAddress: {
          address: user.sellerInfo?.businessAddress?.address,
          city: user.sellerInfo?.businessAddress?.city,
          state: user.sellerInfo?.businessAddress?.state,
          postalCode: user.sellerInfo?.businessAddress?.postalCode,
          country: user.sellerInfo?.businessAddress?.country,
        },
        bankDetails: {
          bankName: user.sellerInfo?.bankDetails?.bankName,
          accountNumber: user.sellerInfo?.bankDetails?.accountNumber,
          accountHolderName: user.sellerInfo?.bankDetails?.accountHolderName,
          branchCode: user.sellerInfo?.bankDetails?.branchCode,
        },
        businessDescription: user.sellerInfo?.businessDescription,
        sellerType: user.sellerInfo?.sellerType,
        isApproved: user.sellerInfo?.isApproved || false,
        appliedAt: user.sellerInfo?.appliedAt || user.createdAt,
        approvedAt: user.sellerInfo?.approvedAt,
        documents: user.sellerInfo?.documents,
        contactPerson: user.sellerInfo?.contactPerson,
        phone: user.sellerInfo?.phone,
        alternatePhone: user.sellerInfo?.alternatePhone,
        reapplicationCount: user.sellerInfo?.reapplicationCount,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    res.json({
      success: true,
      data: applications
    });
  } catch (err) {
    console.error('Error while fetching seller applications:', err);
    next(createHttpError(500, "Error while fetching seller applications"));
  }
};

export const approveSellerApplication = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) {
    return next(createHttpError(401, 'Not authenticated'));
  }

  try {
    const user = await userModel.findOne({ _id: userId });

    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    const _req = req;
    // Only admin can approve seller applications
    const isAdmin = _req.user?.roles.includes('admin') || false;
    if (!isAdmin) {
      return next(createHttpError(403, "Only admin can approve seller applications"));
    }

    // Check if user has a seller application
    if (!user.sellerInfo) {
      return next(createHttpError(400, "User has not submitted a seller application"));
    }

    // Check if already approved
    if (user.sellerInfo.isApproved) {
      return next(createHttpError(400, "Seller application already approved"));
    }

    // Update the user to be a seller and mark application as approved
    const updatedUser = await userModel.findOneAndUpdate(
      { _id: userId },
      {
        roles: 'seller',
        'sellerInfo.isApproved': true,
        'sellerInfo.approvedAt': new Date()
      },
      { new: true }
    );

    res.json({
      user: updatedUser,
      message: "Seller application approved successfully"
    });
  } catch (err) {
    console.error('Error while approving seller application:', err);
    next(createHttpError(500, "Error while approving seller application"));
  }
};

// Reject seller application (admin only)
export const rejectSellerApplication = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) {
    return next(createHttpError(401, 'Not authenticated'));
  }
  const { reason } = req.body;

  try {
    const user = await userModel.findOne({ _id: userId });

    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    const _req = req;
    // Only admin can reject seller applications
    const isAdmin = _req.user?.roles.includes('admin') || false;
    if (!isAdmin) {
      return next(createHttpError(403, "Only admin can reject seller applications"));
    }

    // Check if user has a seller application
    if (!user.sellerInfo) {
      return next(createHttpError(400, "User has not submitted a seller application"));
    }

    // Update the seller application with rejection
    const updatedUser = await userModel.findOneAndUpdate(
      { _id: userId },
      {
        'sellerInfo.isApproved': false,
        'sellerInfo.rejectionReason': reason,
        'sellerInfo.rejectedAt': new Date()
      },
      { new: true }
    );

    res.json({
      user: updatedUser,
      message: "Seller application rejected"
    });
  } catch (err) {
    console.error('Error while rejecting seller application:', err);
    next(createHttpError(500, "Error while rejecting seller application"));
  }
};

// Delete a user by ID
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(createHttpError(401, 'Not authenticated'));
    }
    const user = await userModel.findById(userId);
    if (user) {
      await user.deleteOne();
      // Return 204 No Content for successful deletion
      res.status(HTTP_STATUS.NO_CONTENT).send();
    } else {
      return next(createHttpError(404, 'User not found'));
    }
  } catch (err) {
    return next(createHttpError(500, "Error while deleting user"));
  }
};

// Change user roles (only admin can change roles)
export const changeUserRole = async (req: Request, res: Response, next: NextFunction) => {
  const { adminUserId, targetUserId, newRoles } = req.body;

  try {
    const adminUser = await userModel.findById(adminUserId);

    if (!adminUser || !adminUser.roles.includes('admin')) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'Only an admin can change user roles' });
    }

    const targetUser = await userModel.findById(targetUserId);

    if (!targetUser) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Target user not found' });
    }

    targetUser.roles = newRoles;
    const updatedUser = await targetUser.save();
    res.json(updatedUser);
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
    const user = await userModel.findById(decoded.sub);

    if (!user) {
      return next(createHttpError(400, "Invalid token"));
    }

    user.verified = true;
    await user.save();

    res.status(HTTP_STATUS.OK).json({ message: 'Email verified successfully' });
  } catch (err) {
    return next(createHttpError(400, "Invalid or expired token"));
  }
};


export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  if (!email) {
    const error = createHttpError(400, 'Email is required');
    return next(error);
  }

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      const error = createHttpError(404, 'User not found');
      return next(error);
    }

    console.log('User found for password reset:', user.email);

    if (!config.jwtSecret) {
      throw new Error('JWT Secret is not defined');
    }

    const resetToken = jwt.sign({ sub: user._id }, config.jwtSecret, {
      expiresIn: '1h', // Reset token expires in 1 hour
      algorithm: 'HS256',
    });

    // Skip email sending in development mode
    const isDevMode = config.env === 'development';

    if (isDevMode) {
      // In development, return the reset token directly for testing
      console.log('🔧 Development mode: Reset token:', resetToken);
      console.log('🔧 Reset URL:', `${config.frontendDomain}/auth/login?forgottoken=${resetToken}`);

      return res.status(HTTP_STATUS.OK).json({
        message: 'Development mode: Password reset token generated (check server logs)',
        resetToken, // Only in development!
        resetUrl: `${config.frontendDomain}/auth/login?forgottoken=${resetToken}`
      });
    }

    // Send email in production
    try {
      await sendResetPasswordEmailMaileroo(email, user.name, resetToken);
      res.status(HTTP_STATUS.OK).json({ message: 'Password reset email sent. Please check your inbox.' });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Still allow password reset but notify about email failure
      res.status(HTTP_STATUS.OK).json({
        message: 'Password reset initiated but email could not be sent. Please contact support.',
        resetToken: isDevMode ? resetToken : undefined // Only expose in dev
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
    const user = await userModel.findById(decoded.sub);

    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword; // Assuming you are hashing passwords before saving
    await user.save();

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

    const _req = req;
    // Only admin can delete seller applications
    const isAdmin = _req.user?.roles.includes('admin') || false;
    if (!isAdmin) {
      return next(createHttpError(403, "Only admin can delete seller applications"));
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    if (!user.sellerInfo) {
      return next(createHttpError(400, "User is not a seller applicant"));
    }

    // Remove seller info and reset role to 'user'
    await userModel.findByIdAndUpdate(userId, {
      $unset: { sellerInfo: 1 },
      $set: { roles: 'user' }
    });

    res.status(HTTP_STATUS.OK).json({
      message: "Seller application deleted successfully. User converted to normal user."
    });
  } catch (error) {
    return next(createHttpError(500, "Error deleting seller application"));
  }
};
// Add these new controller functions for /me routes

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
    const user = await userModel.findOne({ _id: userId });
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    // Check if this is a seller application
    const isSellerApplication = req.body.companyName && req.body.companyRegistrationNumber && req.body.sellerType;

    if (isSellerApplication) {
      // ... existing seller application logic ...
    } else {
      // Regular profile update
      const { name, email, phone, bankName, accountNumber, accountHolderName, branchCode } = req.body;

      const updateData: any = {
        name: name || user.name,
        email: email || user.email,
        phone: phone || user.phone
      };

      // Handle banking details if provided
      if (bankName || accountNumber || accountHolderName || branchCode) {
        // Use MongoDB dot notation to update nested fields directly
        // This avoids TypeScript issues and is more efficient
        if (bankName !== undefined) {
          updateData['sellerInfo.bankDetails.bankName'] = bankName;
        }
        if (accountNumber !== undefined) {
          updateData['sellerInfo.bankDetails.accountNumber'] = accountNumber;
        }
        if (accountHolderName !== undefined) {
          updateData['sellerInfo.bankDetails.accountHolderName'] = accountHolderName;
        }
        if (branchCode !== undefined) {
          updateData['sellerInfo.bankDetails.branchCode'] = branchCode;
        }
      }

      const updatedUser = await userModel.findOneAndUpdate(
        { _id: userId },
        { $set: updateData },
        { new: true }
      );
      res.json(updatedUser);
    }
  } catch (err) {
    console.error('Error while updating profile:', err);
    next(createHttpError(500, "Error while updating profile"));
  }
};

// Change current user's password
export const changeMyPassword = async (req: Request
  , res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(createHttpError(400, "Current password and new password are required"));
  }

  const userId = req.user?.id;
  if (!userId) {
    return next(createHttpError(401, 'Not authenticated'));
  }

  try {
    const user = await userModel.findById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return next(createHttpError(400, "Current password is incorrect"));
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await userModel.findByIdAndUpdate(userId, { password: hashedPassword });

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error('Error while changing password:', err);
    next(createHttpError(500, "Error while changing password"));
  }
};

// Update user by ID (admin only)
export const updateUserById = async (req: Request
  , res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ errors: errors.array() });
  }

  const { userId } = req.params;
  if (!userId) {
    return next(createHttpError(400, "User ID is required"));
  }

  try {
    const user = await userModel.findById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    // Regular user update (admin can update name, email, phone, roles, password)
    const { name, email, roles, password, phone } = req.body;

    const updateData: any = {
      name: name || user.name,
      email: email || user.email,
      roles: roles || user.roles,
      phone: phone || user.phone
    };

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await userModel.findOneAndUpdate(
      { _id: userId },
      updateData,
      { new: true }
    );
    res.json(updatedUser);
  } catch (err) {
    console.error('Error while updating user:', err);
    next(createHttpError(500, "Error while updating user"));
  }
};
