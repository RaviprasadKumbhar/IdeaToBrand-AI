import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { validateEnvironment } from "@foil/shared";
import { exportRouter } from "./routes/export.js";
import { stagesRouter } from "./routes/stages.js";

dotenv.config();

const envResult = validateEnvironment(process.env);
if (!envResult.valid) {
  console.warn("Environment validation warnings/errors:", envResult.errors);
}

export const app = express();
const PORT = envResult.config?.PORT || parseInt(process.env.PORT || "5000", 10);

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "healthy", service: "FOIL Backend API", timestamp: new Date().toISOString() });
});

// Mount routes
app.use("/api", exportRouter);
app.use("/api", stagesRouter);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`FOIL Backend API running on port ${PORT}`);
  });
}
