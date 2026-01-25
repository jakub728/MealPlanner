import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    if (!process.env.DB_URI) {
      throw new Error("Missing DB_URI in environment variables");
    }

    await mongoose.connect(process.env.DB_URI);
    console.log("Database connected");
  } catch (error:any) {
    console.error(error.message);
  }
};
