import WebSocket from "ws";
import type { Incoming_ws } from "../types/ws.js";
import { MessageStore } from "./messagesStore.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";

export class RoomStore {
  rooms = new Map<string, Set<WebSocket>>()
  private static instance: RoomStore;

  private constructor() { }

  static getInstance() {
    if (!RoomStore.instance) {
      RoomStore.instance = new RoomStore();
    }

    return RoomStore.instance;
  }

  handleEvent(ws: WebSocket, data: WebSocket.RawData) {
    let incoming_data: Incoming_ws;

    try {
      incoming_data = JSON.parse(data.toString());
    }
    catch {
      return ws.send(JSON.stringify({ event: "ERROR", data: {} }));
    }

    if (!incoming_data?.event || typeof incoming_data.event !== "string" || typeof incoming_data.data !== "object") {
      return ws.send(JSON.stringify({ event: "ERROR", data: {} }));
    }

    switch (incoming_data.event) {
      case ("JOIN_CONVERSATION"):
        this.joinConversation(ws, incoming_data.data);
        break;
      case ("SEND_MESSAGE"):
        this.sendMessage(ws, incoming_data.data);
        break;
      case ("CLOSE_CONVERSATION"):
        this.closeConversation(ws, incoming_data.data);
        break;
      case ("LEAVE_CONVERSATION"):
        this.leaveConversation(ws, incoming_data.data);
        break;
      default:
        ws.send(JSON.stringify({ event: "ERROR", data: { message: "Unknown_event" } }))
    }
  }

  //Event 1 JOIN_Conversation
  async joinConversation(ws: WebSocket, data: { conversationId: string }) {
    // Check candidate owns the conversation else error with not allowed message
    if (ws.user?.role !== "candidate" && ws.user?.role !== "agent") {
      return ws.send(JSON.stringify({ event: "ERROR", data: { message: "" } }))
    }

    if (ws.user.role === "candidate") {
      try {
        const conversation = await Conversation.findOne({ _id: data.conversationId });
        if (!conversation) {
          return ws.send(JSON.stringify({ event: "ERROR", data: { message: "" } }))
        }

        if (conversation.candidateId.toString() !== ws.user.user_id!) {
          return ws.send(JSON.stringify({ event: "ERROR", data: { message: "Not allowed" } }))
        }
      }
      catch {
        return ws.send(JSON.stringify({ event: "ERROR", data: { message: "Unkown Error" } }))
      }
    }

    if (ws.user.role === "agent") {
      try {
        const conversation = await Conversation.findOne({ _id: data.conversationId });
        if (!conversation) {
          return ws.send(JSON.stringify({ event: "ERROR", data: { message: "" } }))
        }

        if (conversation.agentId?.toString() !== ws.user.user_id) {
          return ws.send(JSON.stringify({ event: "ERROR", data: { message: "Not allowed" } }))
        }

        if (conversation.status === "closed") {
          return ws.send(JSON.stringify({ event: "ERROR", data: { message: "Conversation already closed" } }));
        }

        if (conversation.status === "open") {
          conversation.status = "assigned";
          await conversation.save();
        }
      }
      catch {
        return ws.send(JSON.stringify({ event: "ERROR", data: { message: "Unkown Error" } }))
      }
    }
    // Create room if not exists
    const room = this.ensureRoom(data.conversationId);
    room.add(ws);
    ws.rooms.add(data.conversationId);

    // Add socket to room
    const messages = MessageStore.getInstance().messages;

    // Initialize in-memory message array if not exists
    if (!messages.get(data.conversationId)) {
      messages.set(data.conversationId, []);
    }

    return ws.send(
      JSON.stringify({
        event: "JOINED_CONVERSATION",
        data: { conversationId: data.conversationId, status: "assigned" }
      })
    );

  }
  // Event 2: SEND_MESSAGE
  sendMessage(ws: WebSocket, data: { conversationId: string; content: string }) {
    // Role check
    if (ws.user?.role !== "candidate" && ws.user?.role !== "agent") {
      return ws.send(JSON.stringify({ event: "ERROR", data: { message: "Not allowed" } }));
    }

    const { conversationId, content } = data;

    if (!conversationId || typeof conversationId !== "string") {
      return ws.send(JSON.stringify({ event: "ERROR", data: { message: "conversationId required" } }));
    }

    if (!content || typeof content !== "string") {
      return ws.send(JSON.stringify({ event: "ERROR", data: { message: "content required" } }));
    }

    // Must have joined the room
    if (!ws.rooms?.has(conversationId)) {
      return ws.send(JSON.stringify({
        event: "ERROR",
        data: { message: "You have not joined this conversation" }
      }));
    }

    // Create message
    const message = {
      conversationId,
      senderId: ws.user.user_id,
      senderRole: ws.user.role,
      content,
      createdAt: new Date().toISOString()
    };

    // Save in memory
    const store = MessageStore.getInstance().messages;
    if (!store.get(conversationId)) {
      store.set(conversationId, []);
    }
    store.get(conversationId)!.push(message);

    // Broadcast to everyone except sender
    this.broadcast(
      conversationId,
      { event: "NEW_MESSAGE", data: message },
      ws
    );
  }

