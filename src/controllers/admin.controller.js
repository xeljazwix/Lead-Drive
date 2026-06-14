import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { asyncHandler, sanitizeUser } from '../utils/helpers.js';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors.js';
import { purgeFile } from '../services/worm.service.js';

// ─── POST /api/admin/users ────────────────────────────────────────────────────
export const createUser = asyncHandler(async (req, res) => {
  const { username, password, role, storageQuota } = req.body;
  if (!username || !password) throw new BadRequestError('username and password are required');
  if (password.length < 8) throw new BadRequestError('Password must be at least 8 characters');

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new ConflictError('Username already taken');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      role: role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'USER',
      storageQuota: storageQuota ? BigInt(storageQuota) : undefined,
    },
  });

  res.status(201).json({ status: 'success', user: sanitizeUser(user) });
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
export const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page ?? '1', 10), 1);
  const limit = Math.min(parseInt(req.query.limit ?? '20', 10), 100);

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, username: true, role: true, storageQuota: true,
        storageUsed: true, isActive: true, createdAt: true,
      },
    }),
    prisma.user.count(),
  ]);

  res.json({ status: 'success', data: { users, total, page, limit } });
});

// ─── PATCH /api/admin/users/:id/quota ────────────────────────────────────────
export const updateQuota = asyncHandler(async (req, res) => {
  const { storageQuota } = req.body;
  if (!storageQuota) throw new BadRequestError('storageQuota is required');

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new NotFoundError('User not found');

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { storageQuota: BigInt(storageQuota) },
  });
  res.json({ status: 'success', user: sanitizeUser(updated) });
});

// ─── DELETE /api/admin/users/:id ─────────────────────────────────────────────
// Soft-deactivate: sets isActive=false. Files are retained.
// Can be called again with ?hard=true to perform hard delete + purge files.
export const deleteUser = asyncHandler(async (req, res) => {
  const hard = req.query.hard === 'true';

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new NotFoundError('User not found');

  if (req.user.id === user.id) throw new BadRequestError('Cannot delete your own account');

  if (!hard) {
    // Soft deactivate
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });
    return res.json({ status: 'success', message: 'User deactivated' });
  }

  // Hard delete: purge all physical files then cascade-delete DB records
  const versions = await prisma.fileVersion.findMany({
    where: { file: { ownerId: user.id } },
  });
  for (const v of versions) {
    purgeFile(v.physicalPath);
  }

  await prisma.user.delete({ where: { id: user.id } }); // Cascade handles DB
  res.json({ status: 'success', message: 'User and all associated data permanently deleted' });
});

// ─── GET /api/admin/security-logs ────────────────────────────────────────────
// Returns recent virus detections from a security log model (uses AccessLog for now,
// extended via structured logs emitted by errorHandler).
// In a real deployment, integrate with a SIEM / log aggregator.
export const getSecurityStats = asyncHandler(async (req, res) => {
  const [totalUsers, activeUsers, totalFiles, totalStorageAgg] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.file.count({ where: { isTrashed: false } }),
    prisma.user.aggregate({ _sum: { storageUsed: true } }),
  ]);

  res.json({
    status: 'success',
    stats: {
      totalUsers,
      activeUsers,
      totalFiles,
      totalStorageUsedBytes: totalStorageAgg._sum.storageUsed?.toString() ?? '0',
    },
  });
});
