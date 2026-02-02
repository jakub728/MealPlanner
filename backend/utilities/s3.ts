import "dotenv/config";
import { type Request } from "express";
import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error("❌ BŁĄD KONFIGURACJI: Brak kluczy AWS w pliku .env!");
  console.log("Wykryte wartości:");
  console.log("ID:", process.env.AWS_ACCESS_KEY_ID ? "✅ Jest" : "❌ BRAK");
  console.log(
    "SECRET:",
    process.env.AWS_SECRET_ACCESS_KEY ? "✅ Jest" : "❌ BRAK",
  );
  console.log("REGION:", process.env.AWS_REGION ? "✅ Jest" : "❌ BRAK");
}

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const createMulterUpload = (folder: "recipes" | "users") => {
  return multer({
    storage: multerS3({
      s3: s3,
      bucket: process.env.AWS_BUCKET_NAME!,
      acl: "public-read",
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
        cb(null, `${folder}/${fileName}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
  });
};

export const uploadRecipe = createMulterUpload("recipes");
export const uploadUserAvatar = createMulterUpload("users");
