import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./utils/auth";

import router from "./routes";
import { responseInterceptor } from "./middlewares/logger-response-interceptor";
import errorHandler from "./middlewares/errorHandler";

const app = express();

app.use(cors({ origin: "*", credentials: true }));
app.use(responseInterceptor);
app.all(
  "/api/auth/*splat",
  (req, _res, next) => {
    console.log("Auth route hit:", req.method, req.path);
    next();
  },
  toNodeHandler(auth),
);
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);
app.use("/api", router);

app.get("/", (_req, res) => {
  res.json({ 
    message: "Welcome to the Job Board API!",
    status: "success",
    serverTime: new Date().toISOString(),
  });
});

app.use(errorHandler);

export default app;
