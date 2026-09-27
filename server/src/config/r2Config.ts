import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from './config';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: config.r2.endpoint,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
});

export interface R2UploadResult {
  key: string;
  url: string;
  bytes: number;
  contentType: string;
}

/** Builds a collision-resistant object key under `folder`, keeping the original extension. */
export const buildR2Key = (folder: string, originalFilename: string): string => {
  const ext = path.extname(originalFilename).toLowerCase();
  const unique = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  return `${cleanFolder}/${unique}${ext}`;
};

export const r2PublicUrl = (key: string): string => `${config.r2.publicUrl}/${key}`;

export const uploadBufferToR2 = async (
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<R2UploadResult> => {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: config.r2.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return {
    key,
    url: r2PublicUrl(key),
    bytes: buffer.length,
    contentType,
  };
};

/** Uploads a file already on local disk (e.g. from multer's disk storage) to R2. */
export const uploadFileToR2 = async (
  filePath: string,
  folder: string,
  originalFilename: string,
  contentType: string
): Promise<R2UploadResult> => {
  const buffer = await fs.promises.readFile(filePath);
  const key = buildR2Key(folder, originalFilename);
  return uploadBufferToR2(buffer, key, contentType);
};

export const deleteFromR2 = async (keys: string[]): Promise<void> => {
  for (const key of keys) {
    await r2Client.send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: key }));
  }
};
