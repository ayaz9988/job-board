import { Router } from "express";
import { jobsRouter } from "./jobs";
import { applicationRouter } from "./applications";

const router = Router();

router.use("/jobs", jobsRouter);
router.use("/applications", applicationRouter);

export default router;
