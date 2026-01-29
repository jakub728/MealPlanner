import { Schema, model, Document, Types } from "mongoose";
import { z } from "zod";

// Walidacja Zod
export const CalendarValidationSchema = z.object({
  user: z.string().min(1, "User ID is required"),
  date: z.date(),
  mealType: z.enum(["śniadanie", "lunch", "obiad", "podwieczorek", "kolacja"]),
  recipe: z.string().min(1, "Recipe ID is required"),
});

export interface ICalendarEntry extends Document {
  user: Types.ObjectId;
  date: Date;
  mealType: "śniadanie" | "lunch" | "obiad" | "podwieczorek" | "kolacja";
  recipe: Types.ObjectId;
}

const calendarSchema = new Schema<ICalendarEntry>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  date: { type: Date, required: true },
  mealType: {
    type: String,
    required: true,
    enum: ["śniadanie", "lunch", "obiad", "podwieczorek", "kolacja"],
  },
  recipe: { type: Schema.Types.ObjectId, ref: "Recipe", required: true },
});

calendarSchema.index({ user: 1, date: 1, mealType: 1 }, { unique: true });

export default model<ICalendarEntry>("Calendar", calendarSchema);
