#!/usr/bin/env node
// ─── Super Admin Bootstrap Script ────────────────────────────────────────────
// Usage: npm run setup-admin
//
// Checks if a SUPER_ADMIN exists. If not, creates one using:
//   1. INITIAL_ADMIN_USERNAME env var (default: 'superadmin')
//   2. INITIAL_ADMIN_PASSWORD env var (if set)
//   3. Auto-generated cryptographically random 24-char password (if no env password)
//
// The generated password is printed ONCE to stdout. Store it securely.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

function generateSecurePassword(length = 24) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes).map(b => charset[b % charset.length]).join('');
}

async function main() {
  console.log('\n── Neumorphic Cloud Drive: Super Admin Setup ──\n');

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (existingAdmin) {
    console.log(`✓ Super Admin already exists: "${existingAdmin.username}"`);
    console.log('  No action taken.\n');
    return;
  }

  const username = process.env.INITIAL_ADMIN_USERNAME ?? 'superadmin';
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? generateSecurePassword();
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      username,
      passwordHash,
      role: 'SUPER_ADMIN',
      // Super Admin gets unlimited quota (max BigInt value)
      storageQuota: BigInt('9223372036854775807'),
    },
  });

  console.log('✓ Super Admin created successfully!\n');
  console.log('  ┌─────────────────────────────────────────┐');
  console.log(`  │  Username : ${username.padEnd(27)} │`);
  console.log(`  │  Password : ${password.padEnd(27)} │`);
  console.log('  │                                         │');
  console.log('  │  ⚠  SAVE THIS PASSWORD NOW.             │');
  console.log('  │     It will NOT be shown again.         │');
  console.log('  └─────────────────────────────────────────┘\n');

  console.log(`  User ID: ${admin.id}\n`);
}

main()
  .catch(err => {
    console.error('Setup failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
