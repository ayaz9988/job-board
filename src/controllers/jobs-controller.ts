import { Request, Response } from "express";
import db from "@/db";
import { jobs } from "@/db/schemas/schema";
import { getUserData } from "@/utils/user-data";
import { eq } from "drizzle-orm";

export const getJobs = async (req: Request, res: Response) => {
  const { mine } = req.query;

  try {
    const user = await getUserData(req, res);
    const jobsList = await db.select().from(jobs);
    if (!jobsList.length) {
      return res.status(404).json({ message: "No jobs found" });
    }

    let result = jobsList;
    if (user.role === "employer" && mine === "true") {
      result = jobsList.filter((job) => job.employerId === user.id);
    }

    res.json({
      jobs: result,
      // page,
      // limit,
      // total: jobsList.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getJobById = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id as string);
    if (!jobId) {
      return res.status(400).json({
        message: `Missing required parameter '[id]'.`,
      });
    }
    const job = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }
    res.json(job[0]);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createJob = async (req: Request, res: Response) => {
  const user = await getUserData(req, res);
  const { title, description, salaryMin, salaryMax, location } = req.body;

  try {
    if (user.role !== "employer") {
      return res.status(403).json({
        message: "Only employers can create jobs",
      });
    }
    const newJob = await db.insert(jobs).values({
      title,
      description,
      salaryMin,
      salaryMax,
      status: "open",
      location,
      employerId: user.id,
    });
    res.status(201).json(newJob);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateJob = async (req: Request, res: Response) => {
  const user = await getUserData(req, res);
  const { title, description, salaryMin, salaryMax, location, status } =
    req.body;
  try {
    const jobId = parseInt(req.params.id as string);
    if (!jobId) {
      return res.status(400).json({
        message: `Missing required parameter '[id]'.`,
      });
    }
    const job = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }
    if (user.role !== "employer" || job[0].employerId !== user.id) {
      return res.status(403).json({
        message: "Only the employer who created the job can update it",
      });
    }
    const updatedJob = await db
      .update(jobs)
      .set({
        title,
        description,
        salaryMin,
        salaryMax,
        status,
        location,
      })
      .where(eq(jobs.id, jobId));
    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteJob = async (req: Request, res: Response) => {
  const user = await getUserData(req, res);
  try {
    const jobId = parseInt(req.params.id as string);
    if (!jobId) {
      return res.status(400).json({
        message: `Missing required parameter '[id]'.`,
      });
    }
    const job = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }
    if (user.role !== "employer" || job[0].employerId !== user.id) {
      return res.status(403).json({
        message: "Only the employer who created the job can delete it",
      });
    }
    await db.delete(jobs).where(eq(jobs.id, jobId));
    res.status(204).json({ message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
