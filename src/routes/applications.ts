import { Router } from "express";
import {
  deleteApplication,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
} from "./../controllers/applications-controller";
import { authenticationMiddleware } from "@/middlewares/authMiddleware";

export const applicationRouter = Router();

applicationRouter.get("/", authenticationMiddleware, getAllApplications);
applicationRouter.get("/:id", authenticationMiddleware, getApplicationById);
applicationRouter.post(
  "/:id/status",
  authenticationMiddleware,
  updateApplicationStatus,
);
applicationRouter.delete("/:id", authenticationMiddleware, deleteApplication);
