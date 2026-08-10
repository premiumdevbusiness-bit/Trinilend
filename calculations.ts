import { Request, Response, NextFunction } from 'express';

/**
 * API Key Authentication Middleware
 * Validates the x-api-key header against process.env.API_SECRET_KEY
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'];
  const secretKey = process.env.API_SECRET_KEY;

  if (!secretKey) {
    res.status(500).json({
      error: 'Server configuration error',
      details: 'API_SECRET_KEY is not configured',
    });
    return;
  }

  if (!apiKey || typeof apiKey !== 'string') {
    res.status(401).json({
      error: 'Unauthorized',
      details: 'Missing x-api-key header',
    });
    return;
  }

  // Use timing-safe comparison to prevent timing attacks
  try {
    const providedKey = Buffer.from(apiKey);
    const expectedKey = Buffer.from(secretKey);

    if (
      providedKey.length !== expectedKey.length ||
      !crypto.timingSafeEqual(providedKey, expectedKey)
    ) {
      res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid API key',
      });
      return;
    }
  } catch {
    res.status(401).json({
      error: 'Unauthorized',
      details: 'Invalid API key format',
    });
    return;
  }

  next();
}

// Need to import crypto for timingSafeEqual
import crypto from 'crypto';
