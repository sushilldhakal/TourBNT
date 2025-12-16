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
import { HTTP_STATUS } from "../../utils/httpStatusCodes";
import { AuthRequest } from "../../middlewares/authenticate";
import { getAuthCookieOptions, getClearCookieOptions, COOKIE_NAMES, COOKIE_DURATIONS } from "../../utils/cookieUtils";

// create user
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, phone } = req.body;
  console.log(req.body)
  if (!name || !email || !password) {
    const error = createHttpError(400, "All fields are required");
    return next(error);
  }
  // Database call.
  try {

    const user = await userModel.findOne({ email });
    if (user) {
      const error = createHttpError(
        400,
        "User already exists with this email."
      );
      return next(error);
    }
  } catch (err) {
    return next(createHttpError(500, "Error while getting user"));
  }

  // Hash password.
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    // Auto-verify users in development mode
    const isDevMode = config.env === 'development';

    const newUser = await userModel.create({
      name,
      email,
      phone,
      password: hashedPassword,
      verified: isDevMode, // Auto-verify in development
    });

    // Skip email sending in development mode
    if (isDevMode) {
      res.status(HTTP_STATUS.CREATED).json({
        message: 'User created successfully (auto-verified in development mode)',
        user: { id: newUser._id, name: newUser.name, email: newUser.email }
      });
      return;
    }

    // Send verification email in production
    try {
      const verificationToken = jwt.sign({ sub: newUser._id }, config.jwtSecret, {
        expiresIn: '1h', // 1 hour
        algorithm: 'HS256',
      });
      await sendVerificationEmailMaileroo(email, name, verificationToken);
      res.status(HTTP_STATUS.CREATED).json({ message: 'Verification email sent. Please check your inbox.' });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Still create the user but notify about email failure
      res.status(HTTP_STATUS.CREATED).json({
        message: 'User created successfully but verification email could not be sent. Please contact support.',
        user: { id: newUser._id, name: newUser.name, email: newUser.email }
      });
    }

  } catch (err) {
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
    const user = await userModel.findOne({ email });
    if (!user) {
      return next(createHttpError(404, "User not found."));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(createHttpError(400, "Username or password incorrect!"));
    }

    // Token generation
    const expiresIn = keepMeSignedIn ? '30d' : '2h';
    const token = sign(
      { sub: user._id, roles: user.roles },
      config.jwtSecret as string,
      { expiresIn, algorithm: "HS256" }
    );

    // Set token as HTTP-only cookie with proper configuration for dev/prod
    const maxAge = keepMeSignedIn ? COOKIE_DURATIONS.LONG_SESSION : COOKIE_DURATIONS.SHORT_SESSION;
    const cookieOptions = getAuthCookieOptions(maxAge);

    res.cookie(COOKIE_NAMES.AUTH_TOKEN, token, cookieOptions);

    // Return only user info, not token
    res.json({
      user: {
        id: user._id,
        roles: user.roles,
        email: user.email
      }
    });

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

// Get current authenticated user
export const getCurrentUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(createHttpError(HTTP_STATUS.UNAUTHORIZED, "Not authenticated"));
    }

    const user = await userModel.findById(req.user.id).select('-password');

    if (!user) {
      return next(createHttpError(HTTP_STATUS.NOT_FOUND, "User not found"));
    }

    // Compute seller status from sellerInfo
    let sellerStatus = 'none';
    if (user.sellerInfo) {
      if (user.sellerInfo.isApproved) {
        sellerStatus = 'approved';
      } else if (user.sellerInfo.rejectionReason) {
        sellerStatus = 'rejected';
      } else {
        sellerStatus = 'pending';
      }
    }

    res.status(HTTP_STATUS.OK).json({
      id: user._id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      phone: user.phone,
      verified: user.verified,
      avatar: user.avatar,
      sellerStatus,
    });
  } catch (error) {
    return next(createHttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Error fetching user data"));
  }
};

// Get all users
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use pagination params from middleware
    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };

    // Build query based on filters from middleware (AND logic - all filters must match)
    const query: any = {};
    if (req.filters) {
      if (req.filters.roles) query.roles = req.filters.roles;
      if (req.filters.verified !== undefined) query.verified = req.filters.verified === 'true';
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

    // Get total count for pagination metadata
    const total = await userModel.countDocuments(query);

    // Get paginated users with filters and sorting
    const users = await userModel.find(query)
      .select('-password') // Exclude password field
      .skip(skip)
      .limit(limit)
      .sort(sort);

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    res.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (err) {
    return next(createHttpError(500, "Error while getting users"));
  }
};


// Get a single user by ID
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params;
  try {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
      // return next(createHttpError(404, 'User not found'));
    }
    const breadcrumbs = [
      {
        label: user.name,
        url: `/api/users/${userId}`,
      }
    ];
    res.json({ user, breadcrumbs });
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

  const userId = req.params.userId;
  console.log('🔍 updateUser called for userId:', userId);
  console.log('📋 Request body keys:', Object.keys(req.body));
  console.log('📁 Request files:', req.files ? Object.keys(req.files) : 'No files');
  console.log('📄 Full request body:', req.body);

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

      return res.json({
        user: updatedUser,
        message: "Seller application submitted successfully. It will be reviewed by our team.",
        documentsUploaded: Object.keys(uploadedDocuments)
      });
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
      res.json(updatedUser);
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
      _id: user._id,
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
  const userId = req.params.userId;

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
  const userId = req.params.userId;
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
    const user = await userModel.findById(req.params.id);
    if (user) {
      await user.deleteOne();
      // Return 204 No Content for successful deletion
      res.status(HTTP_STATUS.NO_CONTENT).send();
    } else {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'User not found' });
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