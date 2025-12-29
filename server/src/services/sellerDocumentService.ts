import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/config';
import fs from 'fs';

// Configure Cloudinary for admin access (seller documents)
cloudinary.config({
  cloud_name: config.cloudinary.cloud,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.secret,
  secure: true
});


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

// Function to upload seller documents to Cloudinary under admin folder
export const uploadSellerDocuments = async (files: { [fieldname: string]: Express.Multer.File[] }): Promise<DocumentUploadResult> => {
  const uploadResults: DocumentUploadResult = {};
  const filesToCleanup: string[] = [];

  try {
    console.log('📁 Starting Cloudinary upload for seller documents...');
    
    for (const [fieldName, fileArray] of Object.entries(files)) {
      console.log(`🔄 Processing ${fieldName}: ${fileArray.length} files`);
      uploadResults[fieldName] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        try {
          console.log(`📤 Uploading ${file.originalname} to Cloudinary...`);
          
          // Check if file exists before uploading
          if (!fs.existsSync(file.path)) {
            console.error(`❌ File not found: ${file.path}`);
            throw new Error(`File not found: ${file.path}`);
          }
          
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'admin/seller-documents', // Admin-only folder
            use_filename: true,
            unique_filename: true,
            overwrite: false,
            resource_type: 'auto',
            public_id: `${fieldName}_${Date.now()}_${i}_${file.originalname.split('.')[0]}`,
            tags: ['seller-document', fieldName, 'admin-only']
          });

          uploadResults[fieldName].push({
            public_id: result.public_id,
            secure_url: result.secure_url,
            original_filename: file.originalname,
            bytes: result.bytes,
            format: result.format,
            resource_type: result.resource_type
          });

          console.log(`✅ Successfully uploaded ${file.originalname} to Cloudinary`);

          // Add to cleanup list instead of immediate cleanup
          filesToCleanup.push(file.path);

        } catch (uploadError) {
          console.error(`❌ Failed to upload ${file.originalname}:`, uploadError);
          const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
          throw new Error(`Failed to upload ${file.originalname}: ${errorMessage}`);
        }
      }
    }

    // Clean up all local files after all uploads are successful
    console.log('🗑️ Cleaning up local files...');
    for (const filePath of filesToCleanup) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Cleaned up local file: ${filePath}`);
        }
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup local file: ${filePath}`, cleanupError);
      }
    }

    console.log('✅ All seller documents uploaded successfully to Cloudinary');
    return uploadResults;

  } catch (error) {
    console.error('❌ Error uploading seller documents to Cloudinary:', error);
    
    // Clean up any remaining files on error
    for (const filePath of filesToCleanup) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors on main error
      }
    }
    
    throw error;
  }
};

// Function to delete seller documents from Cloudinary (admin only)
export const deleteSellerDocuments = async (publicIds: string[]): Promise<void> => {
  try {
    console.log('🗑️ Deleting seller documents from Cloudinary:', publicIds);
    
    for (const publicId of publicIds) {
      await cloudinary.uploader.destroy(publicId);
      console.log(`✅ Deleted document: ${publicId}`);
    }

  } catch (error) {
    console.error('❌ Error deleting seller documents from Cloudinary:', error);
    throw error;
  }
};
