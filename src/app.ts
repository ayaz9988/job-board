import express from "express";
import helmet from "helmet";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { sql } from "drizzle-orm";

import { auth } from "./utils/auth";
import db from "./db";
import { env } from "./config/env";

import router from "./routes";
import { responseInterceptor } from "./middlewares/logger-response-interceptor";
import errorHandler from "./middlewares/errorHandler";
import { authLimiter } from "./middlewares/rate-limit";
import { sendSuccess, sendError } from "./utils/response";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(responseInterceptor);

// Body size limit — rejects oversized payloads before they reach controllers
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use("/api/auth", authLimiter);
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use("/api", router);

app.get("/", (_req, res) => {
  sendSuccess(res, {
    message: "Welcome to the Job Board API!",
    serverTime: new Date().toISOString(),
  });
});

// Liveness/readiness probe for load balancers and orchestrators
app.get("/health", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    return sendSuccess(res, {
      status: "ok",
      database: "up",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch {
    return sendError(res, 503, "Service unhealthy: database unreachable");
  }
});

app.use((_req, res) => {
  sendError(res, 404, "Not found");
});

app.use(errorHandler);

export default app;
