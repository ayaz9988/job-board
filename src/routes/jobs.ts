import { Router } from "express";
import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
} from "../controllers/jobs-controller";
import { authenticationMiddleware } from "@/middlewares/authMiddleware";
import { createValidationMiddleware } from "@/middlewares/zod-middleware-factory";
import {
  jobSchema,
  jobIdSchema,
  createJobSchema,
  updateJobSchema,
  deleteJobSchema,
} from "../utils/zod-schemas";

export const jobsRouter = Router();

jobsRouter.get(
  "/",
  authenticationMiddleware,
  createValidationMiddleware(jobSchema),
  getJobs,
);
jobsRouter.get(
  "/:id",
  authenticationMiddleware,
  createValidationMiddleware(jobIdSchema),
  getJobById,
);
jobsRouter.post(
  "/",
  authenticationMiddleware,
  createValidationMiddleware(createJobSchema),
  createJob,
);
jobsRouter.put(
  "/:id",
  authenticationMiddleware,
  createValidationMiddleware(updateJobSchema),
  updateJob,
);
jobsRouter.delete(
  "/:id",
  authenticationMiddleware,
  createValidationMiddleware(deleteJobSchema),
  deleteJob,
);
