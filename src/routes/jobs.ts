import { Router } from "express";
import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
} from "../controllers/jobs-controller";
import { authenticationMiddleware } from "@/middlewares/authMiddleware";
import { requireRole } from "@/middlewares/roles";
import { createValidationMiddleware } from "@/middlewares/zod-middleware-factory";
import { applyLimiter } from "@/middlewares/rate-limit";
import {
  getJobsSchema,
  jobIdSchema,
  createJobSchema,
  updateJobSchema,
  applyToJobSchema,
  jobApplicationsSchema,
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
  requireRole(["employer"]),
  createValidationMiddleware(createJobSchema),
  createJob,
);

jobsRouter.patch(
  "/:id",
  authenticationMiddleware,
  requireRole(["employer"]),
  createValidationMiddleware(updateJobSchema),
  updateJob,
);

jobsRouter.delete(
  "/:id",
  authenticationMiddleware,
  requireRole(["employer"]),
  createValidationMiddleware(jobIdSchema),
  deleteJob,
);

jobsRouter.post(
  "/:id/apply",
  authenticationMiddleware,
  requireRole(["seeker"]),
  applyLimiter,
  createValidationMiddleware(applyToJobSchema),
  createApplication,
);

jobsRouter.get(
  "/:id/applications",
  authenticationMiddleware,
  requireRole(["employer"]),
  createValidationMiddleware(jobApplicationsSchema),
  getJobApplications,
);
