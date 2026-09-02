import type { Response } from "express";
import type { ApiSuccessResponse } from "../domain/types";

export function sendSuccess<TData>(
  res: Response,
  data: TData,
  status = 200,
): void {
  const body: ApiSuccessResponse<TData> = { success: true, data };
  res.status(status).json(body);
}
