import type { NextFunction, Request, Response } from "express";
import { httpLogger } from "@/utils/logger";
import { sendError } from "@/utils/response";

type HandlerError = Error & { status?: number };

export default function errorHandler(
  err: HandlerError,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const status = err.status || 500;
  httpLogger.error("Unhandled error", {
    error: err.message,
    stack: status === 500 ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });
  // Internal details never reach the client
  sendError(
    res,
    status,
    status === 500 ? "Internal Server Error" : err.message,
  );
}
