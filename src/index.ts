import dotenv from "dotenv";

dotenv.config();

import app from "./app";
import { httpLogger } from "./utils/logger";

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    httpLogger.info(`Server running on http://localhost:${PORT}`);
});

const shutdown = () => {
  httpLogger.info("Shutting down gracefully...");
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);