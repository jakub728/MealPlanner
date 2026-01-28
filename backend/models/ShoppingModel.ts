import { Schema, model, Document, Types } from "mongoose";
import { z } from "zod";

const units = ["g", "kg", "ml", "L", "szt"] as const;

export const ShoppingItemSchema = z.object({
  name: z.string().min(1, "Item name is required").trim(),
  amount: z.number().min(1), 
  unit: z.enum(units),       
  purchased: z.boolean().default(false),
  friendId: z.string().optional(), 
});

export interface IShoppingItem extends Document {
  name: string;
  amount: number;
  unit: (typeof units)[number];
  purchased: boolean;
  friendId?: Types.ObjectId; // Referencja do innego użytkownika
  user: Types.ObjectId;      // Właściciel listy
  createdAt: Date;
}

const shoppingItemSchema = new Schema<IShoppingItem>(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, default: 1 },
    unit: { type: String, enum: units, required: true },
    purchased: { type: Boolean, default: false },
    friendId: { type: Schema.Types.ObjectId, ref: "User" },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const ShoppingItem = model<IShoppingItem>(
  "ShoppingItem",
  shoppingItemSchema,
);
