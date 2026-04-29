import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;

  // PostgreSQL foreign key / not-found errors
  if (err.code === '23503') {
    res.status(400).json({ error: 'Referenced record does not exist', detail: err.message });
    return;
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    res.status(409).json({ error: 'Duplicate record', detail: err.message });
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error('[ErrorHandler]', err);
  }

  res.status(statusCode).json({
    error: err.message ?? 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

/** Wraps async route handlers so you don't need try/catch in every controller */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}