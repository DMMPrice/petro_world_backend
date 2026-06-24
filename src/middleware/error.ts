import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function errorHandler(
  err: Error & { status?: number },
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status || 500;

  // Log the complete error trace to server console
  logger.error(`Error occurred: ${err.message}`, { stack: err.stack });

  const isProduction = process.env.NODE_ENV === 'production';
  const message = (status === 500 && isProduction)
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  res.status(status).json({ error: message, status });
}
