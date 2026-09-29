import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Treat empty values and pasted comments ("BASE_URL= # your url") as unset,
// so defaults apply instead of crashing the process at boot.
const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" || trimmed.startsWith("#") ? undefined : value;
};

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().default(3000),
  BASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().default("http://localhost:3000"),
  ),
  FRONTEND_URL: z.preprocess(
    emptyToUndefined,
    z.string().default("http://localhost:3000"),
  ),
  RESEND_API_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1, "RESEND_API_KEY cannot be empty"),
  ),
  EMAIL_FROM: z.preprocess(
    emptyToUndefined,
    z.string().email("EMAIL_FROM must be a valid email address").default(
      "noreply@yourdomain.com",
    ),
  ),
});

export const env = envSchema.parse(process.env);
