import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "@/errors/app-error";
import { logger } from "@/utils/logger";

const PRISMA_NOT_FOUND = new Set(["P2001", "P2018", "P2025"]);
const PRISMA_CONFLICT = new Set(["P2002", "P2003"]);

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (error instanceof AppError) {
    res.status(error.status).json({ code: error.code, message: error.message });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error("ErrorHandler", `Prisma error ${error.code}`, { meta: error.meta });

    if (PRISMA_NOT_FOUND.has(error.code)) {
      res.status(404).json({ code: "NOT_FOUND", message: "Record not found" });
      return;
    }
    if (PRISMA_CONFLICT.has(error.code)) {
      res.status(409).json({ code: "CONFLICT", message: "Unique or foreign-key constraint failed" });
      return;
    }
    if (error.code === "P2021") {
      res.status(500).json({ code: "DB_SCHEMA_ERROR", message: "Table does not exist — run prisma migrate deploy" });
      return;
    }
    res.status(500).json({ code: `PRISMA_${error.code}`, message: error.message });
    return;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    logger.error("ErrorHandler", "Prisma validation error", { error });
    res.status(400).json({ code: "INVALID_QUERY", message: "Invalid database query" });
    return;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    logger.error("ErrorHandler", "Prisma init error — DB unreachable", { error });
    res.status(503).json({ code: "DB_UNAVAILABLE", message: "Database connection failed — check DATABASE_URL and run migrations" });
    return;
  }

  logger.error("ErrorHandler", "💥 Unknown error occurred", { error });
  res.status(500).json({ code: "INTERNAL_ERROR", message: "Something went wrong" });
};
