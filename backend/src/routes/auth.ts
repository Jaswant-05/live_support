import { Router, type Request, type Response } from "express";
import { userLoginSchema, userSignUpSchema, type UserSignUp } from "../types/user.js";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js"
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { authMiddleware } from "../middleware.js";
import { success } from "zod";

const router = Router();
dotenv.config();

router.post("/signup", async (req: Request, res: Response) => {
  const { data, error } = userSignUpSchema.safeParse(req.body);
  if (!data || error) {
    return res.status(400).json({
      success: false,
      message: "Invalid request schema"
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    let payload = {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role
    };

    const result = await User.create({
      ...payload,
      supervisorId: data.supervisorId ? new mongoose.Types.ObjectId(data.supervisorId) : null
    });

    res.json({
      success: true,
      data: {
        _id: result._id,
        name: result.name,
        email: result.email,
        role: result.role
      }
    });
  }
  catch (e) {
    if (e instanceof Error) {
      res.status(500).json({
        success: false,
        message: "Bad Request"
      })
    }
  }
})

router.post("/login", async (req: Request, res: Response) => {
  const { data, error } = userLoginSchema.safeParse(req.body);
  if (!data || error) {
    return res.status(400).json({
      success: false,
      message: "Invalid request schema"
    });
  }

  try {
    const user = await User.findOne({
      email: data.email
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    const isPasswordValid = await bcrypt.compare(data.password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }
    const JWT_SECRET = process.env.JWT_SECRET!;
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET);

    res.json({
      success: true,
      data: {
        token
      }
    });

  }
  catch (e) {
    if (e instanceof Error) {
      res.status(500).json({
        success: false,
        message: "Bad Request"
      })
    }
  }
})

router.get("/me", authMiddleware, async(req: Request, res: Response) => {
  const userId = req.user_id!;

  try {
    const user = await User.findOne({
      _id : userId
    });

    if(!user){
      return res.status(404).json({
        success: false,
        message: "User not found"
      })
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
      }
    })
  }
  catch (e) {
    if (e instanceof Error) {
      res.status(500).json({
        success: false,
        message: "Bad Request"
      })
    }
  }
}) 