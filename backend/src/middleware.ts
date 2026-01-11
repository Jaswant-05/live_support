import type { NextFunction, Request, Response } from "express";
import type { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
type Client = { 
  userId: string
};

type JwtPayload = {
  userId: string;
};

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token" });
    }

    const token = auth.split(" ")[1];

    if (!process.env.JWT_SECRET || !token) {
      return res.status(500).json({ success: false, message: "Server config error" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

    req.user_id = decoded.userId;

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

export function authenticate(
  req: IncomingMessage,
  cb: (err: Error | null, client?: Client) => void
){
  // const auth = req.headers.authorization;

  // if (!auth?.startsWith("Bearer ")) return cb(new Error("No token"));
  // const token = auth.split(" ")[1];
  // if(!token || !process.env.JWT_SECRET){
  //   return cb(new Error("No token"));
  // }

  // const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  // if(typeof decoded === 'string' || !decoded){
  //   return cb(new Error("Invalid token"));
  // }

  // const userId = decoded.userId;

  return cb(null, { userId : "123" });
}