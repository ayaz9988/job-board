import { application, type Request, type Response } from "express";
import { getUserData } from "@/utils/user-data";
import db from "@/db";
import {
  applications,
  jobs,
  jobSkills,
  skills,
  applicationStatus,
} from "@/db/schemas/schema";
import { user } from "@/db/schemas/schema-auth";
import { and, eq, sql } from "drizzle-orm";
import { count } from "drizzle-orm";

// make it show a breif of the job instead of the jobid same for the other get methods
export const getAllApplications = async (req: Request, res: Response) => {
  const { page = "1", limit = "10" } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const user = await getUserData(req, res);

  try {
    const whereCondition =
      user.role === "seeker" ? eq(applications.seekerId, user.id) : undefined;

    const [applicationsList, total] = await Promise.all([
      db
        .select({
          id: applications.id,
          status: applications.status,
          coverLetter: applications.coverLetter,
          cv: applications.cv,
          appliedAt: applications.appliedAt,
        })
        .from(applications)
        .where(whereCondition)
        .limit(parseInt(limit as string))
        .offset(offset),
      db
        .select({ count: applications.seekerId })
        .from(applications)
        .where(whereCondition),
    ]);

    res.json({
      applications: applicationsList,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: total.length,
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getApplicationById = async (req: Request, res: Response) => {
  const user = await getUserData(req, res);
  try {
    const whereCondition =
      user.role === "seeker" ? eq(applications.seekerId, user.id) : undefined;
    const applicationId = parseInt(req.params.id as string);
    const [application] = await db
      .select({
        id: applications.id,
        status: applications.status,
        coverLetter: applications.coverLetter,
        cv: applications.cv,
        appliedAt: applications.appliedAt,
      })
      .from(applications)
      .where(and(whereCondition, eq(applications.id, applicationId)));
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }
    res.json(application);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createApplication = async (req: Request, res: Response) => {
  const { status = "applied", coverLetter, cv } = req.body;
  const user = await getUserData(req, res);

  try {
    const jobId = parseInt(req.params.id as string);

    if (user.role !== "seeker") {
      return res.status(403).json({ message: "Only seekers can create jobs" });
    }

    const [newApplication] = await db
      .insert(applications)
      .values({
        jobId,
        seekerId: user.id,
        status,
        coverLetter,
        cv,
      })
      .returning();

    res.status(201).json(newApplication);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getJobApplications = async (req: Request, res: Response) => {
  const currentUser = await getUserData(req, res);
  try {
    const jobId = parseInt(req.params.id as string);

    const [existingJob] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId));
    if (!existingJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (
      currentUser.role !== "employer" ||
      existingJob.employerId !== currentUser.id
    ) {
      return res.status(403).json({
        message:
          "Only the employer who created the job can list it applications",
      });
    }

    const applicationsList = await db
      .select({
        id: applications.id,
        status: applications.status,
        coverLetter: applications.coverLetter,
        cv: applications.cv,
        seeker: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        job: {
          id: jobs.id,
          title: jobs.title,
          description: jobs.description,
        },
        skills: sql<{ skillId: number; name: string }[]>`coalesce(
          json_agg(
            json_build_object(
              'skillId', ${skills.id},
              'name', ${skills.name}
            )
          ) filter (where ${skills.id} is not null),
          '[]'::json
        )`,
      })
      .from(applications)
      .innerJoin(user, eq(applications.seekerId, user.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(jobSkills, eq(jobSkills.jobId, jobs.id))
      .leftJoin(skills, eq(jobSkills.skillId, skills.id))
      .where(eq(user.role, "seeker"))
      .groupBy(
        applications.id,
        applications.status,
        applications.coverLetter,
        applications.cv,
        applications.seekerId,
        applications.jobId,
        user.id,
        user.name,
        user.email,
        jobs.id,
        jobs.title,
        jobs.description,
      );

    res.status(200).json(applicationsList);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateApplicationStatus = async (req: Request, res: Response) => {
  const currentUser = await getUserData(req, res);
  const { status } = req.body;
  try {
    const isValidStatus = applicationStatus.includes(status);
    if (!isValidStatus) {
      return res.status(400).json({
        message: `status should be one of the value ${applicationStatus}`,
      });
    }
    const applicationId = parseInt(req.params.id as string);

    const [existingApplication] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId));
    if (!existingApplication) {
      return res.status(404).json({ message: "Job not found" });
    }

    const [existingJob] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, existingApplication.jobId));
    if (!existingJob) {
      return res
        .status(404)
        .json({ message: "Job associated with application not found" });
    }

    if (
      currentUser.role !== "employer" ||
      existingJob.employerId !== currentUser.id
    ) {
      return res.status(403).json({
        message:
          "Only the employer who created the job can list it applications",
      });
    }

    const [updatedApplicationStatus] = await db
      .update(applications)
      .set({
        status: status,
      })
      .where(eq(applications.id, applicationId))
      .returning({ status: applications.status });

    res.status(200).json(updatedApplicationStatus);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteApplication = async (req: Request, res: Response) => {
  const user = await getUserData(req, res);
  try {
    const applicationId = parseInt(req.params.id as string);
    const [existingApplication] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId));
    if (!existingApplication) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (user.role !== "employer") {
      return res.status(403).json({
        message: "Only the employer who created the job can delete it",
      });
    }

    await db.delete(applications).where(eq(applications.id, applicationId));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};
