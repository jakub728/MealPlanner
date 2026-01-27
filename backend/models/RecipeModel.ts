import { Schema, model, Document, Types } from "mongoose";
import { z } from "zod";

const UNITS = ["g", "ml", "szt", "tbs", "tsp"] as const;

export const RecipeValidationSchema = z.object({
  title: z.string().min(3, "Title is too short").trim(),
  description: z.string().min(10, "Description is too short"),
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
  imageUrl: z.string().url("Invalid image URL").optional(),
});

export interface IRecipe extends Document {
  title: string;
  description: string;
  author: Types.ObjectId;
  ingredients: {
    name: string;
    amount: number;
    unit: (typeof UNITS)[number];
  }[];
  instructions: string[];
  status: "private" | "pending" | "public";
  imageUrl?: string;
  createdAt: Date;
}

const recipeSchema = new Schema<IRecipe>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User" },
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
  },
  { timestamps: true },
);

export default model<IRecipe>("Recipe", recipeSchema);
