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
//http://localhost:7777/api/recipes/admin/dashboard?user=ADMIN_USER&pass=ADMIN_PASSWORD
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

      // Pobieramy przepisy i dane autora (name zamiast username, bo tak masz w modelu)
      const pending = await Recipe.find({ status: "pending" }).populate(
        "author",
        "name email",
      );

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Panel Admina - Przepisy</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #f0f2f5; color: #333; }
              .container { max-width: 900px; margin: 0 auto; }
              .card { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #eee; padding-bottom: 10px; }
              .title { font-size: 1.5rem; font-weight: bold; color: #FF6347; }
              .meta { font-size: 0.9rem; color: #666; margin-top: 5px; }
              .content { margin: 15px 0; display: flex; gap: 20px; }
              .details { flex: 2; }
              .image-preview { flex: 1; }
              .image-preview img { width: 100%; border-radius: 8px; object-fit: cover; max-height: 150px; }
              .list-section { background: #fff9f8; padding: 10px; border-radius: 8px; margin-top: 10px; border-left: 4px solid #FF6347; }
              .btn { background: #28a745; color: white; border: none; padding: 12px 25px; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%; font-size: 1rem; }
              .btn:hover { background: #218838; }
              .badge { background: #e9ecef; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Oczekujące przepisy (${pending.length})</h1>
              <div id="list">
                ${pending
                  .map(
                    (r: any) =>
                      `
                  <div class="card" id="card-${r._id}">
                    <div class="header">
                      <div>
                        <div class="title" id="title-${r._id}" contenteditable="true" style="border: 1px dashed #ccc; padding: 2px;">${r.title}</div>
                        <div class="meta">
                          Autor: <strong>${r.author?.name || "Nieznany"}</strong> | Kuchnia: ${r.cuisine || "Nieokreślona"}
                        </div>
                      </div>
                    </div>

                    <div class="content">
                      <div class="details">
                        <div class="list-section">
                          <strong>Składniki:</strong>
                          <p>${r.ingredients.map((i: any) => `${i.name}: ${i.amount}${i.unit}`).join(", ")}</p>
                        </div>

                        <div class="list-section">
                          <strong>Instrukcje (edytowalne):</strong>
                          <div id="instr-${r._id}" contenteditable="true" style="white-space: pre-wrap; background: #fff; border: 1px dashed #ccc; padding: 10px; margin-top: 5px; min-height: 100px;">${r.instructions}</div>
                        </div>
                      </div>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                      <button class="btn" style="background: #007bff;" onclick="saveChanges('${r._id}')">Zapisz poprawki</button>
                      <button class="btn" onclick="approve('${r._id}')">Zatwierdź i publikuj</button>
                    </div>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>

            <script>
              async function saveChanges(id) {
                const title = document.getElementById('title-' + id).innerText;
                const instructions = document.getElementById('instr-' + id).innerText;

                try {
                  const res = await fetch(\`/api/recipes/admin/quick-edit/\${id}?user=${user}&pass=${pass}\`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, instructions }) // Wysyłamy poprawione instrukcje
                  });

                  if(res.ok) {
                    alert('Zmiany zapisane!');
                  } else {
                    alert('Błąd zapisu');
                  }
                } catch(e) {
                  alert('Błąd połączenia');
                }
              }

              async function approve(id) {
                if(!confirm('Czy na pewno chcesz opublikować ten przepis?')) return;
                try {
                  const res = await fetch(\`/api/recipes/admin/approve/\${id}?user=${user}&pass=${pass}\`, {
                    method: 'PATCH'
                  });
                  if(res.ok) {
                    const card = document.getElementById('card-' + id);
                    card.style.transition = 'all 0.5s ease';
                    card.style.opacity = '0';
                    card.style.transform = 'translateX(100px)';
                    setTimeout(() => card.remove(), 500);
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
//http://localhost:7777/api/recipes/add
router.post(
  "/add",
  checkToken,
  uploadRecipe.single("image"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawData = { ...req.body };

      const arraysToParse = ["ingredients", "diet_type", "dish_type"];
      arraysToParse.forEach((field) => {
        if (typeof rawData[field] === "string") {
          try {
            rawData[field] = JSON.parse(rawData[field]);
          } catch (e) {
            rawData[field] = []; // fallback
          }
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
      console.log("recipe/add error: ", error);
      next(error);
    }
  },
);

//!POST Add recipe [recipes_liked]
//http://localhost:7777/api/recipes/like
router.post(
  "/like",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { recipeId } = req.body;

      if (!recipeId) {
        return res.status(400).json({ message: "Recipe ID is required" });
      }

      const user = await UserModel.findByIdAndUpdate(
        req.userId,
        { $addToSet: { recipes_liked: recipeId } },
        { new: true },
      );

      res.status(200).json({
        message: "Recipe liked successfully",
        likedRecipes: user?.recipes_liked,
      });
    } catch (error: any) {
      next(error);
    }
  },
);

//!PUT Edit Recipe with status==="private" & owner==="author"
//http://localhost:7777/api/recipes/edit/:id
router.put(
  "/edit/:id",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recipeId = req.params.id;
      const updateData = req.body;

      const recipe = await Recipe.findById(recipeId);

      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      if (recipe.status !== "private") {
        return res
          .status(403)
          .json({ message: "You can not edit this recipe" });
      }

      if (recipe.author.toString() !== req.userId) {
        return res
          .status(403)
          .json({ message: "You can not edit this recipe" });
      }

      const updatedRecipe = await Recipe.findByIdAndUpdate(
        recipeId,
        { $set: updateData },
        { new: true, runValidators: true },
      );

      res.status(200).json({
        message: "Recipe updated successfully",
        recipe: updatedRecipe,
      });
    } catch (error: any) {
      next(error);
    }
  },
);

//!PATCH Recipe by ID - Verification
//http://localhost:7777/api/recipes/:id
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

//?PATCH Admin Edit Pending Recipes [admin]
//http://localhost:7777/api/recipes/admin/quick-edit/:id?user=ADMIN_USER&pass=ADMIN_PASSWORD
router.patch(
  "/admin/quick-edit/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, pass } = req.query;
      if (
        user !== process.env.ADMIN_USER ||
        pass !== process.env.ADMIN_PASSWORD
      ) {
        return res.status(401).json({ message: "Błąd autoryzacji" });
      }

      const updated = await Recipe.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true },
      );

      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  },
);

//?PATCH Pending->Public Recipes [admin]
//http://localhost:7777/api/recipes/admin/approve?user=ADMIN_USER&pass=ADMIN_PASSWORD
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

//!DELETE Recipe by ID
//http://localhost:7777/api/recipes/:id
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
