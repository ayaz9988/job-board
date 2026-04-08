import { Router } from "express";
import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
} from "../controllers/jobs-controller";
import { authenticationMiddleware } from "@/middlewares/authMiddleware";

export const jobsRouter = Router();

jobsRouter.get("/", authenticationMiddleware, getJobs);
jobsRouter.get("/:id", authenticationMiddleware, getJobById);
jobsRouter.post("/", authenticationMiddleware, createJob);
jobsRouter.put("/:id", authenticationMiddleware, updateJob);
jobsRouter.delete("/:id", authenticationMiddleware, deleteJob);
