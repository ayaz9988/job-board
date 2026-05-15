import { Router } from "express";
import {
  deleteApplication,
  updateApplicationStatus,
} from "./../controllers/applications-controller";

export const applicationRouter = Router();

applicationRouter.post("/:id/status", updateApplicationStatus);
applicationRouter.delete("/:id", deleteApplication);
