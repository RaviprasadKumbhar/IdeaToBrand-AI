import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { validateEnvironment } from "@foil/shared";
import { exportRouter } from "./routes/export.js";
import { stagesRouter } from "./routes/stages.js";
import { scenarioProbeRouter } from "./routes/scenarioProbe.js";
import { auditRouter } from "./routes/audit.js";
import { interviewRouter } from "./routes/interview.js";

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
app.use("/api", interviewRouter);

// 404 handler for unmapped routes
app.use((req, res) => {
  res.status(404).json({
    error_type: "not_found",
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || err.statusCode || (err instanceof SyntaxError && "body" in err ? 400 : 500);
  const message = err.message || "Internal server error";
  res.status(status).json({
    error_type: err.error_type || (status === 400 ? "bad_request" : "internal_server_error"),
    message,
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`FOIL Backend API running on port ${PORT}`);
  });
}

