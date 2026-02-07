import { Schema, model, Document, Types } from "mongoose";
import { z } from "zod";

export const UserRegistrationSchema = z.object({
  name: z
    .string()
    .min(2, "Imię jest za krótkie")
    .max(20, "Imię jest za długie")
    .trim(),
  email: z.string().email("Nieprawidłowy format").lowercase().trim(),
  password: z
    .string()
    .min(8, "Hasło musi mieć min. 8 znaków")
    .regex(/[a-z]/, "Hasło musi zawierać jedną małą literę")
    .regex(/[A-Z]/, "Hasło musi zawierać jedną dużą literę")
    .regex(/[0-9]/, "Hasło musi zawierać jednen numer")
    .regex(/[^a-zA-Z0-9]/, "Hasło musi zawierać jednenznak specjalny"),
});

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;

  recipes_added: Types.ObjectId[];
  recipes_liked: Types.ObjectId[];

  friends_requested: Types.ObjectId[];
  friends: Types.ObjectId[];

  shopping_list: Types.ObjectId[];

  verified: boolean;
  verificationToken: string;

  resetPasswordToken?: string;
  resetPasswordExpires?: Date;

  createdAt: Date;
  expireAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },

    recipes_added: [{ type: Schema.Types.ObjectId, ref: "Recipe" }],
    recipes_liked: [{ type: Schema.Types.ObjectId, ref: "Recipe" }],

    friends_requested: [{ type: Schema.Types.ObjectId, ref: "User" }],
    friends: [{ type: Schema.Types.ObjectId, ref: "User" }],

    shopping_list: [{ type: Schema.Types.ObjectId, ref: "ShoppingItem" }],

    verified: { type: Boolean, default: false },
    verificationToken: { type: String, default: "" },

    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    expireAt: {
      type: Date,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  },
);

export default model<IUser>("User", userSchema);
