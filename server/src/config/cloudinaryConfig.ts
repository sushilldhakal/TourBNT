import { v2 as cloudinary } from 'cloudinary';
import { config } from './config';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloud,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.secret,
  secure: true
});

// Function to upload file to Cloudinary
export const uploadToCloudinary = async (filePath: string) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'travel-app-avatars',
      use_filename: true,
      unique_filename: true,
      overwrite: true,
      resource_type: 'auto'
    });
    return result;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

export default cloudinary;
