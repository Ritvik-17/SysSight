import express from "express";
import http from "http";
import { Server } from "socket.io";
import { MongoClient, ServerApiVersion } from "mongodb";
import path from "path";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 5000;
const DB_NAME = process.env.DB_NAME;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;
let metricsCollection;
let agentsCollection;


const __dirname = path.resolve();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));



async function connectDB() {
  try {
    console.log("🔄 Connecting to MongoDB Atlas...");
    await client.connect();


    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB connected");


    db = client.db(DB_NAME);
    metricsCollection = db.collection("metrics");
    agentsCollection = db.collection("agents");


    await metricsCollection.createIndex({ agentId: 1, createdAt: -1 });
    await metricsCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days
    await agentsCollection.createIndex({ agentId: 1 }, { unique: true });

    console.log(`Database ready: ${DB_NAME}`);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

// === Routes ===
app.get("/", (_, res) => res.send("Central Server Running!"));

app.get("/dashboard", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});



app.get("/agent-data", async (req, res) => {
  try {

    const data = await metricsCollection
      .find({})
      .sort({ createdAt: -1 }) // newest first
      .limit(100)
      .toArray();

    res.json(data);
  } catch (err) {
    console.error("Error fetching metrics:", err.message);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});



app.get("/api/agents/:agentId/latest", async (req, res) => {
  try {
    const { agentId } = req.params;
    const latestMetric = await metricsCollection
      .find({ agentId })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (latestMetric.length === 0) {
      return res.status(404).json({ error: "No metrics found" });
    }

    res.json(latestMetric[0]);
  } catch (err) {
    console.error("❌ Error fetching latest metrics:", err);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});


app.get("/api/agents/:agentId/history", async (req, res) => {
  try {
    const { agentId } = req.params;
    const { timeRange = "1h", limit = 100 } = req.query;


    const now = new Date();
    let startTime = new Date();
    
    switch (timeRange) {
      case "1h":
        startTime = new Date(now - 60 * 60 * 1000);
        break;
      case "6h":
        startTime = new Date(now - 6 * 60 * 60 * 1000);
        break;
      case "24h":
        startTime = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now - 60 * 60 * 1000);
    }

    const metrics = await metricsCollection
      .find({
        agentId,
        createdAt: { $gte: startTime }
      })
      .sort({ createdAt: 1 })
      .limit(parseInt(limit))
      .toArray();

    res.json(metrics);
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});


const connectedAgents = new Map(); 

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("register_agent", async (data) => {
    const { agentId, password } = data;


    if (password !== "1234") {
      console.log(`❌ Invalid password for agent: ${agentId}`);
      socket.disconnect();
      return;
    }

    console.log(`Registered agent: ${agentId}`);
    socket.data.agentId = agentId;
    connectedAgents.set(agentId, socket.id);


    try {
      await agentsCollection.updateOne(
        { agentId },
        {
          $set: {
            agentId,
            status: "online",
            lastSeen: new Date(),
            socketId: socket.id
          }
        },
        { upsert: true }
      );
    } catch (err) {
      console.error("❌ Error updating agent status:", err);
    }
  });

  socket.on("system_data", async (payload) => {
    const timestamp = new Date();

    const entry = {
      agentId: payload.agentId,
      hostname: payload.hostname || "-",
      cpuUsage: payload.cpuUsage || 0,
      memoryUsage: payload.memoryUsage || 0,
      diskUsage: payload.diskUsage || 0,
      netBytesSent: payload.netBytesSent || 0,
      netBytesRecv: payload.netBytesRecv || 0,
      netSentRate: payload.netSentRate || 0,
      netRecvRate: payload.netRecvRate || 0,
      load1: payload.load1 || 0,
      load5: payload.load5 || 0,
      load15: payload.load15 || 0,
      os: payload.os || "-",
      os_version: payload.os_version || "-",
      createdAt: timestamp
    };

    console.log(`Received data from ${entry.agentId}: CPU=${entry.cpuUsage}%`);

    try {

      await metricsCollection.insertOne(entry);

      await agentsCollection.updateOne(
        { agentId: entry.agentId },
        {
          $set: {
            hostname: entry.hostname,
            latestMetrics: {
              cpuUsage: entry.cpuUsage,
              memoryUsage: entry.memoryUsage,
              diskUsage: entry.diskUsage,
              netSentRate: entry.netSentRate,
              netRecvRate: entry.netRecvRate,
              load1: entry.load1
            },
            lastSeen: timestamp,
            status: "online"
          }
        },
        { upsert: true }
      );


      io.emit("dashboard_update", entry);
    } catch (err) {
      console.error("❌ Error saving metrics:", err);
    }
  });

  socket.on("request_processes", (data) => {
    const { agentId } = data;
    const agentSocketId = connectedAgents.get(agentId);

    if (agentSocketId) {

      io.to(agentSocketId).emit("request_processes", data);
      console.log(`📋 Requested processes from agent: ${agentId}`);
    } else {
      console.log(`❌ Agent not connected: ${agentId}`);
      socket.emit("processes_response", {
        agentId,
        error: "Agent not connected",
        processes: []
      });
    }
  });

  socket.on("processes_response", (data) => {
    console.log(`📋 Received ${data.processes?.length || 0} processes from ${data.agentId}`);

    io.emit("processes_response", data);
  });

  socket.on("disconnect", async () => {
    console.log(`🔴 Client disconnected: ${socket.id}`);


    if (socket.data.agentId) {
      connectedAgents.delete(socket.data.agentId);
      try {
        await agentsCollection.updateOne(
          { agentId: socket.data.agentId },
          { $set: { status: "offline", lastSeen: new Date() } }
        );
      } catch (err) {
        console.error("Error updating agent status:", err);
      }
    }
  });
});


connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
  });
});