import { getAuthContext } from "./auth";
import { Request, Response } from "express";
import type { AuthUser } from "@/types/auth";

export const getUserData = async (
  req: Request,
  _res: Response,
): Promise<AuthUser> => {
  // authenticationMiddleware already resolved the session
  if (req.user) return req.user;

  const ctx = await getAuthContext(req.headers);
  if (!ctx?.user) {
    throw new Error(
      "Should Never Happen: This should have been handled by the middleware",
    );
  }
  return ctx.user as unknown as AuthUser;
};
