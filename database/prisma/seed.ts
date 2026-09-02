import fs from 'node:fs';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import { ROLES } from '../../backend/src/rbac/catalog';
import { seedRbacCatalog } from '../../backend/src/rbac/seed-catalog';
import { shouldSeedDemoDataFromEnv } from '../../backend/src/features/demo';
import { seedBharatBidDemoData } from '../../backend/src/problem/seed';

const repoRoot = path.resolve(__dirname, '../..');
const envPath = path.join(repoRoot, '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const DEMO_PASSWORD = 'demo-password';

const DEMO_USERS = [
  {
    email: 'demo.admin@example.com',
    displayName: 'Demo Admin',
    role: ROLES.ADMIN,
  },
  {
    email: 'demo.officer@example.com',
    displayName: 'Demo Procurement Officer',
    role: ROLES.PROCUREMENT_OFFICER,
  },
  {
    email: 'demo.reviewer@example.com',
    displayName: 'Demo Reviewer',
    role: ROLES.REVIEWER,
  },
] as const;

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  const { roles } = await seedRbacCatalog(prisma);

  if (!shouldSeedDemoDataFromEnv()) {
    console.log('Seeded RBAC catalog. Skipped demo users because DEMO_MODE is off.');
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = [];
  for (const demoUser of DEMO_USERS) {
    const role = roles.get(demoUser.role);
    if (!role) {
      throw new Error(`Missing seeded role: ${demoUser.role}`);
    }

    const user = await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {
        displayName: demoUser.displayName,
        passwordHash,
        status: 'active',
      },
      create: {
        email: demoUser.email,
        displayName: demoUser.displayName,
        passwordHash,
        status: 'active',
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id,
      },
    });

    users.push({ ...demoUser, id: user.id });
  }

  const notifications: Array<{
    userId: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    body: string;
  }> = [
    {
      userId: users[0].id,
      type: 'success',
      title: 'Welcome to BharatBid',
      body: 'Your admin demo account is ready. DEMO / SYNTHETIC data only — not a real credential notice.',
    },
    {
      userId: users[1].id,
      type: 'info',
      title: 'Officer briefing',
      body: 'Open the Command Center to continue the CPCL DEMO tender walkthrough.',
    },
    {
      userId: users[2].id,
      type: 'info',
      title: 'Reviewer briefing',
      body: 'Reviewer access is read-oriented for officer review preparation. DEMO / SYNTHETIC only.',
    },
  ];

  for (const notification of notifications) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: notification.userId,
        title: notification.title,
      },
      select: { id: true },
    });

    if (!existing) {
      await prisma.notification.create({ data: notification });
    }
  }

  console.log('Seeded demo roles, permissions, users, and notifications.');
  await seedBharatBidDemoData(prisma);
  console.log('Seeded BharatBid demo tenders, requirements, bidders, bid submissions, and synthetic documents.');
  console.log('Demo login (local/demo only, not a real credential):');
  for (const user of DEMO_USERS) {
    console.log(`  ${user.email} / ${DEMO_PASSWORD} (${user.role})`);
  }
}

seed()
  .catch((error: unknown) => {
    console.error('Database seed failed');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
