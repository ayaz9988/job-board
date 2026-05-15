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
  getJobsSchema,
  jobIdSchema,
  createJobSchema,
  updateJobSchema,
} from "../utils/zod-schemas";
import {
  createApplication,
  getJobApplications,
} from "@/controllers/applications-controller";

export const jobsRouter = Router();

jobsRouter.get(
  "/",
  authenticationMiddleware,
  createValidationMiddleware(getJobsSchema),
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

jobsRouter.patch(
  "/:id",
  authenticationMiddleware,
  createValidationMiddleware(updateJobSchema),
  updateJob,
);

jobsRouter.delete(
  "/:id",
  authenticationMiddleware,
  createValidationMiddleware(jobIdSchema),
  deleteJob,
);

jobsRouter.post("/:id/apply", createApplication);

jobsRouter.get(
  "/:id/applications",
  authenticationMiddleware,
  getJobApplications,
);
