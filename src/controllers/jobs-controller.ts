import { Request, Response } from "express";
import db from "@/db";
import { jobs, jobSkills, skills } from "@/db/schemas/schema";
import { user } from "@/db/schemas/schema-auth";
import { getUserData } from "@/utils/user-data";
import { eq, and, sql } from "drizzle-orm";

export const getJobs = async (req: Request, res: Response) => {
  const { mine, page = "1", limit = "10" } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  try {
    const userCurrent = await getUserData(req, res);

    const whereCondition =
      userCurrent.role === "employer" && mine === "true"
        ? eq(jobs.employerId, userCurrent.id)
        : undefined;

    const jobsList = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        status: jobs.status,
        location: jobs.location,
        // employerId: jobs.employerId,
        employer: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          profile: user.profile,
          location: user.location,
        },
        // coalesce: if json_agg returns NULL (no skills), return an empty JSON array instead
        // json_agg: aggregates all matching rows into a single JSON array
        // json_build_object: builds a JSON object with 'skillId' and 'name' keys per skill row
        // filter (where skills.id is not null): skips null rows from LEFT JOINs that didn't match
        skills: sql<{ skillId: number; name: string }[]>`coalesce(
          json_agg(
            json_build_object('skillId', ${skills.id}, 'name', ${skills.name})
          ) filter (where ${skills.id} is not null),
          '[]'::json
        )`,
      })
      .from(jobs)
      .leftJoin(jobSkills, eq(jobSkills.jobId, jobs.id))
      .leftJoin(skills, eq(jobSkills.skillId, skills.id))
      .leftJoin(user, eq(jobs.employerId, user.id))
      .where(whereCondition)
      // groupBy: required because json_agg is an aggregate function; every non-aggregated column
      // in the SELECT must appear here, otherwise PostgreSQL throws an error
      .groupBy(
        jobs.id,
        jobs.title,
        jobs.description,
        jobs.salaryMin,
        jobs.salaryMax,
        jobs.status,
        jobs.location,
        jobs.employerId,
        user.id,
        user.name,
        user.email,
        user.image,
        user.profile,
        user.location,
      )
      .limit(parseInt(limit as string))
      .offset(offset);

    const total = await db
      .select({ count: jobs.id })
      .from(jobs)
      .where(whereCondition);

    res.json({
      jobs: jobsList,
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
