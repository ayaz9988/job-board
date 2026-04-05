import { configDotenv } from "dotenv";
import { defineConfig } from "drizzle-kit";
configDotenv({ override: true, path: ".env" });

export default defineConfig({
  out: "./drizzle",
  schema: ["./src/db/schemas/schema.ts", "./src/db/schemas/schema-auth.ts"],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
