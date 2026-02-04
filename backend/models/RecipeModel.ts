import { Schema, model, Document, Types } from "mongoose";
import { z } from "zod";

const UNITS = [
  "g",
  "kg",
  "ml",
  "szt",
  "łyżka",
  "łyżeczka",
  "szczypta",
] as const;

const DISHES = [
  "szybkie",
  "śniadanie",
  "przekąska",
  "zupa",
  "sałatka",
  "obiad",
  "danie jednogarnkowe",
  "makaron",
  "lunchbox",
  "deser",
  "kolacja",
  "napój",
  "drink",
  "pieczywo",
  "przetwory",
  "sos",
] as const;

export const RecipeValidationSchema = z.object({
  title: z.string().min(3, "Tytuł jest za krótki").trim(),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1, "Wpisz nazwę składnika"),
        amount: z.number().positive("Wartość musi być wieksza niż 0"),
        unit: z.enum(UNITS),
      }),
    )
    .min(2, "Przepis musi mieć min. 2  składniki"),
  instructions: z.string().min(10, "Instrukcja misi mieć min. 10 znaków"),
  status: z.enum(["private", "pending", "public"]).optional(),
  imageUrl: z.string().url("Niedozwolony format").optional(),
  dish_type: z.array(z.enum(DISHES)).min(1, "Zaznacz min. 1 rodzaj dania"),
  diet_type: z.array(z.string()).optional(),
  cuisine: z.string().optional(),
  comments: z.array(z.string()).optional(),
  note: z.array(z.number().min(1, "Min 1").max(5, "Max 5")).optional(),
});

export interface IRecipe extends Document {
  title: string;
  author: Types.ObjectId;
  ingredients: {
    name: string;
    amount: number;
    unit: (typeof UNITS)[number];
  }[];
  instructions: string;
  status: "private" | "pending" | "public";
  imageUrl?: string;
  dish_type: (typeof DISHES)[number][];
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
    ingredients: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true },
        unit: { type: String, enum: UNITS, required: true },
      },
    ],
    instructions: { type: String, required: true },
    status: {
      type: String,
      enum: ["private", "pending", "public"],
      default: "private",
    },
    imageUrl: { type: String, default: null },
    dish_type: {
      type: [String],
      enum: DISHES,
      required: true,
      default: [],
    },
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
