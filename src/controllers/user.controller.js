import prisma from '../utils/prisma.js';
import { asyncHandler } from '../utils/helpers.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

// ─── GET /api/users/search ───────────────────────────────────────────────────
export const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const query = q ? q.trim() : '';

  // Search by username containing the query, exclude the current user, max 10
  const users = await prisma.user.findMany({
    where: {
      ...(query && {
        username: {
          contains: query,
          mode: 'insensitive',
        },
      }),
      id: {
        not: req.user.id,
      },
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
    },
    take: 10,
    orderBy: {
      username: 'asc',
    },
  });

  res.json({ status: 'success', users });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, username } = req.body;
  const userId = req.user.id;

  if (username && username !== req.user.username) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new BadRequestError('Username is already taken');
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fullName !== undefined && { fullName }),
      ...(username !== undefined && { username })
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
      role: true,
      storageQuota: true,
      storageUsed: true,
    }
  });

  res.json({ message: 'Profile updated successfully', user: updated });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    throw new BadRequestError('Current and new passwords are required');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  
  if (!isMatch) {
    throw new UnauthorizedError('Incorrect current password');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });

  res.json({ message: 'Password updated successfully' });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const file = req.file;

  if (!file) {
    throw new BadRequestError('No image uploaded');
  }

  if (!file.mimetype.startsWith('image/')) {
    throw new BadRequestError('File must be an image');
  }

  const ext = path.extname(file.originalname);
  const newFilename = `${userId}-${Date.now()}${ext}`;
  const destPath = path.join(process.cwd(), 'public', 'uploads', 'avatars', newFilename);

  fs.copyFileSync(file.path, destPath);
  fs.unlinkSync(file.path);
  const avatarUrl = `/uploads/avatars/${newFilename}`;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
      role: true,
      storageQuota: true,
      storageUsed: true,
    }
  });

  res.json({ message: 'Avatar updated successfully', user: updated });
});
