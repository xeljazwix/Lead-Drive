import rateLimit from 'express-rate-limit';

// ─── Shared handler ───────────────────────────────────────────────────────────
const handler = (req, res) => {
  res.status(429).json({
    status: 'error',
    message: 'Too many requests. Please try again later.',
    retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
  });
};

// ─── Login Limiter — 10 attempts per 15 minutes per IP ───────────────────────
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  message: 'Too many login attempts.',
});

// ─── Upload Limiter — 50 uploads per hour per IP ──────────────────────────────
// Volumetric attack mitigation for the upload pipeline
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  message: 'Upload rate limit exceeded.',
});

// ─── General API Limiter — 200 req per 15 min per IP ─────────────────────────
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});
