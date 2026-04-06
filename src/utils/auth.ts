import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../db";
import {
  user,
  session,
  account,
  verification,
} from "../db/schemas/schema-auth";
import { fromNodeHeaders } from "better-auth/node";
import type { IncomingHttpHeaders } from "http";
// import { sendEmail } from "./email"; // your email sending function

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
  baseURL: "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    onExistingUserSignUp: async ({ user }, request) => {
      void sendEmail({
        to: user.email,
        subject: "Sign-up attempt with your email",
        text: "Someone tried to create an account using your email address. If this was you, try signing in instead. If not, you can safely ignore this email.",
      });
    },
    sendResetPassword: async ({ user, url, token }, request) => {
      void sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${url}?token=${token}`,
      });
    },
    onPasswordReset: async ({ user }, request) => {
      // your logic here
      console.log(`Password for user ${user.email} has been reset.`);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      void sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}?token=${token}`,
      });
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string" as const,
        required: true,
        input: true, // Don't let users set role on signup
        defaultValue: "seeker" as const,
      },
      profile: {
        type: "string" as const,
        required: false,
        input: true, // Allow users to set profile
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
    "http://localhost:*", // Wildcard port
  ],
});

export const getAuthContext = async (headers: IncomingHttpHeaders) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(headers),
  });
  return session;
};

/*
usage example
export async function MyController(this: ControllerClass, req: Request, res: Response) {
    const ctx = await getAuthContext(req.headers);
    if (!ctx) {
        throw new Error("Should Never Happer: This should have been handled by the middleware");
    }
    return res.status(200).json({ user: ctx.user });
}
*/
