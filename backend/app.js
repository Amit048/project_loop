import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import authRoutes from "./src/routes/authRoutes.js";
import workspaceRoutes from "./src/routes/workspaceRoutes.js";
import feedbackRoutes from "./src/routes/feedbackRoutes.js";
import themeRoutes from "./src/routes/themeRoutes.js";
import insightsRoutes from "./src/routes/insightsRoutes.js";
import reportRoutes from "./src/routes/reportRoutes.js";
import { errorHandler } from "./src/middleware/errorHandler.js";

const app = express();

// =============================
// Middleware (Day 28 hardening)
// =============================
app.use(helmet());
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5148",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

if (process.env.NODE_ENV !== "test") {
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
}

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// =============================
// Routes
// =============================
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "🚀 Server is running successfully" });
});

app.use("/api/auth", authRoutes);
app.use("/api/workspace", workspaceRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/themes", themeRoutes);
app.use("/api/insights", insightsRoutes);
app.use("/api/reports", reportRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

export default app;
