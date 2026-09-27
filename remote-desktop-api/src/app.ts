import express from "express";
import cors from "cors";
import pcRoutes from "./routes/pc.routes";
import networkRoutes from "./routes/network.routes";
import browserSessionRoutes from "./routes/browser-session.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Remote Desktop API is running",
  });
});

app.use("/api/remote-pcs", pcRoutes);

app.use("/api/network", networkRoutes);
app.use("/api/browser-sessions", browserSessionRoutes);
export default app;
