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
                    (r: any) => `
                  <div class="card" id="card-${r._id}">
                    <div class="header">
                      <div>
                        <div class="title">${r.title}</div>
                        <div class="meta">
                          Autor: <strong>${r.author?.name || "Nieznany"}</strong> (${r.author?.email || "brak maila"})<br>
                          Kuchnia: ${r.cuisine || "Nie podano"} | Diety: ${r.diet_type?.join(", ") || "brak"}
                        </div>
                      </div>
                      <span class="badge">PENDING</span>
                    </div>

                    <div class="content">
                      <div class="details">
                        <p><i>${r.description || "Brak opisu"}</i></p>
                        
                        <div class="list-section">
                          <strong>Składniki:</strong><br>
                          ${r.ingredients.map((i: any) => `• ${i.name}: ${i.amount}${i.unit}`).join("<br>")}
                        </div>

                        <div class="list-section">
                          <strong>Instrukcje:</strong><br>
                          ${r.instructions.map((step: string, idx: number) => `${idx + 1}. ${step}`).join("<br>")}
                        </div>
                      </div>
                      
                      ${
                        r.imageUrl
                          ? `
                        <div class="image-preview">
                          <img src="${r.imageUrl}" alt="Recipe photo">
                        </div>
                      `
                          : ""
                      }
                    </div>

                    <button class="btn" onclick="approve('${r._id}')">Zatwierdź i publikuj</button>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>

            <script>
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

//? PATCH Pending->Public Recipes [admin]
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

export default router;
