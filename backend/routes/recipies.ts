import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import Recipe, { RecipeValidationSchema } from "../models/RecipeModel.js";
import { checkToken } from "../middleware/checkToken.js";
import UserModel from "../models/UserModel.js";
import { uploadRecipe } from "../utilities/s3.js";

const router = Router();

//!GET Public recipes
//http://localhost:7777/api/recipies/public
router.get(
  "/public",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recipes = await Recipe.find({ status: "public" }).populate(
        "author",
        "name",
      );

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

//!GET Recipes liked by user [recipes_liked]
//http://localhost:7777/api/recipes/liked
router.get(
  "/liked",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await UserModel.findById(req.userId).populate({
        path: "recipes_liked",
        populate: {
          path: "author",
          select: "name",
        },
      });

      if (!user) {
        return next({ status: 404, message: "User not found" });
      }

      res.status(200).json(user.recipes_liked || []);
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

    res.status(200).json(recipe);
  } catch (error) {
    next(error);
  }
});

//? GET Pending Recipes [admin]
//http://localhost:7777/api/recipes/admin/pending?user=ADMIN_USER&pass=ADMIN_PASSWORD
router.get(
  "/admin/dashboard",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, pass } = req.query;

      if (
        user !== process.env.ADMIN_USER ||
        pass !== process.env.ADMIN_PASSWORD
      ) {
        return res.status(401).send("<h1>Błąd autoryzacji</h1>");
      }

      const pending = await Recipe.find({ status: "pending" }).populate(
        "author",
        "username",
      );

      // Generowanie prostego HTML
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Panel Admina - Przepisy</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: sans-serif; padding: 20px; background: #f4f4f4; }
              .card { background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; }
              .btn { background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; }
              .btn:hover { background: #45a049; }
              .info { flex: 1; }
              h1 { color: #333; }
              .badge { background: #FF6347; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
            </style>
          </head>
          <body>
            <h1>Przepisy oczekujące (${pending.length})</h1>
            <div id="list">
              ${pending
                .map(
                  (r) => `
                <div class="card" id="card-${r._id}">
                  <div class="info">
                    <strong>${r.title}</strong> <span class="badge">pending</span><br>
                    <small>Autor: ${r.author || "Anonim"}</small>
                  </div>
                  <button class="btn" onclick="approve('${r._id}')">Akceptuj</button>
                </div>
              `,
                )
                .join("")}
            </div>

            <script>
              async function approve(id) {
                if(!confirm('Czy na pewno chcesz opublikować ten przepis?')) return;
                
                try {
                  const res = await fetch(\`/api/recipes/admin/approve/\${id}?user=${user}&pass=${pass}\`, {
                    method: 'PATCH'
                  });
                  if(res.ok) {
                    document.getElementById('card-' + id).style.display = 'none';
                    alert('Opublikowano!');
                  } else {
                    alert('Błąd serwera');
                  }
                } catch(e) {
                  alert('Błąd połączenia');
                }
              }
            </script>
          </body>
        </html>
      `;

      res.send(html);
    } catch (error) {
      next(error);
    }
  },
);

//!POST Add recipe [recipes_added]
//http://localhost:7777/api/recipies/add
router.post(
  "/add",
  checkToken,
  uploadRecipe.single("image"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawData = { ...req.body };

      const fieldsToParse = [
        "ingredients",
        "instructions",
        "diet_type",
        "cuisine",
      ];
      fieldsToParse.forEach((field) => {
        if (typeof rawData[field] === "string") {
          try {
            rawData[field] = JSON.parse(rawData[field]);
          } catch (e) {}
        }
      });

      const file = (req as any).file;
      if (file) {
        rawData.imageUrl = file.location;
      }

      const validatedData = RecipeValidationSchema.parse(rawData);

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

//!PATCH Recipe by ID - Verification
//http://localhost:7777/api/recipies/:id
router.patch(
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
          message: "Not authorized to submit this recipe",
        });
      }

      recipe.status = "pending";
      await recipe.save();
      res.status(200).json({ message: "Recipe submitted for verification" });
    } catch (error) {
      next(error);
    }
  },
);

//? PATCH Pending->Public Recipes [admin]
//http://localhost:7777/api/recipes/admin/pending?user=ADMIN_USER&pass=ADMIN_PASSWORD
router.patch(
  "/admin/approve/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, pass } = req.query;

      if (
        user !== process.env.ADMIN_USER ||
        pass !== process.env.ADMIN_PASSWORD
      ) {
        return res.status(401).json({ message: "Błąd autoryzacji admina" });
      }

      const updatedRecipe = await Recipe.findByIdAndUpdate(
        req.params.id,
        {
          status: "public",
        },
        { new: true },
      );

      if (!updatedRecipe) {
        return res.status(404).json({ message: "Nie znaleziono przepisu" });
      }

      res.status(200).json({
        message: "Przepis został zatwierdzony i jest publiczny!",
        recipe: updatedRecipe,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
