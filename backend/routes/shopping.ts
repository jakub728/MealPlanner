import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import Shopping, { ValidateShoppingSchema } from "../models/ShoppingModel.js";
import Calendar from "../models/CalendarModel.js";
import { checkToken } from "../middleware/checkToken.js";
import { nextSunday, isSunday, format, startOfDay, endOfDay } from "date-fns";

const router = Router();

//! 1. GET Shopping List
//http://localhost:7777/api/shopping/
router.get(
  "/",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "User not identified" });
      }

      const items = await Shopping.find({ user: req.userId });

      const sortedItems = items.sort((a, b) => {
        const getPriority = (item: any) => {
          if (item.have_at_home) return 2;
          if (item.purchased) return 1;
          return 0;
        };

        const priorityA = getPriority(a);
        const priorityB = getPriority(b);

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return a.name.localeCompare(b.name);
      });

      res.status(200).json(sortedItems);
    } catch (error) {
      next(error);
    }
  },
);

//! 2. PATCH Update Shopping Items
//http://localhost:7777/api/shopping/:id
router.patch(
  "/:id",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = ValidateShoppingSchema.partial().parse(req.body);

      const item = await Shopping.findOneAndUpdate(
        { _id: req.params.id, user: req.userId } as any,
        { $set: validatedData },
        { new: true },
      );

      if (!item)
        return res.status(404).json({ message: "Nie znaleziono przedmiotu" });
      res.status(200).json(item);
    } catch (error) {
      next(error);
    }
  },
);

//! 3. POST Generate Shopping List
//http://localhost:7777/api/shopping/generate
router.post(
  "/generate",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      if (!userId)
        return res.status(401).json({ message: "User not identified" });

      const now = new Date();
      const sunday = isSunday(now) ? now : nextSunday(now);
      const start = startOfDay(now);
      const end = endOfDay(sunday);

      const plannedDays = await Calendar.find({
        user: userId,
        date: {
          $gte: start,
          $lte: end,
        },
      }).populate("recipe");

      if (!plannedDays || plannedDays.length === 0) {
        return res.status(200).json([]);
      }

      const existingItems = await Shopping.find({ user: userId });

      const aggregated: Record<string, any> = {};

      plannedDays.forEach((plan: any) => {
        const ingredients = plan.recipe?.ingredients;
        if (ingredients && Array.isArray(ingredients)) {
          ingredients.forEach((ing: any) => {
            let finalUnit = ing.unit;
            if (ing.unit === "tsp" || ing.unit === "tbs") finalUnit = "szt";

            const key = `${ing.name.toLowerCase().trim()}_${finalUnit}`;

            if (aggregated[key]) {
              aggregated[key].amount += Number(ing.amount);
            } else {
              const existing = existingItems.find(
                (ei) =>
                  ei.name.toLowerCase().trim() ===
                    ing.name.toLowerCase().trim() && ei.unit === finalUnit,
              );
              aggregated[key] = {
                name: ing.name.trim(),
                amount: Number(ing.amount),
                unit: finalUnit,
                purchased: existing ? existing.purchased : false,
                have_at_home: existing ? existing.have_at_home : false,
              };
            }
          });
        }
      });

      const itemsToInsert = Object.values(aggregated).map((data) => ({
        ...data,
        user: userId,
      }));

      await Shopping.deleteMany({ user: userId });

      if (itemsToInsert.length === 0) {
        return res.status(200).json([]);
      }

      const result = await Shopping.insertMany(itemsToInsert);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
