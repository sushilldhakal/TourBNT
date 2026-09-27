import fs from 'fs';
import { uploadFileToR2, deleteFromR2 } from '../config/r2Config';

export interface UploadedBusinessDocument {
  docType: string;
  publicId: string;
  url: string;
  originalFilename: string;
}

/**
 * Uploads business-partner onboarding documents (registration, tax, ID,
 * license, etc.) to R2, returning a flat list ready to insert as
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
      for (const file of fileArray) {
        if (!fs.existsSync(file.path)) {
          throw new Error(`File not found: ${file.path}`);
        }

        const result = await uploadFileToR2(file.path, 'admin/business-documents', file.originalname, file.mimetype);

        uploaded.push({
          docType: fieldName,
          publicId: result.key,
          url: result.url,
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
  await deleteFromR2(publicIds);
};
