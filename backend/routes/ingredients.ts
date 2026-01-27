import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { Ingredient, IngredientSchema } from "../models/IngredientsModel.js";
import { checkToken } from "../middleware/checkToken.js";
import { log } from "node:console";

const router = Router();

//! GET Ingredients
//http://localhost:7777/api/ingredients/get
router.get("/get", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ingredients = await Ingredient.find();
    res.status(200).json(ingredients);
  } catch (error: any) {
    console.error("GET /get error:", error);
    next(error);
  }
});

//! GET Searched ingredient
//http://localhost:7777/api/ingredients/search?name
router.get("/search", async (req, res) => {
  try {
    const { name } = req.query;
    const ingredients = await Ingredient.find({
      name: { $regex: `^${name}`, $options: "i" },
    }).limit(5);
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ message: "Błąd wyszukiwania" });
  }
});

//! POST Ingredient
//http://localhost:7777/api/ingredients/add
router.post(
  "/add",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = IngredientSchema.parse(req.body);

      const existingIngredient = await Ingredient.findOne({
        name: { $regex: new RegExp(`^${validatedData.name.trim()}$`, "i") },
      });

      if (existingIngredient) {
        return next({
          status: 400,
          message: "Ingredient already exist",
        });
      }

      const newIngredient = new Ingredient(validatedData);
      const savedIngredient = await newIngredient.save();
      console.log(`Ingredient  added ${newIngredient}`);

      res.status(201).json(savedIngredient);
    } catch (error: any) {
      console.error("POST /add error:", error);
      next(error);
    }
  },
);

//! PATCH Ingredient
//http://localhost:7777/api/ingredients/edit:id
router.patch(
  "/edit/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const validatedData = IngredientSchema.partial().parse(req.body);

      const updatedIngredient = await Ingredient.findByIdAndUpdate(
        id,
        { $set: validatedData },
        { new: true, runValidators: true },
      );

      if (!updatedIngredient) {
        return next({
          status: 404,
          message: "No ingredient found",
        });
      }
      res.status(200).json({
        message: "Nutrition updated successfully",
        ingredient: updatedIngredient,
      });
    } catch (error: any) {
      console.error("PATCH /edit error:", error);
      next(error);
    }
  },
);

export default router;
