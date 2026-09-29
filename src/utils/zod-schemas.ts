// schemas/job-schema.ts
import { z } from "zod";
import { applicationStatus } from "@/db/schemas/schema";

// ==================== ENUMS ====================
export const jobStatusEnum = z.enum(["open", "closed", "filled"]);
export const applicationStatusEnum = z.enum(applicationStatus);

// ==================== PAGINATION ====================
const paginationQuery = {
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
};

// ==================== GET /jobs ====================
export const getJobsSchema = z.object({
  query: z
    .object({
      // Express query params are always strings, so we transform them
      mine: z
        .string()
        .transform((val) => val === "true")
        .optional(),
      ...paginationQuery,
    })
    .optional(), // Allow empty query strings
});

// ==================== PARAM: numeric :id ====================
const idParam = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "ID must be a valid number")
    .transform(Number),
});

// ==================== GET /jobs/:id & DELETE /jobs/:id ====================
export const jobIdSchema = z.object({
  params: idParam,
});

// ==================== POST /jobs ====================
export const createJobSchema = z.object({
  body: z
    .object({
      title: z
        .string()
        .min(3, "Title must be at least 3 characters")
        .max(255, "Title cannot exceed 255 characters"),
      description: z
        .string()
        .min(20, "Description must be at least 20 characters"),
      salaryMin: z
        .number({ error: "Salary must be a number" })
        .int("Salary must be a whole number")
        .min(0, "Salary cannot be negative")
        .optional()
        .nullable(),
      salaryMax: z
        .number({ error: "Salary must be a number" })
        .int("Salary must be a whole number")
        .min(0, "Salary cannot be negative")
        .optional()
        .nullable(),
      location: z
        .string()
        .max(100, "Location cannot exceed 100 characters")
        .optional()
        .nullable(),
      skills: z.array(z.string().max(100)).optional().default([]),
    })
    .refine(
      (data) => {
        if (data.salaryMin != null && data.salaryMax != null) {
          return data.salaryMin <= data.salaryMax;
        }
        return true;
      },
      {
        message: "Minimum salary cannot exceed maximum salary",
        path: ["salaryMin"],
      },
    ),
});

// ==================== PATCH /jobs/:id ====================
export const updateJobSchema = z.object({
  params: idParam,
  body: z
    .object({
      title: z
        .string()
        .min(3, "Title must be at least 3 characters")
        .max(255, "Title cannot exceed 255 characters")
        .optional(),
      description: z
        .string()
        .min(20, "Description must be at least 20 characters")
        .optional(),
      salaryMin: z
        .number({ error: "Salary must be a number" })
        .int("Salary must be a whole number")
        .min(0, "Salary cannot be negative")
        .optional()
        .nullable(),
      salaryMax: z
        .number({ error: "Salary must be a number" })
        .int("Salary must be a whole number")
        .min(0, "Salary cannot be negative")
        .optional()
        .nullable(),
      location: z
        .string()
        .max(100, "Location cannot exceed 100 characters")
        .optional()
        .nullable(),
      // Use the enum instead of string.length() to match DB exactly
      status: jobStatusEnum.optional(),
    })
    .refine(
      (data) => {
        if (data.salaryMin != null && data.salaryMax != null) {
          return data.salaryMin <= data.salaryMax;
        }
        return true;
      },
      {
        message: "Minimum salary cannot exceed maximum salary",
        path: ["salaryMin"],
      },
    ),
});

// ==================== APPLICATIONS ====================
// GET /applications
export const listApplicationsSchema = z.object({
  query: z.object({ ...paginationQuery }).optional(),
});

// GET /applications/:id & DELETE /applications/:id
export const applicationIdSchema = z.object({
  params: idParam,
});

// POST /applications/:id/status (employer only)
export const updateApplicationStatusSchema = z.object({
  params: idParam,
  body: z.object({
    status: applicationStatusEnum,
  }),
});

// POST /jobs/:id/apply — seekers never choose a status; it starts as "applied"
export const applyToJobSchema = z.object({
  params: idParam,
  body: z
    .object({
      coverLetter: z
        .string()
        .max(5000, "Cover letter cannot exceed 5000 characters")
        .optional()
        .nullable(),
      cv: z
        .string()
        .max(2000, "CV cannot exceed 2000 characters")
        .optional()
        .nullable(),
    })
    .optional()
    .default({}),
});

// GET /jobs/:id/applications (owner employer only)
export const jobApplicationsSchema = z.object({
  params: idParam,
});

// ==================== INFERRED TYPES ====================
// You can use these in your controllers for full TypeScript autocompletion!
export type GetJobsInput = z.infer<typeof getJobsSchema>;
export type JobIdInput = z.infer<typeof jobIdSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type ListApplicationsInput = z.infer<typeof listApplicationsSchema>;
export type ApplicationIdInput = z.infer<typeof applicationIdSchema>;
export type UpdateApplicationStatusInput = z.infer<
  typeof updateApplicationStatusSchema
>;
export type ApplyToJobInput = z.infer<typeof applyToJobSchema>;
