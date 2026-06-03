import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { errorHandler } from "@/middlewares/error-handler";
import { AppError } from "@/errors/app-error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockReq = {} as Request;

const makeMockRes = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  (res.json as jest.Mock).mockReturnValue(res);
  return res;
};

const mockNext = jest.fn() as unknown as NextFunction;

// ─── Suite ────────────────────────────────────────────────────────────────────

describe("errorHandler middleware", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("AppError", () => {
    it("responds with the AppError's status and code", () => {
      const res = makeMockRes();
      const err = new AppError(404, "NOT_FOUND", "Resource not found");

      errorHandler(err, mockReq, res, mockNext);

      expect((res.status as jest.Mock).mock.calls[0][0]).toBe(404);
      expect((res.json as jest.Mock).mock.calls[0][0]).toEqual({
        code: "NOT_FOUND",
        message: "Resource not found",
      });
    });

    it("responds with 409 for CANNOT_DELETE errors", () => {
      const res = makeMockRes();
      const err = new AppError(409, "CANNOT_DELETE", "Cannot delete an approved proposal");

      errorHandler(err, mockReq, res, mockNext);

      expect((res.status as jest.Mock).mock.calls[0][0]).toBe(409);
      expect((res.json as jest.Mock).mock.calls[0][0].code).toBe("CANNOT_DELETE");
    });

    it("responds with 400 for validation-style AppErrors", () => {
      const res = makeMockRes();
      const err = new AppError(400, "INVALID", "Cannot send empty proposal");

      errorHandler(err, mockReq, res, mockNext);

      expect((res.status as jest.Mock).mock.calls[0][0]).toBe(400);
    });
  });

  describe("PrismaClientKnownRequestError", () => {
    const makePrismaKnown = (code: string) =>
      new Prisma.PrismaClientKnownRequestError("Prisma error", {
        code,
        clientVersion: "6.0.0",
      });

    it("P2025 (record not found) → 404 NOT_FOUND", () => {
      const res = makeMockRes();

      errorHandler(makePrismaKnown("P2025"), mockReq, res, mockNext);

      expect((res.status as jest.Mock).mock.calls[0][0]).toBe(404);
      expect((res.json as jest.Mock).mock.calls[0][0].code).toBe("NOT_FOUND");
    });

    it("P2001 (record not found variant) → 404", () => {
      const res = makeMockRes();

      errorHandler(makePrismaKnown("P2001"), mockReq, res, mockNext);

      expect((res.status as jest.Mock).mock.calls[0][0]).toBe(404);
    });

    it("P2002 (unique constraint) → 409 CONFLICT", () => {
      const res = makeMockRes();

      errorHandler(makePrismaKnown("P2002"), mockReq, res, mockNext);

      expect((res.status as jest.Mock).mock.calls[0][0]).toBe(409);
      expect((res.json as jest.Mock).mock.calls[0][0].code).toBe("CONFLICT");
    });

    it("P2003 (foreign key constraint) → 409 CONFLICT", () => {
      const res = makeMockRes();

      errorHandler(makePrismaKnown("P2003"), mockReq, res, mockNext);

      expect((res.status as jest.Mock).mock.calls[0][0]).toBe(409);
    });

    it("P2021 (table does not exist) → 500 DB_SCHEMA_ERROR", () => {
      const res = makeMockRes();

      errorHandler(makePrismaKnown("P2021"), mockReq, res, mockNext);

      expect((res.status as jest.Mock).mock.calls[0][0]).toBe(500);
      expect((res.json as jest.Mock).mock.calls[0][0].code).toBe("DB_SCHEMA_ERROR");
    });
  });

  describe("PrismaClientValidationError", () => {
    it("→ 400 INVALID_QUERY", () => {
      const res = makeMockRes();
      const err = new Prisma.PrismaClientValidationError("Validation error", {
        clientVersion: "6.0.0",
      });

      errorHandler(err, mockReq, res, mockNext);

      expect((res.status as jest.Mock).mock.calls[0][0]).toBe(400);
      expect((res.json as jest.Mock).mock.calls[0][0].code).toBe("INVALID_QUERY");
    });
  });

  describe("PrismaClientInitializationError", () => {
    it("→ 503 DB_UNAVAILABLE", () => {
      const res = makeMockRes();
      const err = new Prisma.PrismaClientInitializationError("DB unreachable", "6.0.0");

      errorHandler(err, mockReq, res, mockNext);

      expect((res.status as jest.Mock).mock.calls[0][0]).toBe(503);
      expect((res.json as jest.Mock).mock.calls[0][0].code).toBe("DB_UNAVAILABLE");
    });
  });

  describe("Unknown errors", () => {
    it("plain Error → 500 INTERNAL_ERROR", () => {
      const res = makeMockRes();

      errorHandler(new Error("Unexpected"), mockReq, res, mockNext);

      expect((res.status as jest.Mock).mock.calls[0][0]).toBe(500);
      expect((res.json as jest.Mock).mock.calls[0][0].code).toBe("INTERNAL_ERROR");
    });

    it("thrown string → 500 INTERNAL_ERROR", () => {
      const res = makeMockRes();

      errorHandler("some string error", mockReq, res, mockNext);

      expect((res.status as jest.Mock).mock.calls[0][0]).toBe(500);
      expect((res.json as jest.Mock).mock.calls[0][0].code).toBe("INTERNAL_ERROR");
    });
  });
});
