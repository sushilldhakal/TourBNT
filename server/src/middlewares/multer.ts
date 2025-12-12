import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Utility function to sanitize filename and prevent path traversal
const sanitizeFilename = (filename: string): string => {
  // Remove any path components
  const basename = path.basename(filename);
  // Remove any non-alphanumeric characters except dots, dashes, and underscores
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
};

// Utility function to generate secure random filename
const generateSecureFilename = (originalname: string): string => {
  const sanitized = sanitizeFilename(originalname);
  const ext = path.extname(sanitized);
  const randomString = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}_${randomString}${ext}`;
};

// Utility function to validate file extension matches MIME type
const validateFileType = (mimetype: string, filename: string): boolean => {
  const ext = path.extname(filename).toLowerCase();
  const mimeToExt: { [key: string]: string[] } = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'application/pdf': ['.pdf'],
    'video/mp4': ['.mp4']
  };

  const allowedExts = mimeToExt[mimetype];
  return allowedExts ? allowedExts.includes(ext) : false;
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/data/uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, generateSecureFilename(file.originalname));
  },
});

export const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype) && validateFileType(file.mimetype, file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type or file extension does not match MIME type'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 2
  }
}).fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]);

export const uploadNone = multer().none();

// Avatar upload storage
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/data/uploads/avatars'));
  },
  filename: function (req, file, cb) {
    cb(null, `avatar_${generateSecureFilename(file.originalname)}`);
  },
});

// Avatar upload middleware
export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype) && validateFileType(file.mimetype, file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and GIF images are allowed or file extension does not match'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
}).single('avatar');

const multipleStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../public/data/uploads/multi');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, generateSecureFilename(file.originalname));
  },
});

export const uploadMultiple = multer({
  storage: multipleStorage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype) && validateFileType(file.mimetype, file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type or file extension does not match MIME type'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB (for videos)
    files: 30 // Total files across all fields
  }
}).fields([
  { name: 'pdf', maxCount: 10 },
  { name: 'imageList', maxCount: 10 },
  { name: 'video', maxCount: 10 },
]);

// Seller documents upload storage
const sellerDocsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../public/data/uploads/seller-docs');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, generateSecureFilename(file.originalname));
  },
});

// Seller documents upload middleware
export const uploadSellerDocs = multer({
  storage: sellerDocsStorage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype) && validateFileType(file.mimetype, file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed or file extension does not match'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 30 // Total files across all fields
  }
}).fields([
  { name: 'businessRegistration', maxCount: 5 },
  { name: 'taxRegistration', maxCount: 5 },
  { name: 'idVerification', maxCount: 5 },
  { name: 'bankStatement', maxCount: 5 },
  { name: 'businessInsurance', maxCount: 5 },
  { name: 'businessLicense', maxCount: 5 }
]);
