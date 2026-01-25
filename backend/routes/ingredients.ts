import { Router, type Request, type Response, type NextFunction } from "express"
import { Ingredient, IngredientSchema } from "../models/IngredientsModel.js"
import { checkToken } from "../middleware/checkToken.js"


const router = Router()

//! GET Ingredient
//http://localhost:7777/api/ingredients/get
router.get('/get', async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const ingredients = await Ingredient.find();
        res.status(200).json(ingredients);
    } catch (error: any) {
        console.error("GET /get error:", error)
        next(error)
    }
})


//! POST Ingredient
//http://localhost:7777/api/ingredients/add
router.post('/add', checkToken, async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const validatedData = IngredientSchema.parse(req.body);

        const existingIngredient = await Ingredient.findOne({ 
            name: { $regex: new RegExp(`^${validatedData.name.trim()}$`, 'i') } 
        });

        if (existingIngredient) {
            return next({
                status: 400,
                message: "Ingredient already exist"
            })
        }

        const newIngredient = new Ingredient(validatedData)
        const savedIngredient = await newIngredient.save()

        res.status(201).json(savedIngredient)
    } catch (error: any) {
        console.error("POST /add error:", error)
        next(error)
    }
})

//! PATCH Ingredient
//http://localhost:7777/api/ingredients/edit
router.patch('/edit', async(req: Request, res: Response, next: NextFunction)=>{
    try {
        
    } catch (error: any) {
        console.error("PATCH /edit error:", error)
        next(error)
    }
})

export default router