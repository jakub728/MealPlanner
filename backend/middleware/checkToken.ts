import { Router, type Request, type Response, type NextFunction } from 'express';
import jwt from "jsonwebtoken"

interface DecodedToken {
    id: string; 
    iat: number;
    exp: number;
}

export const checkToken = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        let token = req.cookies?.token;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }

        if (!token) {
            return next({status: 403, message: "You have to log in first"})
        }

        const decode = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;
        req.userId = decode.id

        next()
    } catch (error: any) {
        next({status: 403, message: error.message})
    }
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}