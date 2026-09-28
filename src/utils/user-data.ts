import { getAuthContext } from "./auth";
import { Request, Response } from "express";

export const getUserData = async (req: Request, res: Response) => {
  const ctx = await getAuthContext(req.headers);
  if (!ctx) {
    throw new Error(
      "Should Never Happen: This should have been handled by the middleware",
    );
  }
  return ctx.user;
};
