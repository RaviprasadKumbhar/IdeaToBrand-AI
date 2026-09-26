import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { validateEnvironment } from "@foil/shared";
import { exportRouter } from "./routes/export.js";
import { stagesRouter } from "./routes/stages.js";
import { scenarioProbeRouter } from "./routes/scenarioProbe.js";
import { auditRouter } from "./routes/audit.js";

dotenv.config();

const envResult = validateEnvironment(process.env);
if (!envResult.valid) {
  console.warn("Environment validation warnings/errors:", envResult.errors);
}

export const app = express();
const PORT = envResult.config?.PORT || parseInt(process.env.PORT || "5000", 10);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "healthy", service: "FOIL Backend API", timestamp: new Date().toISOString() });
});

// Mount routes
app.use("/api", exportRouter);
app.use("/api", auditRouter);
app.use("/api", scenarioProbeRouter);
app.use("/api", stagesRouter);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`FOIL Backend API running on port ${PORT}`);
  });
}

