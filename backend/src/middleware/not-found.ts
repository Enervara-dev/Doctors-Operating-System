import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/api-error";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound("NOT_FOUND", `No route matches ${req.method} ${req.originalUrl}.`));
}
