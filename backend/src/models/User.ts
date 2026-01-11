import mongoose, { mongo, Mongoose } from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum : ["admin", "supervisor", "agent", "candidate"],
    required: true
  },
  supervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  }
})  

export const User = mongoose.model("User", userSchema);