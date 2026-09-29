import { auth } from "@/utils/auth";
import { fromNodeHeaders } from "better-auth/node";
import { NextFunction, Request, Response } from "express";
import { sendError } from "@/utils/response";
import type { AuthUser } from "@/types/auth";

export async function authenticationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session || !session.user) {
      return sendError(res, 401, "Unauthorized");
    }
    // Attach once: role guards and controllers reuse it instead of
    // re-querying the session on every hop.
    req.user = session.user as unknown as AuthUser;
    next();
  } catch (err) {
    next(err);
  }
}
