// schemas/job-schema.ts
import { z } from "zod";

// ==================== ENUMS ====================
export const jobStatusEnum = z.enum(["open", "closed", "filled"]);

// ==================== GET /jobs ====================
export const getJobsSchema = z.object({
  query: z
    .object({
      // Express query params are always strings, so we transform them
      mine: z
        .string()
        .transform((val) => val === "true")
        .optional(),
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
    })
    .optional(), // Allow empty query strings
});

// ==================== GET /jobs/:id & DELETE /jobs/:id ====================
export const jobIdSchema = z.object({
  params: z.object({
    // Express params are strings, transform to number for DB
    id: z
      .string()
      .regex(/^\d+$/, "ID must be a valid number")
      .transform(Number),
  }),
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
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/, "ID must be a valid number")
      .transform(Number),
  }),
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

// ==================== INFERRED TYPES ====================
// You can use these in your controllers for full TypeScript autocompletion!
export type GetJobsInput = z.infer<typeof getJobsSchema>;
export type JobIdInput = z.infer<typeof jobIdSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
