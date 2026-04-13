import { z } from "zod";
import { id } from "zod/locales";

export const jobSchema = z.object({
  mine: z.boolean().optional(),
});

export const jobIdSchema = z.object({
  id: z.number().optional(),
});

export const createJobSchema = z.object({
  title: z.string().length(255),
  description: z.string(),
  salaryMin: z.number().min(0),
  salaryMax: z.number().min(0),
  location: z.string().length(100),
});

export const updateJobSchema = z.object({
  id: z.number().optional(),
  title: z.string().length(255),
  description: z.string(),
  salaryMin: z.number().min(0),
  salaryMax: z.number().min(0),
  location: z.string().length(100),
  status: z.string().length(50),
});

export const deleteJobSchema = z.object({
  id: z.number().optional(),
});
