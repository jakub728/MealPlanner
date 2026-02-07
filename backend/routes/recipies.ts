import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import Recipe, { RecipeValidationSchema } from "../models/RecipeModel.js";
import { checkToken } from "../middleware/checkToken.js";
import UserModel from "../models/UserModel.js";
import { uploadRecipe, deleteFileFromS3 } from "../utilities/s3.js";
import { Types } from "mongoose";

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

      const pendingRecipes = await Recipe.find({ status: "pending" })
        .populate("author", "name email")
        .sort({ createdAt: -1 });

      const recipesWithPendingComments = await Recipe.find({
        "comments.verified": false,
      }).populate("comments.author", "name");

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Admin Dashboard</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: 'Segoe UI', sans-serif; padding: 20px; background: #f0f2f5; color: #1a1a1a; }
              .container { max-width: 1100px; margin: 0 auto; }
              .section-title { margin: 40px 0 20px; padding-bottom: 10px; border-bottom: 3px solid #3b82f6; display: flex; align-items: center; justify-content: space-between; }
              .card { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
              .content { display: grid; grid-template-columns: 1fr 300px; gap: 20px; }
              .comment-row { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 5px solid #f59e0b; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .btn { padding: 8px 16px; border-radius: 6px; cursor: pointer; border: none; font-weight: 600; transition: 0.2s; }
              .btn-approve { background: #10b981; color: white; }
              .btn-delete { background: #ef4444; color: white; margin-left: 5px; }
              .btn-save { background: #3b82f6; color: white; }
              [contenteditable="true"] { border: 1px dashed #3b82f6; background: #f9fafb; padding: 5px; border-radius: 4px; }
              img { max-width: 100%; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🚀 Panel Zarządzania</h1>

              <div class="section-title">
                <h2>Oczekujące Przepisy (${pendingRecipes.length})</h2>
              </div>
              
              <div id="recipes-list">
                ${pendingRecipes
                  .map(
                    (r) => `
                  <div class="card" id="recipe-${r._id}">
                    <div class="content">
                      <div>
                        <h3 id="title-${r._id}" contenteditable="true">${r.title}</h3>
                        <p style="font-size:0.9rem; color: #666;">Autor: ${(r.author as any)?.name || "Anonim"}</p>
                        <div id="instr-${r._id}" contenteditable="true" style="white-space: pre-wrap; margin: 10px 0; font-size: 0.9rem;">${r.instructions}</div>
                        <button class="btn btn-save" onclick="saveRecipe('${r._id}')">💾 Zapisz</button>
                        <button class="btn btn-approve" onclick="approveRecipe('${r._id}')">✅ Publikuj</button>
                      </div>
                      <div>${r.imageUrl ? `<img src="${r.imageUrl}">` : "Brak zdjęcia"}</div>
                    </div>
                  </div>
                `,
                  )
                  .join("")}
              </div>

              <div class="section-title">
                <h2>Komentarze do Weryfikacji</h2>
              </div>

              <div id="comments-list">
                ${recipesWithPendingComments
                  .map((r) =>
                    r.comments
                      ?.filter((c) => !c.verified)
                      .map((c) => {
                        const commentId = (c as any)._id.toString();
                        const authorName =
                          (c.author as any)?.name || "Użytkownik";

                        return `
                         <div class="comment-row" id="comment-${commentId}">
                           <div>
                             <strong>${authorName}</strong> o "${r.title}"
                             <div style="font-style: italic; color: #4b5563; margin-top: 5px;">"${c.text}"</div>
                           </div>
                           <div>
                             <button class="btn btn-approve" onclick="verifyComment('${r._id}', '${commentId}')">Zatwierdź</button>
                             <button class="btn btn-delete" onclick="deleteComment('${r._id}', '${commentId}')">Usuń</button>
                           </div>
                         </div>
                       `;
                      })
                      .join(""),
                  )
                  .join("")}
              </div>
            </div>

            <script>
              const auth = 'user=${user}&pass=${pass}';
              
              async function saveRecipe(id) {
                const title = document.getElementById('title-' + id).innerText;
                const instructions = document.getElementById('instr-' + id).innerText;
                const res = await fetch(\`/api/recipes/admin/quick-edit/\${id}?\${auth}\`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ title, instructions })
                });
                if(res.ok) alert('Poprawki zapisane!');
              }

              async function approveRecipe(id) {
                const res = await fetch(\`/api/recipes/admin/approve/\${id}?\${auth}\`, { method: 'PATCH' });
                if(res.ok) document.getElementById('recipe-' + id).remove();
              }

              async function verifyComment(recipeId, commentId) {
                const res = await fetch(\`/api/recipes/admin/comment-approve/\${recipeId}/\${commentId}?\${auth}\`, { method: 'PATCH' });
                if(res.ok) document.getElementById('comment-' + commentId).remove();
              }

              async function deleteComment(recipeId, commentId) {
                if(!confirm('Usunąć ten komentarz na stałe?')) return;
                const res = await fetch(\`/api/recipes/admin/comment-delete/\${recipeId}/\${commentId}?\${auth}\`, { method: 'DELETE' });
                if(res.ok) document.getElementById('comment-' + commentId).remove();
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
        message: "Przepis został utworzony",
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
        return res.status(400).json({ message: "Brak id przepisu" });
      }

      const user = await UserModel.findByIdAndUpdate(
        req.userId,
        { $addToSet: { recipes_liked: recipeId } },
        { new: true },
      );

      res.status(200).json({
        message: "Przepis polubiony",
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
        return res.status(404).json({ message: "Nie można znaleźć przepisu" });
      }

      if (
        recipe.status !== "private" ||
        recipe.author.toString() !== req.userId
      ) {
        return res.status(403).json({ message: "Nie masz uprawnień" });
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
        message: "Przepis został poprawiony",
        recipe: updatedRecipe,
      });
    } catch (error: any) {
      next(error);
    }
  },
);

//!PATCH Recipe to  verification
//http://localhost:7777/api/recipes/:id
router.patch(
  "/:id",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return next({ status: 401, message: "Błąd autoryzacji" });
      }

      const recipe = await Recipe.findById(req.params.id);

      if (!recipe) {
        return next({ status: 404, message: "Nie można znaleźć przepisu" });
      }

      if (recipe.author.toString() !== req.userId) {
        return next({
          status: 403,
          message: "Nie masz uprawnień",
        });
      }

      recipe.status = "pending";
      await recipe.save();
      res.status(200).json({ message: "Przepis wysłany do weryfikacji" });
    } catch (error) {
      next(error);
    }
  },
);

//!PATCH Note to recipe
//http://localhost:7777/api/recipes/note/:id
router.patch(
  "note/:id",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const recipe = await Recipe.findById(req.params.id);

      if (!recipe)
        return next({ status: 404, message: "Nie można znaleźć przepisu" });
      if (recipe.author.toString() === req.userId) {
        return next({
          status: 403,
          message: "Nie możesz oceniać własnego przepisu",
        });
      }

      const existingNote = recipe.note?.find(
        (n) => n.author.toString() === req.userId,
      );
      if (existingNote) {
        return next({ status: 400, message: "Już oceniłeś ten przepis" });
      }

      recipe.note?.push({
        value: Number(value),
        author: new Types.ObjectId(req.userId!),
      });

      await recipe.save();
      res.status(200).json({ message: "Ocena została dodana" });
    } catch (error) {
      next(error);
    }
  },
);

//!PATCH Comment to verification
//http://localhost:7777/api/recipes/comment/:id
router.patch(
  "/comment/:id",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text } = req.body;
      if (!text || text.length < 3)
        return next({ status: 400, message: "Komentarz jest za krótki" });

      const recipe = await Recipe.findById(req.params.id);
      if (!recipe)
        return next({ status: 404, message: "Nie można znaleźć przepisu" });

      recipe.comments?.push({
        text,
        author: new Types.ObjectId(req.userId!),
        verified: false,
        createdAt: new Date(),
      });

      await recipe.save();
      res
        .status(200)
        .json({ message: "Komentarz czeka na weryfikację przez admina" });
    } catch (error) {
      next(error);
    }
  },
);

//?PATCH Admin not verified comments[admin]
//http://localhost:7777/api/recipes/admin/quick-edit/:id?user=ADMIN_USER&pass=ADMIN_PASSWORD
router.patch(
  "/admin/comment-approve/:recipeId/:commentId",
  async (req, res, next) => {
    try {
      const { user, pass } = req.query;
      if (
        user !== process.env.ADMIN_USER ||
        pass !== process.env.ADMIN_PASSWORD
      )
        return res.sendStatus(401);

      await Recipe.updateOne(
        { _id: req.params.recipeId, "comments._id": req.params.commentId },
        { $set: { "comments.$.verified": true } },
      );
      res.status(200).json({ message: "Komentarz zatwierdzony" });
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
        return res.status(401).json({ message: "Błąd autoryzacji admina" });
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

      if (recipe.imageUrl) {
        try {
          const urlParts = recipe.imageUrl.split("/");
          const key = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}`;
          await deleteFileFromS3(key);
        } catch (err) {
          console.error("Błąd S3 podczas kawania przepisu:", err);
        }
      }

      await Recipe.findByIdAndDelete(req.params.id);

      await UserModel.findByIdAndUpdate(req.userId, {
        $pull: { recipes_added: req.params.id },
      });
      res.status(200).json({ message: "Przepis usuniety" });
    } catch (error) {
      next(error);
    }
  },
);

//?DELETE Comment by ID [admin]
//http://localhost:7777/api/recipes/admin/comment-delete/:recipeId/:commentId
router.delete(
  "/admin/comment-delete/:recipeId/:commentId",
  async (req, res, next) => {
    try {
      const { user, pass } = req.query;
      if (
        user !== process.env.ADMIN_USER ||
        pass !== process.env.ADMIN_PASSWORD
      )
        return res.sendStatus(401);

      await Recipe.updateOne(
        { _id: req.params.recipeId },
        { $pull: { comments: { _id: req.params.commentId } } },
      );
      res.status(200).json({ message: "Komentarz usunięty" });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
