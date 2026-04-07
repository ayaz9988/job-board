import { Request, Response } from "express";
import db from "@/db";
import { jobs } from "@/db/schemas/schema";
import { getUserData } from "@/utils/user-data";
import { eq } from "drizzle-orm";
import { httpLogger, formatHTTPLoggerResponse } from "@/utils/logger";

export const getJobs = async (req: Request, res: Response) => {
  const user = await getUserData(req, res);
  const jobsList = await db.select().from(jobs);
  if (!jobsList) {
    return res.status(404).json({
      message: "Jobs not found",
    });
  }

  // change make with query parameter
  if (user.role === "employer") {
    const employerJobs = jobsList.filter((job) => job.employerId === user.id);
    res.json(employerJobs);
    return;
  } else if (user.role === "seeker") {
    res.json(jobsList.filter((job) => job.employerId !== user.id));
    return;
  } else if (user.role === "admin") {
    res.json(jobsList);
    return;
  }
};

export const getJobById = async (req: Request, res: Response) => {
  const jobId = parseInt(req.params.id as string);
  const job = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) {
    return res.status(404).json({
      message: "Job not found",
    });
  }
  res.json(job[0]);
};

export const createJob = async (req: Request, res: Response) => {
  const user = await getUserData(req, res);
  if (user.role !== "employer") {
    return res.status(403).json({
      message: "Only employers can create jobs",
    });
  }
  const { title, description, salaryMin, salaryMax, location } = req.body;
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
};

export const updateJob = async (req: Request, res: Response) => {
  const user = await getUserData(req, res);
  const jobId = parseInt(req.params.id as string);
  const { title, description, salaryMin, salaryMax, location, status } =
    req.body;
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
};

export const deleteJob = async (req: Request, res: Response) => {
  const user = await getUserData(req, res);
  const jobId = parseInt(req.params.id as string);
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
  await db.delete(jobs).where(eq(jobs.id, jobId));
  res.status(204).json({ message: "Job deleted successfully" });
};
