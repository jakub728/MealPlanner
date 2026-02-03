import { Schema, model, Document, Types } from "mongoose";
import { z } from "zod";

const UNITS = ["g", "ml", "szt", "tbs", "tsp"] as const;

export const RecipeValidationSchema = z.object({
  title: z.string().min(3, "Title is too short").trim(),
  description: z.string().optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1, "Name is required"),
        amount: z.number().positive("Amount must be greater than 0"),
        unit: z.enum(UNITS, {
          message: "Invalid unit. Please choose from the allowed list.",
        }),
      }),
    )
    .min(1, "Recipe must have at least one ingredient"),
  instructions: z
    .array(z.string().min(5, "Instruction step is too short"))
    .min(1, "Recipe must have steps"),
  status: z.enum(["private", "pending", "public"]).optional(),
  imageUrl: z.string().url("Invalid image URL").optional(),
  diet_type: z.array(z.string()).optional(),
  cuisine: z.string().optional(),
  comments: z.array(z.string()).optional(),
  note: z.array(z.number().min(1, "Min 1").max(5, "Max 5")).optional(),
});

export interface IRecipe extends Document {
  title: string;
  description?: string;
  author: Types.ObjectId;
  ingredients: {
    name: string;
    amount: number;
    unit: (typeof UNITS)[number];
  }[];
  instructions: string[];
  status: "private" | "pending" | "public";
  imageUrl?: string;
  diet_type?: string[];
  cuisine?: string;
  comments?: string[];
  note?: number[];
  createdAt: Date;
}

const recipeSchema = new Schema<IRecipe>(
  {
    title: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User" },
    description: { type: String },
    ingredients: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true },
        unit: { type: String, enum: UNITS, required: true },
      },
    ],
    instructions: [{ type: String, required: true }],
    status: {
      type: String,
      enum: ["private", "pending", "public"],
      default: "private",
    },
    imageUrl: { type: String, default: null },
    diet_type: { type: [String], default: [] },
    cuisine: { type: String, default: "" },
    comments: { type: [String], default: [] },
    note: { type: [Number], default: [] },
  },
  { timestamps: true },
);

export const FileUploadSchema = z.object({
  size: z.number().max(5 * 1024 * 1024, "Plik nie może przekraczać 5MB"),
  mimetype: z
    .string()
    .refine(
      (type) => ["image/jpeg", "image/png"].includes(type),
      "Tylko formaty JPG, PNG są dozwolone",
    ),
});

export default model<IRecipe>("Recipe", recipeSchema);
