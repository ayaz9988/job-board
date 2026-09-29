import winston from "winston";
import { randomBytes } from "crypto";
import { Request, Response } from "express";
import DailyRotateFile from "winston-daily-rotate-file";

const { combine, timestamp, json, printf } = winston.format;
const timestampFormat = "MMM-DD-YYYY HH:mm:ss";
const appVersion = process.env.npm_package_version;
const generateLogId = (): string => randomBytes(16).toString("hex");

export const httpLogger = winston.createLogger({
  format: combine(
    timestamp({ format: timestampFormat }),
    json(),
    printf(({ timestamp, level, message, ...data }) => {
      const response = {
        level,
        logId: generateLogId(),
        timestamp,
        appInfo: {
          appVersion,
          environment: process.env.NODE_ENV,
          proccessId: process.pid,
        },
        message,
        data,
      };
      // indenting logs for better readbility
      return JSON.stringify(response, null, 2);
    }),
  ),
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      filename: "logs/rotating-logs-%DATE%.log",
      datePattern: "MMMM-DD-YYYY",
      zippedArchive: false, // zip logs true/false
      maxSize: "20m", // rotate if file size exceeds 20 MB
      maxFiles: "14d", // max files
    }),
  ],
});

export const formatHTTPLoggerResponse = (
  req: Request,
  res: Response,
  responseBody: unknown,
) => {
  // Strip credential-bearing headers before they ever reach a log file
  const safeHeaders: Record<string, string | string[] | undefined> = {
    ...req.headers,
  };
  delete safeHeaders["authorization"];
  delete safeHeaders["cookie"];
  return {
    request: {
      headers: safeHeaders,
      host: req.headers.host,
      baseUrl: req.baseUrl,
      url: req.url,
      method: req.method,
      body: req.body,
      params: req?.params,
      query: req?.query,
      clientIp: req?.headers["x-forwarded-for"] ?? req?.socket.remoteAddress,
    },
    response: {
      headers: res.getHeaders(),
      statusCode: res.statusCode,
      body: redactLogData(responseBody),
    },
  };
};

export enum SensitiveKeys {
  Password = "password",
  NewPassword = "new_password",
  OldPassword = "old_password",
  RepeatPassword = "repeat_password",
}

const sensitiveKeysList = Object.values(SensitiveKeys) as string[];

export const redactLogData = (data: unknown): unknown => {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  // Drizzle model instances are returned as-is (no own enumerable secrets)
  if (data.constructor.name.startsWith("model")) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactLogData(item));
  }

  const redactedData: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeysList.includes(key.toLowerCase())) {
      redactedData[key] = "*****";
    } else {
      // Recursively redact sensitive keys within nested objects
      redactedData[key] = redactLogData(value);
    }
  }

  return redactedData;
};
