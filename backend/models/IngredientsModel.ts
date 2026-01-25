import {Schema, model, Document} from "mongoose"
import {z} from 'zod'

export const IngredientSchema = z.object({
  name: z.string().min(2, "Name is too short").trim(),
  category: z.enum(["vegetable", "fruit", "meat", "spice", "other"]),
  nutrition: z.object({
    calories: z.number().nonnegative("Calories cannot be negative"),
    protein: z.number().nonnegative().max(100, "Protein cannot exceed 100g").default(0),
    carbs: z.number().nonnegative().max(100, "Carbs cannot exceed 100g").default(0),
    fats: z.number().nonnegative().max(100, "Fats cannot exceed 100g").default(0),
  }).optional()
}).refine((data) => {
  if (!data.nutrition) return true;

  const { protein, carbs, fats } = data.nutrition;
  return (protein + carbs + fats) <= 100;
}, {
  message: "Total macros (protein + carbs + fats) cannot exceed 100g",
  path: ["nutrition"] 
});

export interface IIngredient extends Document {
  name: string;
  category: 'meat' | 'vegetable' | 'fruit' | 'spice' | 'other';
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

const ingredientSchema = new Schema<IIngredient>({
  name: { type: String, required: true, unique: true, trim: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['meat', 'vegetable', 'fruit', 'spice', 'other'] 
  },
  nutrition: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fats: { type: Number, default: 0 }
  },
});

export const Ingredient = model<IIngredient>('Ingredient', ingredientSchema);