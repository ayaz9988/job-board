import { Response, Request, NextFunction } from "express";
import { httpLogger, formatHTTPLoggerResponse } from "@/utils/logger";

export const responseInterceptor = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Save the original response method
  const originalSend = res.send;

  let responseSent = false;

  // Override the response method
  res.send = function (body: any): Response {
    if (!responseSent) {
      if (res.statusCode < 400) {
        httpLogger.info(
          "Some Success message",
          formatHTTPLoggerResponse(req, res, body),
        );
      } else {
        httpLogger.error(
          body.message,
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
