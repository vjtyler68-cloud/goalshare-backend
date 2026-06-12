"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToDigitalOcean = void 0;

// DigitalOcean Spaces upload — uses dynamic import to handle ESM-only AWS SDK
const uploadToDigitalOcean = async (file) => {
    if (!file) throw new Error('File is required for uploading.');
    try {
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
        const { v4 } = await import('uuid');
        const s3Client = new S3Client({
            region: 'nyc3',
            endpoint: process.env.DO_SPACE_ENDPOINT,
            credentials: {
                accessKeyId: process.env.DO_SPACE_ACCESS_KEY || '',
                secretAccessKey: process.env.DO_SPACE_SECRET_KEY || '',
            },
        });
        const Key = `nathancloud/${Date.now()}_${v4()}_${file.originalname}`;
        const uploadParams = {
            Bucket: process.env.DO_SPACE_BUCKET || '',
            Key,
            Body: file.buffer,
            ACL: 'public-read',
            ContentType: file.mimetype,
        };
        await s3Client.send(new PutObjectCommand(uploadParams));
        const fileURL = `${process.env.DO_SPACE_ENDPOINT}/${process.env.DO_SPACE_BUCKET}/${Key}`;
        return { Location: fileURL, Bucket: process.env.DO_SPACE_BUCKET || '', Key };
    } catch (error) {
        console.error('Error uploading file to DigitalOcean:', error);
        throw error;
    }
};
exports.uploadToDigitalOcean = uploadToDigitalOcean;
