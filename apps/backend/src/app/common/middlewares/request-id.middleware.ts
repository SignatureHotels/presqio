import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
export function requestIdMiddleware(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  response.setHeader("x-request-id", randomUUID());
  next();
}
