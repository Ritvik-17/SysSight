import express from "express";
import cors from "cors";
import path from "path";
import DashBoardRoutes from "./routes/dashboard-routes.js";

const app = express();
const __dirname = path.resolve();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_, res) => res.send("Central Server Running!"));

app.use("/api/agents", DashBoardRoutes);

export default app;
