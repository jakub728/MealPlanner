import "dotenv/config";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";

const s3Config: any = {
  region: process.env.AWS_REGION || "eu-central-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

const s3 = new S3Client(s3Config);

const createMulterUpload = (folder: string) => {
  return multer({
    storage: multerS3({
      s3: s3 as any,
      bucket: process.env.AWS_BUCKET_NAME as string,
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

export const deleteFileFromS3 = async (key: string) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });
  return await s3.send(command);
};

export const uploadRecipe = createMulterUpload("recipes");
export const uploadUserAvatar = createMulterUpload("users");

