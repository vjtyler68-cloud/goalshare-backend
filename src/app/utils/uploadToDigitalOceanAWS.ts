/* eslint-disable no-console */
import { v4 as uuidv4 } from 'uuid';
import {
  S3Client,
  PutObjectCommand,
  ObjectCannedACL,
} from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'nyc3',
  endpoint: process.env.DO_SPACE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.DO_SPACE_ACCESS_KEY || '',
    secretAccessKey: process.env.DO_SPACE_SECRET_KEY || '',
  },
});

export const uploadToDigitalOcean = async (file: Express.Multer.File) => {
  if (!file) {
    throw new Error('File is required for uploading.');
  }

  try {
    const Key = `nathancloud/${Date.now()}_${uuidv4()}_${file.originalname}`;
    const uploadParams = {
      Bucket: process.env.DO_SPACE_BUCKET || '',
      Key,
      Body: file.buffer,
      ACL: 'public-read' as ObjectCannedACL,
      ContentType: file.mimetype,
    };

    // Upload file to DigitalOcean Spaces
    await s3Client.send(new PutObjectCommand(uploadParams));

    // Format the URL
    const fileURL = `${process.env.DO_SPACE_ENDPOINT}/${process.env.DO_SPACE_BUCKET}/${Key}`;
    return {
      Location: fileURL,
      Bucket: process.env.DO_SPACE_BUCKET || '',
      Key,
    };
  } catch (error) {
    console.error('Error uploading file to DigitalOcean:', error);
    throw error;
  }
};

// export const deleteFromDigitalOceanAWS = async (
//   fileUrl: string,
// ): Promise<void> => {
//   try {
//     // Extract the file key from the URL
//     const key = fileUrl.replace(
//       `${process.env.DO_SPACE_ENDPOINT}/${bucket}/`,
//       '',
//     );

//     // Prepare the delete command
//     const command = new DeleteObjectCommand({
//       Bucket: `${bucket}`,
//       Key: key,
//     });

//     // Execute the delete command
//     await s3Client.send(command);

//     console.log(`Successfully deleted file: ${fileUrl}`);
//   } catch (error: any) {
//     console.error(`Error deleting file: ${fileUrl}`, error);
//     throw new Error(`Failed to delete file: ${error?.message}`);
//   }
// };

// export const uploadMultipleToDigitalOceanAWS = async (
//   files: Express.Multer.File[],
// ): Promise<{ name: string; url: string }[]> => {
//   const uploaded = await Promise.all(
//     files.map(async file => {
//       const { Location } = await uploadToDigitalOceanAWS(file);
//       return { name: file.originalname, url: Location };
//     }),
//   );
//   return uploaded;
// };

// export const deleteMultipleFromDigitalOceanAWS = async (
//   urls: string[],
// ): Promise<void> => {
//   await Promise.all(urls.map(url => deleteFromDigitalOceanAWS(url)));
// };
