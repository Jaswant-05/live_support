import { Router } from "express"
import { Conversation } from "../models/Conversation.js";
import { User } from "../models/User.js";
import mongoose from "mongoose";
const router = Router();

router.post("/", async (req, res) => {
  const userId = req.user_id;
  const role = req.role;
  const supervisorId = req.body.supervisorId;

  if (!supervisorId || !role || !userId) {
    return res.status(400).json({
      success: false,
      message: "Invalid request schema"
    });
  }

  // Only a candiate can start a new conversation
  if (role !== "candidate") {
    return res.status(403).json({
      success: false,
      message: "Forbidden, insufficient permissions"
    })
  }

  try {
    // Check to make sure a candiate only has a single active conversation
    const existingConversations = await Conversation.find({
      candidateId: userId,
      status: { $in: ["open", "assigned"] }
    });

    if (existingConversations) {
      return res.status(404).json({
        success: false,
        error: "Candidate already has an active conversation"
      })
    };

    //Create the Db record
    const conversation = await Conversation.create({
      candidateId: userId,
      supervisorId,
      status: "open",
      createdAt: Date.now()
    });

    if (!conversation) {
      return res.status(500).json({
        success: false,
        message: "Database Error"
      })
    }

    //Send the valid Response
    res.status(201).json({
      success: true,
      data: {
        _id: conversation._id,
        status: conversation.status,
        supervisorId: conversation.supervisorId
      }
    });

  }

  catch (e) {
    if (e instanceof Error) {
      return res.status(500).json({
        success: false,
        message: "Database Error"
      })
    }
  }

});

// {
//   "agentId": "a101"
// }
router.post("/:id/assign", async (req, res) => {
  const userId = req.user_id;
  const role = req.role;
  const conversationId = req.params.id;
  const agentId = req.body.agentId;

  if (!userId || !role || !agentId || !conversationId) {
    return res.status(400).json({ success: false, message: "Invalid request schema" });
  }

  if (role !== "supervisor") {
    return res.status(403).json({ success: false, message: "Forbidden, insufficient permissions" });
  }

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    if (conversation.status === "closed") {
      return res.status(400).json({ success: false, message: "Conversation already closed" });
    }

    // Ensure the supervisor owns this conversation
    if (!conversation.supervisorId.equals(userId)) {
      return res.status(403).json({ success: false, message: "Not your conversation" });
    }

    const agent = await User.findById(agentId);
    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }

    if (agent.role !== "agent") {
      return res.status(400).json({ success: false, message: "User is not an agent" });
    }

    if (!agent.supervisorId?.equals(conversation.supervisorId)) {
      return res.status(403).json({ success: false, message: "Agent doesn't belong to you" });
    }

    conversation.agentId = agent._id;
    await conversation.save();

    return res.status(200).json({ success: true, data: conversation });
  } catch {
    return res.status(500).json({ success: false, message: "Database Error" });
  }
});


router.get("/:id", async(req, res) => {

});

router.post("/:id/close", async (req, res) => {
  const userId = req.user_id;
  const role = req.role;
  const conversationId = req.params.id;

  if (!userId || !role || !conversationId) {
    return res.status(400).json({
      success: false,
      message: "Invalid request"
    });
  }

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid conversation id"
    });
  }

  if (role !== "admin" && role !== "supervisor") {
    return res.status(403).json({
      success: false,
      message: "Forbidden, insufficient permissions"
    });
  }

  try {
    // fetch convo
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }

    // supervisor can only close their own conversations
    if (role === "supervisor" && !conversation.supervisorId.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden"
      });
    }

    // must be open before closing
    if (conversation.status !== "open") {
      return res.status(400).json({
        success: false,
        message: `Conversation status must be "open" to close (current: "${conversation.status}")`
      });
    }

    conversation.status = "closed";
    await conversation.save();

    return res.status(200).json({
      success: true,
      data: {
        conversationId: String(conversation._id),
        status: conversation.status
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Database error"
    });
  }
});