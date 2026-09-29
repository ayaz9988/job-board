import { rateLimit } from "express-rate-limit";

const buildLimiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "error", error: { message } },
  });

// Auth endpoints are brute-force targets (sign-in, sign-up, reset password).
export const authLimiter = buildLimiter(
  15 * 60 * 1000,
  20,
  "Too many auth attempts, please try again later",
);

// Applying to jobs is a write-heavy endpoint worth throttling per IP.
export const applyLimiter = buildLimiter(
  15 * 60 * 1000,
  30,
  "Too many application attempts, please try again later",
);
