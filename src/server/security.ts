import type { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware.
 * Hardens the HTTP transport layer without restricting required iframe embeddings in the preview environment.
 */
export function applySecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Control referrer privacy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // XSS protection filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Disable client caching on all /api endpoints by default
  if (_req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}
