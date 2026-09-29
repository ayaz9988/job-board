import type { Response } from "express";

export type ErrorDetails = { field: string; message: string }[];

type ErrorBody = {
  status: "error";
  error: {
    message: string;
    details?: ErrorDetails;
  };
};

type SuccessBody<T> = {
  status: "success";
  data: T;
  meta?: Record<string, unknown>;
};

export function sendSuccess<T>(
  res: Response,
  data: T,
  options: { status?: number; meta?: Record<string, unknown> } = {},
): Response {
  const { status = 200, meta } = options;
  const body: SuccessBody<T> = { status: "success", data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function sendError(
  res: Response,
  status: number,
  message: string,
  details?: ErrorDetails,
): Response {
  const body: ErrorBody = { status: "error", error: { message } };
  if (details) body.error.details = details;
  return res.status(status).json(body);
}
