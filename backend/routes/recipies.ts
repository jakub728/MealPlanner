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
//http://localhost:7777/api/recipes/private
router.get(
  "/private",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return next({ status: 401, message: "User not authenticated" });
      }

      const recipes = await Recipe.find({ author: req.userId }).populate(
        "author",
        "name",
      );
      res.status(200).json(recipes);
    } catch (error) {
      next(error);
    }
  },
);

//!GET Single recipe by ID
//http://localhost:7777/api/recipes/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recipe = await Recipe.findById(req.params.id).populate(
      "author",
      "name",
    );

    if (!recipe) {
      return next({ status: 404, message: "Recipe not found" });
    }

    // const totals = recipe.ingredients.reduce(
    //   (acc, item: any) => {
    //     const ing = item.ingredient;
    //     const factor = item.amount / 100;

    //     return {
    //       calories: acc.calories + ing.calories * factor,
    //       protein: acc.protein + ing.protein * factor,
    //       carbs: acc.carbs + ing.carbs * factor,
    //       fat: acc.fat + ing.fat * factor,
    //     };
    //   },
    //   { calories: 0, protein: 0, carbs: 0, fat: 0 },
    // );

    res.status(200).json(recipe);
  } catch (error) {
    next(error);
  }
});

//!POST Add recipe [recipes_added]
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

//!DELETE Recipe by ID
//http://localhost:7777/api/recipies/:id
router.delete(
  "/:id",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return next({ status: 401, message: "User not authenticated" });
      }

      const recipe = await Recipe.findById(req.params.id);

      if (!recipe) {
        return next({ status: 404, message: "Recipe not found" });
      }

      if (recipe.author.toString() !== req.userId) {
        return next({
          status: 403,
          message: "Not authorized to delete this recipe",
        });
      }

      await Recipe.findByIdAndDelete(req.params.id);

      await UserModel.findByIdAndUpdate(req.userId, {
        $pull: { recipes_added: req.params.id },
      });
      res.status(200).json({ message: "Recipe deleted successfully" });
    } catch (error) {
      next(error);
    }
  },
);



export default router;
