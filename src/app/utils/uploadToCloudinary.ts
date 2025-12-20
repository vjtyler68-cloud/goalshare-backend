import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import {
  S3Client,
  PutObjectCommand,
  ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import streamifier from 'streamifier';
import dotenv from 'dotenv';


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


// ✅ Fixed Cloudinary Upload (Now supports buffer)
export const uploadToCloudinary = async (
  file: Express.Multer.File,
): Promise<{ Location: string; public_id: string }> => {
  if (!file) {
    throw new Error('File is required for uploading.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'uploads',
        resource_type: 'auto', // Supports images, videos, etc.
        use_filename: true,
        unique_filename: false,
      },
      (error, result) => {
        if (error) {
          console.error('Error uploading file to Cloudinary:', error);
          return reject(error);
        }

        // ✅ Explicitly return `Location` and `public_id`
        resolve({
          Location: result?.secure_url || '', // Cloudinary URL
          public_id: result?.public_id || '',
        });
      },
    );

    // Convert buffer to stream and upload
    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};
