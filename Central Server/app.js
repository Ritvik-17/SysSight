
import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();
const DataFile = path.join(__dirname, "agent-data.json");

//check if file exists
if (!fs.existsSync(DataFile)) fs.writeFileSync(DataFile, "[]", "utf-8");


function readAgentData() {
  try {
    const raw = fs.readFileSync(DataFile, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read data file:", err);
    return [];
  }
}

function saveAgentData(data) {
  try {
    fs.writeFileSync(DataFile, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(" Failed to write data file:", err);
  }
}

//Routes
app.get("/", (_, res) => res.send("✅ Socket.IO server running!"));

app.get("/dashboard", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/agent-data", (_, res) => res.json(readAgentData()));

//Changed from Long Polling to Socket.IO
io.on("connection", (socket) => {
  console.log(`Agent connected: ${socket.id}`);

  socket.on("register_agent", (data) => {
    console.log("📋 Registered agent:", data);
    socket.data.agentId = data.agentId;
  });

socket.on("system_data", (payload) => {
  const timestamp = new Date().toISOString();


  const entry = {
    agentId: payload.agentId,
    hostname: payload.hostname || '-',
    cpuUsage: payload.cpuUsage || 0,
    memoryUsage: payload.memoryUsage || 0,
    diskUsage: payload.diskUsage || 0,
    netBytesSent: payload.netBytesSent || 0,
    netBytesRecv: payload.netBytesRecv || 0,
    load1: payload.load1 || 0,
    load5: payload.load5 || 0,
    load15: payload.load15 || 0,
    os: payload.os || '-',
    os_version: payload.os_version || '-',
    createdAt: timestamp
  };

  console.log("Received data:", entry);

  const allData = readAgentData();
  allData.push(entry);
  saveAgentData(allData);

  io.emit("dashboard_update", entry);
});


  socket.on("disconnect", () => {
    console.log(`Agent disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
