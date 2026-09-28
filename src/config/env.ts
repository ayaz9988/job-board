import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().default(3000),
  BASE_URL: z.string().url().default("http://localhost:3000"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  RESEND_API_KEY: z
    .string()
    .min(1, "RESEND_API_KEY cannot be empty"),
  EMAIL_FROM: z
    .string()
    .email("EMAIL_FROM must be a valid email address")
    .default("noreply@yourdomain.com"),
});

export const env = envSchema.parse(process.env);
