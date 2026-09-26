import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/config';
import fs from 'fs';

cloudinary.config({
  cloud_name: config.cloudinary.cloud,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.secret,
  secure: true,
});

/** Uploads an ad creative image to Cloudinary and returns its secure URL. */
export const uploadAdImage = async (file: Express.Multer.File): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'ads',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      resource_type: 'image',
    });
    return result.secure_url;
  } finally {
    try {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch {
      // Ignore cleanup errors — the upload result is what matters.
    }
  }
};
