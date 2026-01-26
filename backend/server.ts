//?IMPORTS
import express from "express";
import type { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { ZodError } from "zod";

//?MIDDLEWARE

//?UTILLITIES
import { connectDB } from "./utilities/connectDB.js";

//?ROUTES
import AuthRoute from "./routes/auth.js";
import IngredientRoute from "./routes/ingredients.js";
import RecipeRouter from "./routes/recipies.js";

dotenv.config();
await connectDB();
const app = express();
const PORT = process.env.PORT || 7777;
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined");
  process.exit(1);
}

app.use(express.json());
app.use(cors());

//!ROUTES
app.use("/api/auth", AuthRoute);
app.use("/api/ingredients", IngredientRoute);
app.use("/api/recipes", RecipeRouter);

//!GLOBAL ERROR
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: err.issues.map((i) => i.message).join(", "),
    });
  }
  console.error(err);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error" });
});

//!LISTEN
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
