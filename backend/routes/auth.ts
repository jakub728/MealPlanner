import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import User, { UserRegistrationSchema } from "../models/UserModel.js";
import { checkToken } from "../middleware/checkToken.js";
import { sendVerificationEmail } from "../utilities/verificationEmail.js";

const router = Router();

//! GET User by id
//http://localhost:7777/api/auth/me
router.get(
  "/me",
  checkToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await User.findById(req.userId).select("-password");

      if (!user) {
        return next({ status: 404, message: "User not found" });
      }

      res.status(200).json(user);
    } catch (error: any) {
      next(error);
    }
  },
);

//! POST Register
//http://localhost:7777/api/auth/register
router.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = UserRegistrationSchema.parse(req.body);

      const userExists = await User.findOne({ email: validatedData.email });
      if (userExists) {
        return next({
          status: 400,
          message: "User with this email already exists",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(validatedData.password, salt);

      const verificationToken = crypto.randomBytes(32).toString("hex");

      const newUser = new User({
        ...validatedData,
        password: hashedPassword,
        verificationToken,
        verified: false,
        expireAt: new Date(Date.now() + 47 * 60 * 60 * 1000),
      });

      await newUser.save();

      sendVerificationEmail(newUser.email, verificationToken).catch(
        console.error,
      );

      res.status(201).json({
        message: "User registered! Please check your email to verify account",
      });
    } catch (error: any) {
      next(error);
    }
  },
);

//! GET Verify Token
//http://localhost:7777/api/auth/verify/:token
router.get("/verify/:token", async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return next({ status: 400, message: "Invalid or expired token" });
    }

    user.verified = true;
    user.verificationToken = "";
    user.set("expireAt", undefined);

    await user.save();

    res
      .status(200)
      .send("<h1>Email verified successfully! You can now log in.</h1>");
  } catch (error) {
    next(error);
  }
});

//! POST Login
//http://localhost:7777/api/auth/login
router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });

      if (!user) {
        return next({ status: 400, message: "User not found" });
      }

      if (!user.verified) {
        return next({
          status: 401,
          message:
            "Please verify your email address before logging in. Your account will expire in 48h if not verified",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return next({ status: 400, message: "Invalid email or password" });
      }

      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" },
      );

      res.status(200).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error: any) {
      next(error);
    }
  },
);

export default router;
