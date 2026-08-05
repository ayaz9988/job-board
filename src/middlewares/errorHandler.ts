export default function errorHandler(err: any, req: any, res: any, _next: any) {
  console.error(`Error occurred: ${err.message}`, {
    error: err,
    path: req.path,
    method: req.method,
  });
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    status: "error",
    serverTime: new Date().toISOString(),
  });
}
