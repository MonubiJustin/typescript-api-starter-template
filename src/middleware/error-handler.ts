import type { Request, Response, NextFunction } from "express";

import { logger } from "../config/logger.js";
import { AppError } from "../errors/app-error.js";
import { HttpStatus } from "../utils/http-status.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error(err)

  // Custom application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Unknown errors
  return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "Internal server error",
  });
}
