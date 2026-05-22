import { Request, Response } from "express";
import db from "@/db";
import { jobs, jobSkills, skills } from "@/db/schemas/schema";
import { getUserData } from "@/utils/user-data";
import { eq, and } from "drizzle-orm";

// in the get request make it show employer data instead of it id
export const getJobs = async (req: Request, res: Response) => {
  const { mine, page = "1", limit = "10" } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  try {
    const user = await getUserData(req, res);

    const whereCondition =
      user.role === "employer" && mine === "true"
        ? eq(jobs.employerId, user.id)
        : undefined;

    const [jobsList, total] = await Promise.all([
      db
        .select()
        .from(jobs)
        .where(whereCondition)
        .limit(parseInt(limit as string))
        .offset(offset),
      db.select({ count: jobs.id }).from(jobs).where(whereCondition),
    ]);

    const jobsWithSkills = await Promise.all(
      jobsList.map(async (job) => {
        const jobSkillRows = await db
          .select({ skillId: jobSkills.skillId, name: skills.name })
          .from(jobSkills)
          .innerJoin(skills, eq(jobSkills.skillId, skills.id))
          .where(eq(jobSkills.jobId, job.id));
        return { ...job, skills: jobSkillRows };
      }),
    );

    res.json({
      jobs: jobsWithSkills,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: total.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getJobById = async (req: Request, res: Response) => {
  try {
    const user = await getUserData(req, res);
    const jobId = parseInt(req.params.id as string);
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const jobSkillsList = await db
      .select({ skillId: jobSkills.skillId, name: skills.name })
      .from(jobSkills)
      .innerJoin(skills, eq(jobSkills.skillId, skills.id))
      .where(eq(jobSkills.jobId, jobId));

    res.json({ ...job, skills: jobSkillsList });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createJob = async (req: Request, res: Response) => {
  const user = await getUserData(req, res);
  const {
    title,
    description,
    salaryMin,
    salaryMax,
    location,
    skills: skillNames,
  } = req.body;

  try {
    if (user.role !== "employer") {
      return res
        .status(403)
        .json({ message: "Only employers can create jobs" });
    }

    const [newJob] = await db
      .insert(jobs)
      .values({
        title,
        description,
        salaryMin: salaryMin ? parseInt(salaryMin) : null,
        salaryMax: salaryMax ? parseInt(salaryMax) : null,
        status: "open",
        location,
        employerId: user.id,
      })
      .returning();

    if (skillNames?.length) {
      for (const name of skillNames) {
        const [skill] = await db
          .insert(skills)
          .values({ name })
          .onConflictDoNothing()
          .returning();

        const skillToUse =
          skill ||
          (await db
            .select()
            .from(skills)
            .where(eq(skills.name, name))
            .then((rows) => rows[0]));

        if (skillToUse) {
          await db.insert(jobSkills).values({
            jobId: newJob.id,
            skillId: skillToUse.id,
          });
        }
      }
    }

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

    const [existingJob] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId));
    if (!existingJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (user.role !== "employer" || existingJob.employerId !== user.id) {
      return res.status(403).json({
        message: "Only the employer who created the job can update it",
      });
    }

    const [updatedJob] = await db
      .update(jobs)
      .set({ title, description, salaryMin, salaryMax, status, location })
      .where(eq(jobs.id, jobId))
      .returning();

    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteJob = async (req: Request, res: Response) => {
  const user = await getUserData(req, res);
  try {
    const jobId = parseInt(req.params.id as string);

    const [existingJob] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId));
    if (!existingJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (user.role !== "employer" || existingJob.employerId !== user.id) {
      return res.status(403).json({
        message: "Only the employer who created the job can delete it",
      });
    }
    await db.delete(jobs).where(eq(jobs.id, jobId));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
