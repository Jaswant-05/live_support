import Express from "express";

declare global {
  namespace Express { 
    interface Request {
      user_id?: string,
      role?: "admin" | "supervisor" | "agent" | "candidate"
    }
  }
}
