import {Schema, model, Document, Types} from "mongoose"
import { z } from 'zod';


export const UserRegistrationSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(20, "Name is too long")
    .trim(),
  email: z.string()
    .email("Invalid email format")
    .lowercase()
    .trim(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character")
});

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;

  recipes_added: Types.ObjectId[];
  recipes_liked: Types.ObjectId[];

  friends_requested: Types.ObjectId[];
  friends:  Types.ObjectId[];

  verified: boolean;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },

  recipes_added: [{ type: Schema.Types.ObjectId, ref: 'Recipe' }],
  recipes_liked: [{ type: Schema.Types.ObjectId, ref: 'Recipe' }],
  
  friends_requested: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  verified: { type: Boolean, default: false }
  }, { 
  timestamps: true
  });

export default model<IUser>('User', userSchema);