import type { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - startedAt;
    console.log(`[api] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
}
