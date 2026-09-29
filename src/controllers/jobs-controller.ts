import { Request, Response } from "express";
import db from "@/db";
import { jobs, jobSkills, skills } from "@/db/schemas/schema";
import { user } from "@/db/schemas/schema-auth";
import { getUserData } from "@/utils/user-data";
import { eq, sql, count } from "drizzle-orm";
import { getValidated } from "@/middlewares/zod-middleware-factory";
import {
  getJobsSchema,
  jobIdSchema,
  createJobSchema,
  updateJobSchema,
} from "@/utils/zod-schemas";
import { sendSuccess, sendError } from "@/utils/response";

export const getJobs = async (req: Request, res: Response) => {
  const { query } = getValidated(req, getJobsSchema);
  const { mine, page = 1, limit = 10 } = query ?? {};
  const offset = (page - 1) * limit;

  const userCurrent = await getUserData(req, res);

  const whereCondition =
    userCurrent.role === "employer" && mine
      ? eq(jobs.employerId, userCurrent.id)
      : undefined;

  const [jobsList, total] = await Promise.all([
    db
      .select({
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        status: jobs.status,
        location: jobs.location,
        createdAt: jobs.createdAt,
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
        jobs.createdAt,
        user.id,
        user.name,
        user.email,
        user.image,
        user.profile,
        user.location,
      )
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(jobs).where(whereCondition),
  ]);

  const totalRows = Number(total[0]?.count ?? 0);

  sendSuccess(res, jobsList, {
    meta: { page, limit, total: totalRows, totalPages: Math.ceil(totalRows / limit) },
  });
};

export const getJobById = async (req: Request, res: Response) => {
  await getUserData(req, res);
  const { params } = getValidated(req, jobIdSchema);
  const jobId = params.id;

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) {
    return sendError(res, 404, "Job not found");
  }

  const jobSkillsList = await db
    .select({ skillId: jobSkills.skillId, name: skills.name })
    .from(jobSkills)
    .innerJoin(skills, eq(jobSkills.skillId, skills.id))
    .where(eq(jobSkills.jobId, jobId));

  sendSuccess(res, { ...job, skills: jobSkillsList });
};

export const createJob = async (req: Request, res: Response) => {
  const currentUser = await getUserData(req, res);
  const { body } = getValidated(req, createJobSchema);
  const { title, description, salaryMin, salaryMax, location, skills: skillNames } = body;

  if (currentUser.role !== "employer") {
    return sendError(res, 403, "Only employers can create jobs");
  }

  const [newJob] = await db
    .insert(jobs)
    .values({
      title,
      description,
      salaryMin: salaryMin ?? null,
      salaryMax: salaryMax ?? null,
      status: "open",
      location: location ?? null,
      employerId: currentUser.id,
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

  return sendSuccess(res, newJob, { status: 201 });
};

export const updateJob = async (req: Request, res: Response) => {
  const currentUser = await getUserData(req, res);
  const { params, body } = getValidated(req, updateJobSchema);
  const jobId = params.id;

  const [existingJob] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId));
  if (!existingJob) {
    return sendError(res, 404, "Job not found");
  }

  if (currentUser.role !== "employer" || existingJob.employerId !== currentUser.id) {
    return sendError(
      res,
      403,
      "Only the employer who created the job can update it",
    );
  }

  const updates = Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(updates).length === 0) {
    return sendError(res, 400, "No fields to update");
  }

  const [updatedJob] = await db
    .update(jobs)
    .set(updates)
    .where(eq(jobs.id, jobId))
    .returning();

  sendSuccess(res, updatedJob);
};

export const deleteJob = async (req: Request, res: Response) => {
  const currentUser = await getUserData(req, res);
  const { params } = getValidated(req, jobIdSchema);
  const jobId = params.id;

  const [existingJob] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId));
  if (!existingJob) {
    return sendError(res, 404, "Job not found");
  }

  if (currentUser.role !== "employer" || existingJob.employerId !== currentUser.id) {
    return sendError(
      res,
      403,
      "Only the employer who created the job can delete it",
    );
  }

  await db.delete(jobs).where(eq(jobs.id, jobId));
  res.status(204).send();
};
