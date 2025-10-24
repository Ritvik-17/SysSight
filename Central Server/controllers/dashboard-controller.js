import { metricsCollection, agentsCollection } from "../config/db.js";

// Fetch latest 100 metrics
export const getAgentData = async (req, res) => {
  try {
    const data = await metricsCollection.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    res.json(data);
  } catch (err) {
    console.error("Error fetching metrics:", err.message);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
};

// Latest metric for one agent
export const getLatestAgentMetric = async (req, res) => {
  try {
    const { agentId } = req.params;
    const latestMetric = await metricsCollection.find({ agentId })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (!latestMetric.length) return res.status(404).json({ error: "No metrics found" });
    res.json(latestMetric[0]);
  } catch (err) {
    console.error("Error fetching latest metrics:", err);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
};

// History metrics for one agent
export const getAgentHistory = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { timeRange = "1h", limit = 100 } = req.query;

    const now = new Date();
    let startTime = new Date(now);

    switch (timeRange) {
      case "1h": startTime = new Date(now - 60 * 60 * 1000); break;
      case "6h": startTime = new Date(now - 6 * 60 * 60 * 1000); break;
      case "24h": startTime = new Date(now - 24 * 60 * 60 * 1000); break;
      case "7d": startTime = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      default: startTime = new Date(now - 60 * 60 * 1000);
    }

    const metrics = await metricsCollection.find({
      agentId,
      createdAt: { $gte: startTime }
    }).sort({ createdAt: 1 }).limit(parseInt(limit)).toArray();

    res.json(metrics);
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};


export const getLatestAgents = async (req, res) => {
  try {
    // Get the latest document for each agentId
    const result = await metricsCollection.aggregate([
      { $sort: { createdAt: -1 } }, // newest first
      { $group: { _id: "$agentId", latest: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$latest" } }
    ]).toArray();

    const now = new Date();

    const agents = result.map(agent => ({
      agentId: agent.agentId,
      hostname: agent.hostname || "-",
      os: agent.os || "-",
      lastUpdated: agent.createdAt,
      status: (now - new Date(agent.createdAt)) < 20000 ? "Online" : "Offline" // within 20s = online
    }));

    res.json(agents);
  } catch (err) {
    console.error("Error fetching latest agents:", err);
    res.status(500).json({ error: "Failed to fetch latest agents" });
  }
};

export const getAgentUpdates = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { after } = req.query; // timestamp in ISO string or milliseconds

    if (!after) return res.status(400).json({ error: "Missing 'after' query parameter" });

    const afterDate = new Date(after);

    const metrics = await metricsCollection.find({
       agentId: { $regex: `^${agentId}$`, $options: "i" }, 
      createdAt: { $gt: afterDate }
    }).sort({ createdAt: 1 }).toArray(); // oldest first

    res.json(metrics);
  } catch (err) {
    console.error("Error fetching agent updates:", err);
    res.status(500).json({ error: "Failed to fetch agent updates" });
  }
};