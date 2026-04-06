import { Router } from "express";
import { getJobs, getJobById } from "../controllers/jobs-controller";

export const jobsRouter = Router();

jobsRouter.get("/", getJobs);
jobsRouter.get("/:id", getJobById);
