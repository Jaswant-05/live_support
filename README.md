# 🛠️ Live Support Backend — Real-Time Customer Support System

A **production-style backend** for a real-time customer support platform built with **Node.js, Express, MongoDB, and WebSockets**.  
It supports secure authentication, role-based access control, ticket/conversation workflows, supervisor → agent assignment, admin analytics, and real-time chat.

---

## ✨ Features

### 🔐 Authentication & RBAC
- JWT-based authentication
- Role-based access control:
  - **Admin**
  - **Supervisor**
  - **Agent**
  - **Candidate**

### 🎫 Conversation Lifecycle
- Candidate can create a conversation (ticket)
- Supervisor assigns conversation to an agent
- Agent and candidate can join via WebSocket
- Agent can close conversation
- Conversation statuses:
  - `open`
  - `assigned`
  - `closed`

### 💬 Real-Time Messaging (WebSockets)
- WebSocket rooms per conversation
- Events:
  - `JOIN_CONVERSATION`
  - `SEND_MESSAGE`
  - `LEAVE_CONVERSATION`
  - `CLOSE_CONVERSATION`
- In-memory message storage while active
- Messages persisted to MongoDB when conversation is closed

### 📊 Admin Analytics
- Grouped by supervisor
- Shows:
  - Number of agents under each supervisor
  - Number of closed conversations handled by those agents

---

## 🧱 Tech Stack

- Node.js
- Express
- TypeScript
- MongoDB + Mongoose
- WebSocket (`ws`)
- JWT Authentication

---

## 🔑 Roles & Permissions

| Role | Capabilities |
|--------|-------------|
| Candidate | Create conversation, join chat, send messages |
| Agent | Join assigned conversation, send messages, close conversation |
| Supervisor | Assign agents to conversations, close open conversations |
| Admin | View all conversations, access analytics |

---

## 🔌 WebSocket Protocol

All WebSocket messages follow this format:

```json
{
  "event": "EVENT_NAME",
  "data": {}
}


| Event               | Direction       | Description                     |
| ------------------- | --------------- | ------------------------------- |
| JOIN_CONVERSATION   | Client → Server | Join conversation room          |
| SEND_MESSAGE        | Client → Server | Send chat message               |
| LEAVE_CONVERSATION  | Client → Server | Leave conversation              |
| CLOSE_CONVERSATION  | Client → Server | Close conversation (agent only) |
| NEW_MESSAGE         | Server → Client | New message broadcast           |
| CONVERSATION_CLOSED | Server → Client | Conversation closed broadcast   |
