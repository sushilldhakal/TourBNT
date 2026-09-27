import fs from 'fs';
import { uploadFileToR2 } from '../config/r2Config';

/** Uploads an ad creative image to R2 and returns its public URL. */
export const uploadAdImage = async (file: Express.Multer.File): Promise<string> => {
  try {
    const result = await uploadFileToR2(file.path, 'ads', file.originalname, file.mimetype);
    return result.url;
  } finally {
    try {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch {
      // Ignore cleanup errors — the upload result is what matters.
    }
  }
};
