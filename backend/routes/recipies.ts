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

      // Pobieramy przepisy z statusem pending i danymi autora
      const pending = await Recipe.find({ status: "pending" })
        .populate("author", "name email")
        .sort({ createdAt: -1 });

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Panel Admina - Weryfikacja</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: 'Segoe UI', sans-serif; padding: 20px; background: #f4f7f6; color: #333; }
              .container { max-width: 1000px; margin: 0 auto; }
              .card { background: white; padding: 20px; border-radius: 16px; margin-bottom: 25px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
              .title-area { flex: 1; }
              .title { font-size: 1.6rem; font-weight: 800; color: #1a1a1a; margin-bottom: 5px; }
              .meta { font-size: 0.85rem; color: #6b7280; }
              .content { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-top: 15px; }
              .image-preview img { width: 100%; border-radius: 12px; object-fit: cover; aspect-ratio: 16/9; background: #eee; }
              .list-section { background: #f9fafb; padding: 15px; border-radius: 10px; margin-bottom: 10px; border: 1px solid #f3f4f6; }
              .tag { display: inline-block; background: #fee2e2; color: #ef4444; padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; margin-right: 5px; }
              .diet-tag { background: #dcfce7; color: #16a34a; }
              .btn-group { display: flex; gap: 10px; margin-top: 20px; }
              .btn { flex: 1; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold; border: none; transition: 0.2s; font-size: 0.95rem; }
              .btn-save { background: #3b82f6; color: white; }
              .btn-approve { background: #10b981; color: white; }
              .btn:hover { opacity: 0.9; transform: translateY(-1px); }
              [contenteditable="true"] { border: 1px dashed #3b82f6; padding: 5px; border-radius: 4px; background: #fff; }
            </style>
          </head>
          <body>
            <div class="container">
              <header style="margin-bottom: 30px;">
                <h1 style="margin:0;">Oczekujące Przepisy <span style="color: #ef4444;">(${pending.length})</span></h1>
                <p style="color: #6b7280;">Tryb edycji: kliknij w tytuł lub instrukcję, aby poprawić przed publikacją.</p>
              </header>

              <div id="list">
                ${pending
                  .map(
                    (r: any) => `
                  <div class="card" id="card-${r._id}">
                    <div class="header">
                      <div class="title-area">
                        <div class="title" id="title-${r._id}" contenteditable="true">${r.title}</div>
                        <div class="meta">
                          Autor: <strong>${r.author?.name || "Gość"}</strong> (${r.author?.email || "-"}) 
                          | Kuchnia: <strong>${r.cuisine || "Brak"}</strong>
                        </div>
                        <div style="margin-top: 8px;">
                          ${r.dish_type?.map((t: string) => `<span class="tag">${t}</span>`).join("")}
                          ${r.diet_type?.map((t: string) => `<span class="tag diet-tag">${t}</span>`).join("")}
                        </div>
                      </div>
                    </div>

                    <div class="content">
                      <div class="details">
                        <div class="list-section">
                          <strong style="display:block; margin-bottom: 5px; color: #374151;">Składniki:</strong>
                          <div style="font-size: 0.95rem;">
                            ${r.ingredients.map((i: any) => `• ${i.name}: <strong>${i.amount} ${i.unit}</strong>`).join("<br>")}
                          </div>
                        </div>

                        <div class="list-section">
                          <strong style="display:block; margin-bottom: 5px; color: #374151;">Instrukcja (Edytowalna):</strong>
                          <div id="instr-${r._id}" contenteditable="true" style="white-space: pre-wrap; font-size: 0.95rem; min-height: 80px;">${r.instructions}</div>
                        </div>
                      </div>

                      <div class="image-preview">
                        ${r.imageUrl ? `<img src="${r.imageUrl}" alt="Foto">` : `<div style="height:150px; background:#eee; border-radius:12px; display:flex; align-items:center; justify-content:center; color:#aaa;">Brak zdjęcia</div>`}
                      </div>
                    </div>

                    <div class="btn-group">
                      <button class="btn btn-save" onclick="saveChanges('${r._id}')">💾 Zapisz poprawki</button>
                      <button class="btn btn-approve" onclick="approve('${r._id}')">✅ Zatwierdź i Opublikuj</button>
                    </div>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>

            <script>
              const auth = 'user=${user}&pass=${pass}';

              async function saveChanges(id) {
                const title = document.getElementById('title-' + id).innerText.trim();
                const instructions = document.getElementById('instr-' + id).innerText.trim();

                try {
                  const res = await fetch(\`/api/recipes/admin/quick-edit/\${id}?\${auth}\`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, instructions })
                  });

                  if(res.ok) alert('Zmiany zapisane pomyślnie!');
                  else alert('Błąd zapisu danych.');
                } catch(e) {
                  alert('Błąd połączenia z API');
                }
              }

              async function approve(id) {
                if(!confirm('Opublikować przepis na stałe?')) return;
                try {
                  const res = await fetch(\`/api/recipes/admin/approve/\${id}?\${auth}\`, {
                    method: 'PATCH'
                  });
                  if(res.ok) {
                    const card = document.getElementById('card-' + id);
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.9)';
                    setTimeout(() => card.remove(), 300);
                  } else {
                    alert('Błąd serwera podczas akceptacji');
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
  uploadRecipe.single("image"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recipeId = req.params.id;

      const recipe = await Recipe.findById(recipeId);

      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      if (
        recipe.status !== "private" ||
        recipe.author.toString() !== req.userId
      ) {
        return res
          .status(403)
          .json({ message: "You can not edit this recipe" });
      }

      let updateData = { ...req.body };

      ["ingredients", "diet_type", "dish_type"].forEach((field) => {
        if (typeof updateData[field] === "string")
          updateData[field] = JSON.parse(updateData[field]);
      });

      if (req.file) {
        if (recipe.imageUrl) {
          try {
            const urlParts = recipe.imageUrl.split("/");
            const oldKey = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}`;

            if (oldKey) await deleteFileFromS3(oldKey);
          } catch (err) {
            console.error("Błąd podczas usuwania starego zdjęcia:", err);
          }
        }
        updateData.imageUrl = (req.file as any).location;
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
function deleteFileFromS3(oldKey: string) {
  throw new Error("Function not implemented.");
}
