import type { Request, Response, NextFunction } from "express";

import { AppError } from "../errors/app-error.js";
import { HttpStatus } from "../utils/http-status.js";

export function notFound(req: Request, res: Response, next: NextFunction) {
  next(new AppError(HttpStatus.NOT_FOUND, `Route ${req.originalUrl} not found`));
}
