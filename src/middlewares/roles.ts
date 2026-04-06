import { getAuthContext } from "@/utils/auth";
import { NextFunction, Response, Request } from "express";

export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ctx = await getAuthContext(req.headers);
    if (!ctx?.user || !allowedRoles.includes(ctx.user.role)) {
      return res.status(403).json({ error: "Wrong role" });
    }
    next();
  };
};
