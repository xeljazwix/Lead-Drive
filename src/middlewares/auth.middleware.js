import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { asyncHandler } from '../utils/helpers.js';

// ─── Verify JWT and attach user to request ────────────────────────────────────
export const authenticate = asyncHandler(async (req, _res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    throw new UnauthorizedError('Missing or malformed Authorization token');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Account not found or deactivated');
  }

  req.user = user;
  next();
});

// ─── Restrict to SUPER_ADMIN role ─────────────────────────────────────────────
export const requireSuperAdmin = asyncHandler(async (req, _res, next) => {
  if (req.user?.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('This action requires Super Admin privileges');
  }
  next();
});

// ─── Sign a JWT for a given user ──────────────────────────────────────────────
export function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  });
}
