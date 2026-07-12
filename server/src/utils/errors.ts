import type { Request, Response, NextFunction, RequestHandler } from 'express';

export class AppError extends Error {
  constructor(public status: number, message: string, public code = 'APP_ERROR') {
    super(message);
  }
}

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
