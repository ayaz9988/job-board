import "express";
import type { AuthUser } from "./auth";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      validated?: {
        params: Record<string, unknown>;
        query: Record<string, unknown>;
        body: Record<string, unknown>;
      };
    }
  }
}

export {};
