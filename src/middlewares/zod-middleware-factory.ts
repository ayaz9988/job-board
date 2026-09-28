import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

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

      (req as any).validated = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.issues.map((e: any) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};
