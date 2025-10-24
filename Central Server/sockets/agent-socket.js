import { agentsCollection, metricsCollection } from "../config/db.js";

const connectedAgents = new Map();

export default function setupAgentSocket(io) {
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Agent registers itself
    socket.on("register_agent", async (data) => {
      const { agentId, password } = data;
      if (password !== "1234") return socket.disconnect();

      socket.data.agentId = agentId;
      connectedAgents.set(agentId, socket); // <-- FIXED HERE ✅

      await agentsCollection.updateOne(
        { agentId },
        { $set: { agentId, status: "online", lastSeen: new Date(), socketId: socket.id } },
        { upsert: true }
      );

      console.log(`Agent registered: ${agentId}`);
    });

    // Agent sends system data periodically
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

    // Dashboard requests process data
    socket.on("view_processes", (agentId) => {
      console.log(`Requesting processes from agent: ${agentId}`);
      const agentSocket = connectedAgents.get(agentId);
      console.log("Found agent socket:", connectedAgents);
      if (agentSocket) {
        agentSocket.emit("send_processes"); // ✅ works now
      } else {
        console.warn(`Agent ${agentId} not found in connectedAgents`);
      }
    });

    // Agent sends process data → forward to dashboard
    socket.on("process_data", (data) => {
      console.log("Received process data from agent", data.agentId);
      io.emit("process_data", data);
    });

    socket.on("disconnect", async () => {
      if (socket.data.agentId) {
        connectedAgents.delete(socket.data.agentId);
        await agentsCollection.updateOne(
          { agentId: socket.data.agentId },
          { $set: { status: "offline", lastSeen: new Date() } }
        );
        console.log(`Agent disconnected: ${socket.data.agentId}`);
      }
    });
  });
}
