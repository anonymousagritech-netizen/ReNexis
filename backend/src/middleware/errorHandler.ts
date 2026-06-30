import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '@/utils/errors';
import { logger } from '@/lib/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error({ err }, err.message);
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Prisma known errors
  const anyErr = err as any;
  if (anyErr?.code === 'P2002') {
    return res.status(409).json({ error: 'A record with this unique value already exists.' });
  }
  if (anyErr?.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found.' });
  }

  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({ error: 'Internal server error' });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}
