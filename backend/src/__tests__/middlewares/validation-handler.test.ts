import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validationMiddleware } from "@/middlewares/validation-handler";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeReq = (body: unknown) => ({ body } as Request);

const makeMockRes = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  (res.json as jest.Mock).mockReturnValue(res);
  return res;
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe("validationMiddleware", () => {
  const TestSchema = z.object({
    name: z.string().min(1),
    age: z.number().positive(),
  });

  it("calls next() when body matches the schema", () => {
    const next = jest.fn() as unknown as NextFunction;
    const req = makeReq({ name: "Alice", age: 30 });
    const res = makeMockRes();

    validationMiddleware(TestSchema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("replaces req.body with the parsed (coerced) value on success", () => {
    const next = jest.fn() as unknown as NextFunction;
    const SchemaWithDefault = z.object({
      status: z.enum(["DRAFT", "SENT"]),
    });
    const req = makeReq({ status: "DRAFT" });
    const res = makeMockRes();

    validationMiddleware(SchemaWithDefault)(req, res, next);

    expect(req.body).toEqual({ status: "DRAFT" });
  });

  it("responds with 400 and errors array when body is invalid", () => {
    const next = jest.fn() as unknown as NextFunction;
    const req = makeReq({ name: "", age: -5 });
    const res = makeMockRes();

    validationMiddleware(TestSchema)(req, res, next);

    expect((res.status as jest.Mock).mock.calls[0][0]).toBe(400);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.message).toBe("Validation failed");
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors.length).toBeGreaterThan(0);
    expect(next).not.toHaveBeenCalled();
  });

  it("each error entry has path and message", () => {
    const next = jest.fn() as unknown as NextFunction;
    const req = makeReq({ name: 123, age: "not-a-number" });
    const res = makeMockRes();

    validationMiddleware(TestSchema)(req, res, next);

    const errors = (res.json as jest.Mock).mock.calls[0][0].errors;
    errors.forEach((e: { path: string; message: string }) => {
      expect(typeof e.path).toBe("string");
      expect(typeof e.message).toBe("string");
    });
  });

  it("does not call next() when validation fails", () => {
    const next = jest.fn() as unknown as NextFunction;
    const req = makeReq({});
    const res = makeMockRes();

    validationMiddleware(TestSchema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });

  it("calls next(error) for non-ZodError exceptions", () => {
    const next = jest.fn() as unknown as NextFunction;
    const brokenSchema = {
      parse: () => {
        throw new Error("Unexpected schema crash");
      },
    } as unknown as z.ZodSchema;
    const req = makeReq({ name: "Alice" });
    const res = makeMockRes();

    validationMiddleware(brokenSchema)(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it("works with the real CreateProposalSchema", () => {
    const { CreateProposalSchema } = require("@/modules/proposals/schemas/proposal-schema");
    const next = jest.fn() as unknown as NextFunction;

    // valid
    const reqValid = makeReq({ reservationId: "some-id" });
    const resValid = makeMockRes();
    validationMiddleware(CreateProposalSchema)(reqValid, resValid, next);
    expect(next).toHaveBeenCalledTimes(1);

    // invalid — empty reservationId
    const reqInvalid = makeReq({ reservationId: "" });
    const resInvalid = makeMockRes();
    const nextInvalid = jest.fn() as unknown as NextFunction;
    validationMiddleware(CreateProposalSchema)(reqInvalid, resInvalid, nextInvalid);
    expect((resInvalid.status as jest.Mock).mock.calls[0][0]).toBe(400);
  });
});
