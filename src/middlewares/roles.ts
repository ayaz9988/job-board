import { NextFunction, Response, Request } from "express";
import { sendError } from "@/utils/response";

// Coarse role gate — run after authenticationMiddleware, which attaches req.user.
// Ownership checks (e.g. "is this MY job") stay in the controllers.
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 401, "Unauthorized");
    }
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Forbidden: this endpoint requires role ${allowedRoles.join(" or ")}`,
      );
    }
    next();
  };
};