  //Event 3: LEAVE_CONVERSATION
  leaveConversation(ws: WebSocket, data: { conversationId: string}) {
    // Role check
    if (ws.user?.role !== "candidate" && ws.user?.role !== "agent") {
      return ws.send(JSON.stringify({ event: "ERROR", data: { message: "Not allowed" } }));
    }
    const conversationId = data.conversationId;

    if (!ws.rooms?.has(conversationId)) {
      return ws.send(JSON.stringify({
        event: "ERROR",
        data: { message: "You are not in this conversation" }
      }));
    }

    const room = this.rooms.get(conversationId);
    if (room) {
      room.delete(ws);

      // Delete room if empty
      if (room.size === 0) {
        this.rooms.delete(conversationId);
      }
    }

    // Remove from socket's joined rooms
    ws.rooms.delete(conversationId);

    return ws.send(JSON.stringify({
      event: "LEFT_CONVERSATION",
      data: { conversationId }
    }));
  }

  // Event 4: CLOSE_CONVERSATION
  async closeConversation(ws: WebSocket, data: { conversationId: string }) {
    // Agent only
    if (ws.user?.role !== "agent") {
      return ws.send(JSON.stringify({ event: "ERROR", data: { message: "Not allowed" } }));
    }

    const { conversationId } = data;

    if (!conversationId || typeof conversationId !== "string") {
      return ws.send(JSON.stringify({ event: "ERROR", data: { message: "conversationId required" } }));
    }

    // Verify agent assigned and verify status
    let conversation;
    try {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return ws.send(JSON.stringify({ event: "ERROR", data: { message: "Conversation not found" } }));
      }

      if (conversation.agentId?.toString() !== ws.user.user_id) {
        return ws.send(JSON.stringify({ event: "ERROR", data: { message: "Not allowed" } }));
      }

      if (conversation.status === "open") {
        return ws.send(JSON.stringify({ event: "ERROR", data: { message: "Conversation not yet assigned" } }));
      }

      if (conversation.status === "closed") {
        return ws.send(JSON.stringify({ event: "ERROR", data: { message: "Conversation already closed" } }));
      }

    } catch {
      return ws.send(JSON.stringify({ event: "ERROR", data: { message: "Unknown Error" } }));
    }

    // Save all in-memory messages to MongoDB 
    const memStore = MessageStore.getInstance().messages;
    const memMessages = memStore.get(conversationId) ?? [];

    try {
      if (memMessages.length > 0) {
        // Convert to DB shape
        const docs = memMessages.map((m: any) => ({
          conversationId,
          senderId: m.senderId,
          senderRole: m.senderRole,
          content: m.content,
          createdAt: new Date(m.createdAt)
        }));

        await Message.insertMany(docs, { ordered: true });
      }

      // Update conversation status to "closed"
      conversation.status = "closed";
      await conversation.save();
    } catch {
      return ws.send(JSON.stringify({ event: "ERROR", data: { message: "Failed to close conversation" } }));
    }

    // Broadcast closure to room
    this.broadcast(
      conversationId,
      { event: "CONVERSATION_CLOSED", data: { conversationId } },
      ws
    );

    // Remove all sockets from room
    const room = this.rooms.get(conversationId);
    if (room) {
      for (const sock of room) {
        sock.rooms?.delete(conversationId);
      }
    }

    // Delete room from memory
    this.rooms.delete(conversationId);

    // 8) Delete in-memory messages
    memStore.delete(conversationId);

    return ws.send(JSON.stringify({ event: "CLOSED_CONVERSATION", data: { conversationId } }));
  }


  private broadcast(
    conversationId: string,
    payload: any,
    exclude?: WebSocket
  ) {
    const room = this.rooms.get(conversationId);
    if (!room) return;

    const message = JSON.stringify(payload);

    for (const sock of room) {
      if (exclude && sock === exclude) continue;
      if (sock.readyState !== WebSocket.OPEN) continue;

      sock.send(message);
    }
  }

  private ensureRoom(conversationId: string) {
    let room = this.rooms.get(conversationId);
    if (!room) {
      room = new Set<WebSocket>();
      this.rooms.set(conversationId, room);
    }
    return room;
  }
}

