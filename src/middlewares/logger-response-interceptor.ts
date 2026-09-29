import { Response, Request, NextFunction } from "express";
import { httpLogger, formatHTTPLoggerResponse } from "@/utils/logger";

// Works with the { status, error: { message } } envelope
const extractMessage = (body: unknown): string => {
  if (typeof body === "string") return body;
  if (typeof body === "object" && body !== null) {
    const record = body as Record<string, unknown>;
    const error = record.error as { message?: unknown } | undefined;
    if (typeof error?.message === "string") return error.message;
    if (typeof record.message === "string") return record.message;
  }
  return "Request completed";
};

export const responseInterceptor = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Save the original response method
  const originalSend = res.send;

  let responseSent = false;

  // Override the response method
  res.send = function (body?: unknown): Response {
    if (!responseSent) {
      if (res.statusCode < 400) {
        httpLogger.info(
          "Request succeeded",
          formatHTTPLoggerResponse(req, res, body),
        );
      } else {
        httpLogger.error(
          extractMessage(body),
          formatHTTPLoggerResponse(req, res, body),
        );
      }

      responseSent = true;
    }

    // Call the original response method
    return originalSend.call(this, body);
  };

  // Continue processing the request
  next();
};
