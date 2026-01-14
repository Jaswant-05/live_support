import type WebSocket from "ws";

export type Incoming_ws =
  { event: "JOIN_CONVERSATION"; data: { conversationId: string } }
  | { event: "SEND_MESSAGE"; data: { conversationId: string; content: string } }
  | { event: "LEAVE_CONVERSATION"; data: { conversationId: string } }
  | { event: "CLOSE_CONVERSATION"; data: { conversationId: string } };
