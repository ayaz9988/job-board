import { Router } from "express";
import {
  deleteApplication,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
} from "./../controllers/applications-controller";
import { authenticationMiddleware } from "@/middlewares/authMiddleware";
import { requireRole } from "@/middlewares/roles";
import { createValidationMiddleware } from "@/middlewares/zod-middleware-factory";
import {
  listApplicationsSchema,
  applicationIdSchema,
  updateApplicationStatusSchema,
} from "@/utils/zod-schemas";

export const applicationRouter = Router();

applicationRouter.get(
  "/",
  authenticationMiddleware,
  createValidationMiddleware(listApplicationsSchema),
  getAllApplications,
);

applicationRouter.get(
  "/:id",
  authenticationMiddleware,
  createValidationMiddleware(applicationIdSchema),
  getApplicationById,
);

applicationRouter.post(
  "/:id/status",
  authenticationMiddleware,
  requireRole(["employer"]),
  createValidationMiddleware(updateApplicationStatusSchema),
  updateApplicationStatus,
);

// A seeker may withdraw their own application; an employer may remove one
// from their own job. Ownership is enforced in the controller.
applicationRouter.delete(
  "/:id",
  authenticationMiddleware,
  requireRole(["seeker", "employer"]),
  createValidationMiddleware(applicationIdSchema),
  deleteApplication,
);
