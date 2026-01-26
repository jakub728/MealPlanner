import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import Recipe, { RecipeValidationSchema } from "../models/RecipeModel.js";
import { checkToken } from "../middleware/checkToken.js";
import UserModel from "../models/UserModel.js";

const router = Router();

//!GET Public recipes
//http://localhost:7777/api/recipies/public
router.get(
  "/public",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recipes = await Recipe.find({ status: "public" })
        .populate("author", "name")
        .populate("ingredients.ingredient");

      res.status(200).json(recipes);
    } catch (error) {
      next(error);
    }
  },
);

//!GET Private recipes [recipes_added]
//http://localhost:7777/api/recipies/private
router.get(
  "/private",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return next({ status: 401, message: "User not authenticated" });
      }

      const recipes = await Recipe.find({ author: req.userId })
        .populate("author", "name")
        .populate("ingredients.ingredient");

      res.status(200).json(recipes);
    } catch (error) {
      next(error);
    }
  },
);

//!POST Recipes
//http://localhost:7777/api/recipies/add
router.post(
  "/add",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = RecipeValidationSchema.parse(req.body);

      const newRecipe = new Recipe({
        ...validatedData,
        author: req.userId,
      });

      const savedRecipe = await newRecipe.save();

      await UserModel.findByIdAndUpdate(req.userId, {
        $push: { recipes_added: savedRecipe._id },
      });

      res.status(201).json({
        message: "Recipe created successfully",
        recipe: savedRecipe,
      });
    } catch (error: any) {
      next(error);
    }
  },
);

export default router;
