import { Router } from "express";
import { User } from "../models/User.js";
import { Conversation } from "../models/Conversation.js";

const router = Router();

router.get("/analytics", async (req, res) => {
  const userId = req.user_id;
  const role = req.role;

  if (!userId || !role) {
    return res.status(400).json({ success: false, message: "Invalid request" });
  }

  if (role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden, insufficient permissions" });
  }

  try {
    const supervisors = await User.find({ role: "supervisor" })
      .select("_id name")
      .lean();

    const data = await Promise.all(
      supervisors.map(async (sup) => {
        const agents = await User.find({ role: "agent", supervisorId: sup._id })
          .select("_id")
          .lean();

        const agentIds = agents.map((a) => a._id);

        const agentsCount = agentIds.length;

        const conversationsHandled =
          agentIds.length === 0
            ? 0
            : await Conversation.countDocuments({
                status: "closed",
                agentId: { $in: agentIds }
              });

        return {
          supervisorId: String(sup._id),
          supervisorName: sup.name,
          agents: agentsCount,
          conversationsHandled
        };
      })
    );

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Database Error" });
  }
});
