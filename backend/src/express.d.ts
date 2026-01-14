import Express from "express";
import type WebSocket from "ws";

declare global {
  namespace Express { 
    interface Request {
      user_id?: string,
      role?: "admin" | "supervisor" | "agent" | "candidate"
    }
  }
}

declare module "ws" {
  interface WebSocket {
    user?: {
      user_id: string,
      role: "admin" | "supervisor" | "agent" | "candidate"
    },
    rooms: Set
  }
}
