import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { sendError } from "@/utils/response";

// Generic middleware factory
export const createValidationMiddleware = <T extends z.ZodTypeAny>(
  schema: T,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse({
        params: req.params,
        query: req.query,
        body: req.body,
      });

      req.validated = validatedData as unknown as Request["validated"];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(
          res,
          400,
          "Validation failed",
          error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        );
      }
      next(error);
    }
  };
};

// Typed accessor for controllers: guarantees the validation middleware ran
// and gives back data typed by the same schema.
export function getValidated<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): z.output<S> {
  if (!req.validated) {
    throw new Error(
      `Missing validated data for ${req.method} ${req.originalUrl} (schema: ${schema.description ?? "unnamed"})`,
    );
  }
  return req.validated as unknown as z.output<S>;
}
