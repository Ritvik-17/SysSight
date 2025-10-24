import { agentsCollection, metricsCollection } from "../config/db.js";

const connectedAgents = new Map();

export default function setupAgentSocket(io) {
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("register_agent", async (data) => {
      const { agentId, password } = data;
      if (password !== "1234") return socket.disconnect();

      socket.data.agentId = agentId;
      connectedAgents.set(agentId, socket.id);

      await agentsCollection.updateOne(
        { agentId },
        { $set: { agentId, status: "online", lastSeen: new Date(), socketId: socket.id } },
        { upsert: true }
      );
    });

    socket.on("system_data", async (payload) => {
      const timestamp = new Date();
      const entry = { ...payload, createdAt: timestamp };

      await metricsCollection.insertOne(entry);
      await agentsCollection.updateOne(
        { agentId: entry.agentId },
        { $set: { hostname: entry.hostname, latestMetrics: entry, lastSeen: timestamp, status: "online" } },
        { upsert: true }
      );

      io.emit("dashboard_update", entry);
    });

    socket.on("request_processes", (data) => {
      const agentSocketId = connectedAgents.get(data.agentId);
      if (agentSocketId) io.to(agentSocketId).emit("request_processes", data);
      else socket.emit("processes_response", { agentId: data.agentId, error: "Agent not connected", processes: [] });
    });

    socket.on("processes_response", (data) => io.emit("processes_response", data));

    socket.on("disconnect", async () => {
      if (socket.data.agentId) {
        connectedAgents.delete(socket.data.agentId);
        await agentsCollection.updateOne({ agentId: socket.data.agentId }, { $set: { status: "offline", lastSeen: new Date() } });
      }
    });
  });
}
