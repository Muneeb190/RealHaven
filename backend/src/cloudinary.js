import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 6 },
});

export function uploadBuffer(buffer, folder = "RealHaven") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}
// Trigger watch reload
