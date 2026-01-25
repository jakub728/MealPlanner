import { Router, type Request, type Response, type NextFunction } from 'express';
import Recipe, { RecipeValidationSchema } from '../models/RecipeModel.js';
import { checkToken } from '../middleware/checkToken.js';

const router = Router()


//!GET Recipies
//http://localhost:7777/api/recipies/get
router.get('/get', async(req: Request, res: Response, next: NextFunction) => {
    try {
        const recipes = await Recipe.find()
            .populate('author', 'name') 
            .populate('ingredients.ingredient'); 

        res.status(200).json(recipes);
    } catch (error) {
        next(error);
    }
})


//!POST Recipie
//http://localhost:7777/api/recipies/add
router.post('/add', checkToken, async(req: Request, res: Response, next: NextFunction) => {
    try {
        const validatedData = RecipeValidationSchema.parse(req.body);

        const newRecipe = new Recipe({
            ...validatedData,
            author: req.userId
            //if TS error than make    author: (req as any).userId
        });

        const savedRecipe = await newRecipe.save();

        res.status(201).json({
            message: "Recipe created successfully",
            recipe: savedRecipe
        });
    } catch (error: any) {
        next(error)
    }
})
