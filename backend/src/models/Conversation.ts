import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true 
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false 
  },
  supervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum : ["open", "assigned", "closed"],
    required: true
  },
  createdAt: {
    type : Date,
    required: true
  }
})

export const Conversation = mongoose.model("Conversation", conversationSchema);

