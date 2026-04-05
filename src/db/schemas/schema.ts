import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  pgEnum,
  varchar,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./schema-auth";

// Enums
export const jobStatus = pgEnum("job_status", ["open", "closed", "filled"]);
export const appStatus = pgEnum("app_status", [
  "applied",
  "reviewed",
  "interview",
  "rejected",
  "hired",
]);

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  employerId: text("employer_id")  // FIXED: uuid → text
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  location: varchar("location", { length: 100 }),
  status: jobStatus("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const applications = pgTable(
  "applications",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id")
      .references(() => jobs.id, { onDelete: "cascade" })
      .notNull(),
    seekerId: text("seeker_id")  // FIXED: uuid → text
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    status: appStatus("status").notNull().default("applied"),
    coverLetter: text("cover_letter"),
    appliedAt: timestamp("applied_at").defaultNow(),
  },
  (table) => ({
    uniqueJobSeeker: unique("applications_job_seeker_unique").on(
      table.jobId,
      table.seekerId,
    ),
  }),
);

export const skills = pgTable(
  "skills",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
  },
  (table) => ({
    nameUnique: unique("skills_name_unique").on(table.name),
  }),
);

export const userSkills = pgTable(
  "user_skills",
  {
    userId: text("user_id")  // FIXED: uuid → text
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    skillId: integer("skill_id")
      .references(() => skills.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => ({
    pk: { columns: [table.userId, table.skillId], name: "user_skills_pk" },
  }),
);

export const jobSkills = pgTable(
  "job_skills",
  {
    jobId: integer("job_id")
      .references(() => jobs.id, { onDelete: "cascade" })
      .notNull(),
    skillId: integer("skill_id")
      .references(() => skills.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => ({
    pk: { columns: [table.jobId, table.skillId], name: "job_skills_pk" },
  }),
);

// Relations
export const userRelations = relations(user, ({ many }) => ({
  jobs: many(jobs),
  applications: many(applications),
  skills: many(userSkills),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  employer: one(user, {
    fields: [jobs.employerId],
    references: [user.id],
  }),
  applications: many(applications),
  skills: many(jobSkills),
}));