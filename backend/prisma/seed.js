import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding DispatchHub production database...');

  // 1. Seed Master Admin Account
  const admin = await prisma.account.upsert({
    where: { email: 'admin@dispatchhub.com' },
    update: {
      apiKey: 'dh_live_master_admin_key_9988',
      isTrusted: true,
      isActive: true,
    },
    create: {
      name: 'DispatchHub SuperAdmin',
      email: 'admin@dispatchhub.com',
      role: Role.ADMIN,
      isTrusted: true,
      isActive: true,
      apiKey: 'dh_live_master_admin_key_9988',
      wallet: {
        create: {
          balance: 1000.0,
          currency: 'USD',
        },
      },
    },
    include: { wallet: true },
  });

  console.log(`✅ Master Admin ready: ${admin.email} (Wallet: $${admin.wallet?.balance})`);

  // 2. Seed Demo Client Account (Acme Corp)
  const client = await prisma.account.upsert({
    where: { email: 'client@acme.com' },
    update: {
      apiKey: 'dh_live_client_key_1122',
      isActive: true,
    },
    create: {
      name: 'Acme Corporation',
      email: 'client@acme.com',
      role: Role.CLIENT,
      isTrusted: false,
      isActive: true,
      apiKey: 'dh_live_client_key_1122',
      wallet: {
        create: {
          balance: 50.0,
          currency: 'USD',
        },
      },
    },
    include: { wallet: true },
  });

  console.log(`✅ Demo Client ready: ${client.email} (Wallet: $${client.wallet?.balance})`);
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
