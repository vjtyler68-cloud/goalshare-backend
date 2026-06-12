"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToDigitalOcean = void 0;
/* eslint-disable no-console */
const uuid_1 = require("uuid");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3Client = new client_s3_1.S3Client({
    region: 'nyc3',
    endpoint: process.env.DO_SPACE_ENDPOINT,
    credentials: {
        accessKeyId: process.env.DO_SPACE_ACCESS_KEY || '',
        secretAccessKey: process.env.DO_SPACE_SECRET_KEY || '',
    },
});
const uploadToDigitalOcean = (file) => __awaiter(void 0, void 0, void 0, function* () {
    if (!file) {
        throw new Error('File is required for uploading.');
    }
    try {
        const Key = `nathancloud/${Date.now()}_${(0, uuid_1.v4)()}_${file.originalname}`;
        const uploadParams = {
            Bucket: process.env.DO_SPACE_BUCKET || '',
            Key,
            Body: file.buffer,
            ACL: 'public-read',
            ContentType: file.mimetype,
        };
        // Upload file to DigitalOcean Spaces
        yield s3Client.send(new client_s3_1.PutObjectCommand(uploadParams));
        // Format the URL
        const fileURL = `${process.env.DO_SPACE_ENDPOINT}/${process.env.DO_SPACE_BUCKET}/${Key}`;
        return {
            Location: fileURL,
            Bucket: process.env.DO_SPACE_BUCKET || '',
            Key,
        };
    }
    catch (error) {
        console.error('Error uploading file to DigitalOcean:', error);
        throw error;
    }
});
exports.uploadToDigitalOcean = uploadToDigitalOcean;
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
