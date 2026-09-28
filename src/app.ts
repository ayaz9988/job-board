import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./utils/auth";

import router from "./routes";
import { responseInterceptor } from "./middlewares/logger-response-interceptor";
import errorHandler from "./middlewares/errorHandler";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(responseInterceptor);
app.all(
  "/api/auth/*splat",
  toNodeHandler(auth),
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/api", router);

app.get("/", (_req, res) => {
  res.json({ 
    message: "Welcome to the Job Board API!",
    status: "success",
    serverTime: new Date().toISOString(),
  });
});

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use(errorHandler);

export default app;
