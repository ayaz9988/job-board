import { httpLogger } from "@/utils/logger";

export default function errorHandler(err: any, req: any, res: any, _next: any) {
  httpLogger.error("Unhandled error", {
    error: err.message,
    path: req.path,
    method: req.method,
  });
  res.status(err.status || 500).json({
    message: err.status ? err.message : "Internal Server Error",
    status: "error",
    serverTime: new Date().toISOString(),
  });
}
