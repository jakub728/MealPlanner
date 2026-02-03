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
import { sendResetPasswordEmail } from "../utilities/resetPasswordEmail.js";

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

    res.status(200)
      .send(`<div style="font-family: sans-serif; text-align: center; padding: 50px;">
    <h1 style="color: #4CAF50;">Sukces! 🎉</h1>
    <p style="font-size: 18px; color: #333;">Twoje konto zostało pomyślnie zweryfikowane.</p>
    <p>Możesz teraz wrócić do aplikacji i się zalogować.</p>
    <div style="margin-top: 30px;">
      <span style="font-size: 50px;">🥗</span>
    </div>
  </div>`);

    //res.redirect("https://mealplanner-bg.up.railway.app/login");   przekierowanie do aplikacji frontowej
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

//! GET Reset password
// http://localhost:7777/api/auth/reset-password
router.get("/reset-password", async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.status(400).send("Token wygasł lub jest błędny.");
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #FF6347;">Link wygasł ❌</h1>
        <p>Link do resetowania hasła jest nieprawidłowy lub stracił ważność (60 min).</p>
        <a href="/" style="color: #FF6347;">Wróć do strony głównej</a>
      </div>
    `);
  }

  // Zwracamy ładny HTML z formularzem
  res.send(`
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resetowanie hasła | Meal Planner</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background-color: #f9f9f9; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); width: 100%; max-width: 400px; text-align: center; }
        h1 { color: #FF6347; margin-bottom: 10px; }
        p { color: #666; font-size: 14px; margin-bottom: 30px; }
        input { width: 100%; padding: 12px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 10px; box-sizing: border-box; font-size: 16px; }
        button { width: 100%; padding: 15px; background-color: #FF6347; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 16px; transition: background 0.3s; }
        button:hover { background-color: #e5533d; }
        .footer { margin-top: 20px; font-size: 12px; color: #aaa; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Nowe hasło 🥗</h1>
        <p>Wprowadź nowe, silne hasło dla swojego konta.</p>
        <form action="/api/auth/reset-password-submit" method="POST">
          <input type="hidden" name="token" value="${token}">
          <input type="password" name="password" placeholder="Twoje nowe hasło" required minlength="6">
          <input type="password" placeholder="Powtórz hasło" required minlength="6">
          <button type="submit">Zmień hasło</button>
        </form>
        <div class="footer">Meal Planner Team © 2024</div>
      </div>
      <script>
        const form = document.querySelector('form');
        form.onsubmit = (e) => {
          const pass = form.querySelectorAll('input[type="password"]');
          if (pass[0].value !== pass[1].value) {
            e.preventDefault();
            alert('Hasła nie są identyczne!');
          }
        };
      </script>
    </body>
    </html>
  `);
});

//! POST Forgot Password
// http://localhost:7777/api/auth/forgot-password
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        message: "Jeśli e-mail istnieje w bazie, link został wysłany.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600 * 1000); // 1h

    await user.save();

    await sendResetPasswordEmail(user.email, resetToken);

    res.status(200).json({
      message: "Link do resetowania hasła został wysłany na Twój e-mail",
    });
  } catch (error) {
    next(error);
  }
});

//! POST Reset Password
// http://localhost:7777/api/auth/reset-password-submit
router.post("/reset-password-submit", async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).send("Token wygasł lub jest błędny.");
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).send("Token wygasł lub jest błędny.");
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    user.set("resetPasswordToken", undefined);
    user.set("resetPasswordExpires", undefined);

    await user.save();

    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #4CAF50;">Hasło zmienione! 🎉</h1>
        <p>Twoje hasło zostało pomyślnie zaktualizowane. Możesz teraz zalogować się w aplikacji.</p>
        <div style="font-size: 50px; margin-top: 20px;">🥗</div>
      </div>
    `);
  } catch (error) {
    next(error);
  }
});

export default router;
