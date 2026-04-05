import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./utils/auth";

import router from "./routes";

const app = express();

app.use(cors({ origin: "*", credentials: true }));

app.all("/api/auth/*splat", (req, res, next) => {
	console.log("Auth route hit:", req.method, req.path);
	next();
}, toNodeHandler(auth));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);

app.use("/api", router);

export default app;
