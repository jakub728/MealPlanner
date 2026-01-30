import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import Calendar, { CalendarValidationSchema } from "../models/CalendarModel.js";
import { checkToken } from "../middleware/checkToken.js";
import { startOfDay, endOfDay } from "date-fns";

const router = Router();

//! GET: All Calendar entries for a user
// http://localhost:7777/api/calendar/all
router.get(
  "/all",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return next({ status: 401, message: "User not authenticated" });
      }

      const allEntries = await Calendar.find({ user: req.userId });
      res.status(200).json(allEntries);
    } catch (error) {
      next(error);
    }
  },
);

//!GET Calendar entries for a user with date filter
//http://localhost:7777/api/calendar/?date=${dateKey}
router.get(
  "/",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date } = req.query;
      if (!date) return res.status(400).json({ message: "Date is required" });

      if (!req.userId) {
        return next({ status: 401, message: "User not authenticated" });
      }

      const searchDate = new Date(date as string);

      const calendarEntries = await Calendar.find({
        user: req.userId,
        date: {
          $gte: startOfDay(searchDate),
          $lte: endOfDay(searchDate),
        },
      }).populate("recipe", "title description ingredients"); // Dodaj ingredients, będą potrzebne liście zakupów

      res.status(200).json(calendarEntries);
    } catch (error) {
      next(error);
    }
  },
);

//!POST Add entry to calendar
//http://localhost:7777/api/calendar/add
router.post(
  "/add",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawData = {
        ...req.body,
        user: req.userId,
        date: new Date(req.body.date),
      };

      if (!req.userId) {
        return next({ status: 401, message: "User not authenticated" });
      }

      const parsedData = CalendarValidationSchema.parse(rawData);

      const targetDate = parsedData.date;
      targetDate.setHours(12, 0, 0, 0);

      const updatedEntry = await Calendar.findOneAndUpdate(
        {
          user: req.userId,
          date: {
            $gte: startOfDay(targetDate),
            $lte: endOfDay(targetDate),
          },
          mealType: parsedData.mealType,
        },
        {
          recipe: parsedData.recipe,
          date: targetDate, // Ważne, żeby zapisać z godziną 12:00
        },
        { upsert: true, new: true },
      ).populate("recipe");

      res.status(201).json(updatedEntry);
    } catch (error) {
      console.log("Błąd zapisu kalendarza:", error);
      next(error);
    }
  },
);

//!DELETE Calendar entry
//http://localhost:7777/api/calendar/delete/:id
router.delete(
  "/delete/:id",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return next({ status: 401, message: "User not authenticated" });
      }

      const calendarEntry = await Calendar.findById(req.params.id);

      if (!calendarEntry) {
        return next({ status: 404, message: "Calendar entry not found" });
      }

      if (calendarEntry.user.toString() !== req.userId) {
        return next({
          status: 403,
          message: "Not authorized to delete this calendar entry",
        });
      }

      await Calendar.findByIdAndDelete(req.params.id);

      res.status(200).json({ message: "Calendar entry deleted successfully" });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
