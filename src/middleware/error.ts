import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error & { status?: number },
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status || 500;

  // Log the complete error trace to server console
  console.error('Error occurred:', err);

  const isProduction = process.env.NODE_ENV === 'production';
  const message = (status === 500 && isProduction)
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  res.status(status).json({ error: message, status });
}
