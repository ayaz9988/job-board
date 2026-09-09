import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  // ... your DB and other vars
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.string().default("development"),
  PORT: z.int().default(3000),
  BASE_URL: z.string().url().default("http://localhost:3000"),
  // Email Configuration
  RESEND_API_KEY: z
    .string({
      required_error: "RESEND_API_KEY is required for production emails",
    })
    .min(1, "RESEND_API_KEY cannot be empty"),

  EMAIL_FROM: z
    .string()
    .email("EMAIL_FROM must be a valid email address")
    .default("noreply@yourdomain.com"), // Change this to your verified domain
});

export const env = envSchema.parse(process.env);
