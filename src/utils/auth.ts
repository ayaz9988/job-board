import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { fromNodeHeaders } from "better-auth/node";
import type { IncomingHttpHeaders } from "http";
import type { Request } from "express";

import db from "../db";
import {
  user,
  session,
  account,
  verification,
} from "../db/schemas/schema-auth";
import { env } from "../config/env"; // Your Zod-validated env file
import { sendAuthEmail } from "./email";
import { resetPasswordTemplate, verificationTemplate } from "./email-template";
import { httpLogger } from "./logger";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "admin" | "employer" | "seeker";
    profile?: string;
    location?: string;
  };
}

export const auth = betterAuth({
  // 1. DYNAMIC BASE URL: Never hardcode localhost in production
  baseURL: env.BASE_URL,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),

  emailAndPassword: {
    enabled: true,
    // requireEmailVerification: true,

    onExistingUserSignUp: async ({ user }) => {
      void sendAuthEmail({
        to: user.email,
        subject: "Sign-up attempt with your email",
        html: `<p>Someone tried to create an account using your email address. If this was you, try signing in instead. If not, you can safely ignore this email.</p>`,
      }).catch((err) =>
        httpLogger.error("Failed to send existing user sign-up email", {
          error: err.message,
          email: user.email,
        }),
      );
    },

    sendResetPassword: async ({ user, url }) => {
      void sendAuthEmail({
        to: user.email,
        subject: "Reset your password - Job Board",
        html: resetPasswordTemplate(url, user.name),
      }).catch((err) =>
        httpLogger.error("Failed to send password reset email", {
          error: err.message,
          email: user.email,
        }),
      );
    },

    onPasswordReset: async ({ user }) => {
      httpLogger.info("Password reset successful", { email: user.email });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,

    sendVerificationEmail: async ({ user, url }) => {
      void sendAuthEmail({
        to: user.email,
        subject: "Verify your email address - Job Board",
        html: verificationTemplate(url, user.name),
      }).catch((err) =>
        httpLogger.error("Failed to send verification email", {
          error: err.message,
          email: user.email,
        }),
      );
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string" as const,
        required: false,
        input: false,
        defaultValue: "seeker" as const,
        hidden: true,
      },
      profile: {
        type: "string" as const,
        required: false,
        input: false,
        hidden: true,
      },
      location: {
        type: "string" as const,
        required: false,
        input: true,
      },
    },
  },

  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:*",
    env.FRONTEND_URL,
  ],
});

export const getAuthContext = async (headers: IncomingHttpHeaders) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(headers),
  });
  return session;
};
