import { Router } from "express";
import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
} from "../controllers/jobs-controller";

export const jobsRouter = Router();

jobsRouter.get("/", getJobs);
jobsRouter.get("/:id", getJobById);
jobsRouter.post("/", createJob);
jobsRouter.put("/:id", updateJob);
jobsRouter.delete("/:id", deleteJob);
