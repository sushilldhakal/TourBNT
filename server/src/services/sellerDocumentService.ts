import fs from 'fs';
import { uploadFileToR2, deleteFromR2 } from '../config/r2Config';

export interface UploadedDocument {
  public_id: string;
  secure_url: string;
  original_filename: string;
  bytes: number;
  format: string;
  resource_type: string;
}

export interface DocumentUploadResult {
  [key: string]: UploadedDocument[];
}

// Uploads seller onboarding documents to R2 under an admin-only folder.
export const uploadSellerDocuments = async (files: { [fieldname: string]: Express.Multer.File[] }): Promise<DocumentUploadResult> => {
  const uploadResults: DocumentUploadResult = {};
  const filesToCleanup: string[] = [];

  try {
    for (const [fieldName, fileArray] of Object.entries(files)) {
      uploadResults[fieldName] = [];

      for (const file of fileArray) {
        if (!fs.existsSync(file.path)) {
          throw new Error(`File not found: ${file.path}`);
        }

        const result = await uploadFileToR2(file.path, 'admin/seller-documents', file.originalname, file.mimetype);

        uploadResults[fieldName].push({
          public_id: result.key,
          secure_url: result.url,
          original_filename: file.originalname,
          bytes: result.bytes,
          format: file.originalname.split('.').pop() || '',
          resource_type: file.mimetype,
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

    return uploadResults;
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

export const deleteSellerDocuments = async (publicIds: string[]): Promise<void> => {
  await deleteFromR2(publicIds);
};
