import type { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Sliding window in-memory rate limiter middleware.
 * Prevents automated brute-force attacks against administrative and auth credentials.
 */
export function createRateLimiter(maxRequests: number, windowMs: number, customMessage?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Clean expired entries periodically
    const now = Date.now();
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';

    const record = rateLimitMap.get(clientIp);

    if (!record || now > record.resetAt) {
      rateLimitMap.set(clientIp, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        error: customMessage || `Rate limit exceeded. Too many attempts from this IP. Please wait ${retryAfterSeconds} seconds.`,
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    record.count += 1;
    next();
  };
}
