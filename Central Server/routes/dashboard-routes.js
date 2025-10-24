import express from "express";
import { getAgentData, getLatestAgentMetric, getAgentHistory,  getLatestAgents,getAgentUpdates} from "../controllers/dashboard-controller.js";

const router = express.Router();

router.get("/", getAgentData);
router.get("/:agentId/latest", getLatestAgentMetric);
router.get("/:agentId/history", getAgentHistory);
router.get("/latest", getLatestAgents);
router.get("/:agentId/updates", getAgentUpdates);

export default router;
