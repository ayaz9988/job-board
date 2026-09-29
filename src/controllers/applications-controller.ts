import { type Request, type Response } from "express";
import { getUserData } from "@/utils/user-data";
import db from "@/db";
import {
  applications,
  jobs,
  jobSkills,
  skills,
} from "@/db/schemas/schema";
import { user } from "@/db/schemas/schema-auth";
import { and, eq, sql, count, or } from "drizzle-orm";
import { getValidated } from "@/middlewares/zod-middleware-factory";
import {
  listApplicationsSchema,
  applicationIdSchema,
  updateApplicationStatusSchema,
  applyToJobSchema,
  jobApplicationsSchema,
} from "@/utils/zod-schemas";
import { sendSuccess, sendError } from "@/utils/response";

// drizzle wraps driver errors in DrizzleQueryError, which keeps the original
// pg error in `cause` — walk the chain to find the SQLSTATE code.
const isUniqueViolation = (err: unknown): boolean => {
  let current: unknown = err;
  for (let depth = 0; current && depth < 5; depth++) {
    if (
      typeof current === "object" &&
      (current as { code?: unknown }).code === "23505"
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
};

export const getAllApplications = async (req: Request, res: Response) => {
  const { query } = getValidated(req, listApplicationsSchema);
  const { page = 1, limit = 10 } = query ?? {};
  const offset = (page - 1) * limit;

  const cuser = await getUserData(req, res);

  const roleConditions = [
    cuser.role === "seeker" ? eq(applications.seekerId, cuser.id) : undefined,
    cuser.role === "employer" ? eq(jobs.employerId, cuser.id) : undefined,
  ].filter(Boolean);
  const whereCondition =
    roleConditions.length > 0 ? or(...roleConditions) : undefined;

  const [applicationsList, total] = await Promise.all([
    db
      .select({
        id: applications.id,
        status: applications.status,
        coverLetter: applications.coverLetter,
        cv: applications.cv,
        appliedAt: applications.appliedAt,
        job: {
          id: jobs.id,
          title: jobs.title,
          description: jobs.description,
          salaryMin: jobs.salaryMin,
          salaryMax: jobs.salaryMax,
          status: jobs.status,
          location: jobs.location,
        },
        employer: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(user, eq(jobs.employerId, user.id))
      .where(whereCondition)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .where(whereCondition),
  ]);

  const totalRows = Number(total[0]?.count ?? 0);

  sendSuccess(res, applicationsList, {
    meta: { page, limit, total: totalRows, totalPages: Math.ceil(totalRows / limit) },
  });
};

export const getApplicationById = async (req: Request, res: Response) => {
  const userCurrent = await getUserData(req, res);
  const { params } = getValidated(req, applicationIdSchema);

  const whereCondition =
    userCurrent.role === "seeker"
      ? eq(applications.seekerId, userCurrent.id)
      : userCurrent.role === "employer"
        ? eq(jobs.employerId, userCurrent.id)
        : undefined;

  const [application] = await db
    .select({
      id: applications.id,
      status: applications.status,
      coverLetter: applications.coverLetter,
      cv: applications.cv,
      appliedAt: applications.appliedAt,
      job: {
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        status: jobs.status,
        location: jobs.location,
      },
      employer: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    .from(applications)
    .leftJoin(jobs, eq(applications.jobId, jobs.id))
    .leftJoin(user, eq(jobs.employerId, user.id))
    .where(and(whereCondition, eq(applications.id, params.id)));

  if (!application) {
    return sendError(res, 404, "Application not found");
  }
  sendSuccess(res, application);
};

export const createApplication = async (req: Request, res: Response) => {
  const { params, body } = getValidated(req, applyToJobSchema);
  const { coverLetter, cv } = body;
  const jobId = params.id;
  const currentUser = await getUserData(req, res);

  if (currentUser.role !== "seeker") {
    return sendError(res, 403, "Only seekers can create applications");
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) {
    return sendError(res, 404, "Job not found");
  }
  if (job.status !== "open") {
    return sendError(res, 409, "This job is not accepting applications");
  }

  try {
    const [newApplication] = await db
      .insert(applications)
      .values({
        jobId,
        seekerId: currentUser.id,
        // status is always "applied" — never client-controlled
        status: "applied",
        coverLetter: coverLetter ?? null,
        cv: cv ?? null,
      })
      .returning();

    return sendSuccess(res, newApplication, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return sendError(res, 409, "You have already applied to this job");
    }
    throw err;
  }
};

export const getJobApplications = async (req: Request, res: Response) => {
  const currentUser = await getUserData(req, res);
  const { params } = getValidated(req, jobApplicationsSchema);
  const jobId = params.id;

  const [existingJob] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId));
  if (!existingJob) {
    return sendError(res, 404, "Job not found");
  }

  if (
    currentUser.role !== "employer" ||
    existingJob.employerId !== currentUser.id
  ) {
    return sendError(
      res,
      403,
      "Only the employer who created the job can list its applications",
    );
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
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        status: jobs.status,
        location: jobs.location,
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
    .where(and(eq(applications.jobId, jobId), eq(user.role, "seeker")))
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
      jobs.salaryMin,
      jobs.salaryMax,
      jobs.status,
      jobs.location,
    );

  sendSuccess(res, applicationsList, {
    meta: { total: applicationsList.length },
  });
};

export const updateApplicationStatus = async (req: Request, res: Response) => {
  const currentUser = await getUserData(req, res);
  const { params, body } = getValidated(req, updateApplicationStatusSchema);
  const applicationId = params.id;

  const [existingApplication] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId));
  if (!existingApplication) {
    return sendError(res, 404, "Application not found");
  }

  const [existingJob] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, existingApplication.jobId));
  if (!existingJob) {
    return sendError(res, 404, "Job associated with application not found");
  }

  if (
    currentUser.role !== "employer" ||
    existingJob.employerId !== currentUser.id
  ) {
    return sendError(
      res,
      403,
      "Only the employer who created the job can update its applications",
    );
  }

  const [updatedApplicationStatus] = await db
    .update(applications)
    .set({ status: body.status })
    .where(eq(applications.id, applicationId))
    .returning({ status: applications.status });

  sendSuccess(res, updatedApplicationStatus);
};

export const deleteApplication = async (req: Request, res: Response) => {
  const currentUser = await getUserData(req, res);
  const { params } = getValidated(req, applicationIdSchema);
  const applicationId = params.id;

  const [existingApplication] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId));
  if (!existingApplication) {
    return sendError(res, 404, "Application not found");
  }

  const [existingJob] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, existingApplication.jobId));

  const isOwnerSeeker =
    currentUser.role === "seeker" &&
    existingApplication.seekerId === currentUser.id;
  const isOwnerEmployer =
    currentUser.role === "employer" &&
    existingJob?.employerId === currentUser.id;

  if (!isOwnerSeeker && !isOwnerEmployer) {
    return sendError(
      res,
      403,
      "Only the applicant or the job's employer can delete this application",
    );
  }

  await db.delete(applications).where(eq(applications.id, applicationId));
  res.status(204).send();
};
