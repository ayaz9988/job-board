import "express";

declare global {
  namespace Express {
    interface Request {
      validated?: {
        params: Record<string, any>;
        query: Record<string, any>;
        body: Record<string, any>;
      };
    }
  }
}

export {};
