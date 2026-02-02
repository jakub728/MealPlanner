import 'dotenv/config'
import { type Request } from "express";
import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";


const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error("DEBUG AWS:", { 
    region: !!region, 
    key: !!accessKeyId, 
    secret: !!secretAccessKey, 
    bucket: !!bucketName 
  });
  throw new Error("Missing AWS Configuration. Check Railway Variables.");
}

const s3 = new S3Client({
  region: process.env.AWS_REGION || "eu-central-1", 
});

const createMulterUpload = (folder: "recipes" | "users") => {
  return multer({
    storage: multerS3({
      s3: s3,
      bucket: process.env.AWS_BUCKET_NAME || "", 
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
