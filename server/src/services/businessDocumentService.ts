import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/config';
import fs from 'fs';

cloudinary.config({
  cloud_name: config.cloudinary.cloud,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.secret,
  secure: true
});

export interface UploadedBusinessDocument {
  docType: string;
  publicId: string;
  url: string;
  originalFilename: string;
}

/**
 * Uploads business-partner onboarding documents (registration, tax, ID,
 * license, etc.) to Cloudinary, returning a flat list ready to insert as
 * `businessDocuments` rows — mirrors `sellerDocumentService.uploadSellerDocuments`
 * but returns a normalized array instead of a JSONB-shaped map.
 */
export const uploadBusinessDocuments = async (
  files: { [fieldname: string]: Express.Multer.File[] }
): Promise<UploadedBusinessDocument[]> => {
  const uploaded: UploadedBusinessDocument[] = [];
  const filesToCleanup: string[] = [];

  try {
    for (const [fieldName, fileArray] of Object.entries(files)) {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];

        if (!fs.existsSync(file.path)) {
          throw new Error(`File not found: ${file.path}`);
        }

        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'admin/business-documents',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          resource_type: 'auto',
          public_id: `${fieldName}_${Date.now()}_${i}_${file.originalname.split('.')[0]}`,
          tags: ['business-document', fieldName, 'admin-only'],
        });

        uploaded.push({
          docType: fieldName,
          publicId: result.public_id,
          url: result.secure_url,
          originalFilename: file.originalname,
        });

        filesToCleanup.push(file.path);
      }
    }

    for (const filePath of filesToCleanup) {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {
        // Ignore cleanup errors — the upload itself already succeeded.
      }
    }

    return uploaded;
  } catch (error) {
    for (const filePath of filesToCleanup) {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {
        // Ignore cleanup errors on the main error path.
      }
    }
    throw error;
  }
};

export const deleteBusinessDocuments = async (publicIds: string[]): Promise<void> => {
  for (const publicId of publicIds) {
    await cloudinary.uploader.destroy(publicId);
  }
};
