import { Router, type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'
import User, { UserRegistrationSchema } from '../models/UserModel.js';
import { checkToken } from '../middleware/checkToken.js';


const router = Router();


//! GET Me
//http://localhost:7777/api/auth/me
router.get('/me', checkToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        
        if (!user) {
            return next({ status: 404, message: "User not found" });
        }

        res.status(200).json(user);
    } catch (error: any) {
        next(error)
    }
});



//! POST Register
//http://localhost:7777/api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validatedData = UserRegistrationSchema.parse(req.body);

        const { name, email, password } = validatedData;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return next({ status: 400, message: "User with this email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ message: "User created successfully" });
    } catch (error: any) {
        next(error)
    }
});


//! POST Login
//http://localhost:7777/api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return next({ status: 400, message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return next({ status: 400, message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET as string, 
            { expiresIn: '7d' }
        );

        res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error: any) {
        next(error);
    }
});

export default router;