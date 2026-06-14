import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { signToken } from '../middlewares/auth.middleware.js';
import { BadRequestError, UnauthorizedError, ConflictError } from '../utils/errors.js';
import { sanitizeUser, asyncHandler } from '../utils/helpers.js';

// ─── POST /api/auth/login ────────────────────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new BadRequestError('username and password are required');
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  const token = signToken(user.id);
  res.json({ status: 'success', token, user: sanitizeUser(user) });
});

// ─── POST /api/auth/register ─────────────────────────────────────────────────
// Self-registration creates USER role accounts only.
export const register = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new BadRequestError('username and password are required');
  }
  if (password.length < 8) {
    throw new BadRequestError('Password must be at least 8 characters');
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new ConflictError('Username already taken');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, passwordHash, role: 'USER' },
  });

  const token = signToken(user.id);
  res.status(201).json({ status: 'success', token, user: sanitizeUser(user) });
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
export const me = asyncHandler(async (req, res) => {
  res.json({ status: 'success', user: sanitizeUser(req.user) });
});
