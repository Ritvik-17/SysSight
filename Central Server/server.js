import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import setupAgentSocket from "./sockets/agent-socket.js";

const PORT = process.env.PORT || 5000;
const DB_NAME = process.env.DB_NAME || "data";

async function startServer() {
  await connectDB(DB_NAME);

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });

  setupAgentSocket(io);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
