const fs = require('fs');

for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx === -1) continue;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).trim();
  process.env[key] = value;
}

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient({
    datasourceUrl:
      process.env.jacxi_DATABASE_URL ||
      process.env.DATABASE_URL ||
      process.env.jacxi_POSTGRES_URL ||
      process.env.jacxi_PRISMA_DATABASE_URL,
  });

  try {
    await prisma.user.deleteMany({
      where: { role: { not: 'admin' } },
    });

    const adminEmail = 'admin@jacxi.com';
    const hashed = await bcrypt.hash('admin123', 12);

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: 'JACXI Admin',
        role: 'admin',
        passwordHash: hashed,
      },
      create: {
        name: 'JACXI Admin',
        email: adminEmail,
        passwordHash: hashed,
        role: 'admin',
        phone: '+1 (555) 123-4567',
        address: '123 Shipping Street',
        city: 'Los Angeles',
        country: 'USA',
      },
    });

    const remainingNonAdminUsers = await prisma.user.findMany({
      where: { role: { not: 'admin' } },
      select: { email: true, role: true },
    });

    console.log('Admin seeded:', admin.email, admin.role);
    console.log('Remaining non-admin users:', remainingNonAdminUsers.length ? remainingNonAdminUsers.map((u) => u.email).join(', ') : 'none');
    console.log('Total users in DB:', await prisma.user.count());
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Admin-only seed failed:', error);
  process.exit(1);
});
