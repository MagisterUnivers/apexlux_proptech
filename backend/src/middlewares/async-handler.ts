import { NextFunction, Request, Response } from "express";

export const asyncHandler = (
  ctrl: (
    req: Request | any,
    res: Response | any,
    next: NextFunction,
  ) => Promise<void>,
) => {
  return (req: Request | any, res: Response | any, next: NextFunction) => {
    ctrl(req, res, next).catch(next);
  };
};
