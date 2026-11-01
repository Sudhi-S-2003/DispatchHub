import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding DispatchHub Database...');

  // 1. Create or update Master Admin Account
  const admin = await prisma.account.upsert({
    where: { email: 'admin@dispatchhub.com' },
    update: {},
    create: {
      name: 'DispatchHub SuperAdmin',
      email: 'admin@dispatchhub.com',
      role: Role.ADMIN,
      isTrusted: true,
      wallet: {
        create: {
          balance: 1000.00,
          currency: 'USD',
        },
      },
    },
    include: { wallet: true },
  });

  // Record initial admin top-up transaction
  if (admin.wallet) {
    const existingTx = await prisma.walletTransaction.findFirst({
      where: { walletId: admin.wallet.id },
    });

    if (!existingTx) {
      await prisma.walletTransaction.create({
        data: {
          walletId: admin.wallet.id,
          accountId: admin.id,
          amount: 1000.00,
          balanceBefore: 0.00,
          balanceAfter: 1000.00,
          type: 'ADMIN_TOPUP',
          description: 'Initial Master Admin treasury allocation',
          performedBy: 'SYSTEM_BOOTSTRAP',
        },
      });
    }
  }

  // 2. Create Demo Client Account (Acme Corp)
  const client = await prisma.account.upsert({
    where: { email: 'client@acme.com' },
    update: {},
    create: {
      name: 'Acme Corporation',
      email: 'client@acme.com',
      role: Role.CLIENT,
      isTrusted: false,
      wallet: {
        create: {
          balance: 50.00, // $50.00 starting balance
          currency: 'USD',
        },
      },
      domains: {
        create: {
          domainName: 'acme-corp.com',
          dkimSelector: 'postal',
          dkimPublicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC3z7...',
          dkimPrivateKey: '-----BEGIN RSA PRIVATE KEY-----\n...',
          spfRecord: 'v=spf1 a mx ip4:148.113.44.84 include:spf.postal.sudhi.online ~all',
          isSpfVerified: true,
          isDkimVerified: true,
          isMxVerified: true,
          status: 'ACTIVE',
        },
      },
    },
    include: { wallet: true },
  });

  if (client.wallet) {
    const existingTx = await prisma.walletTransaction.findFirst({
      where: { walletId: client.wallet.id },
    });

    if (!existingTx) {
      await prisma.walletTransaction.create({
        data: {
          walletId: client.wallet.id,
          accountId: client.id,
          amount: 50.00,
          balanceBefore: 0.00,
          balanceAfter: 50.00,
          type: 'ADMIN_TOPUP',
          description: 'Welcome promotional credit by Admin',
          performedBy: 'ADMIN: admin@dispatchhub.com',
        },
      });
    }
  }

  console.log(`✅ Seed complete!`);
  console.log(`   Admin: ${admin.email} (Wallet: $${admin.wallet?.balance})`);
  console.log(`   Client: ${client.email} (Wallet: $${client.wallet?.balance})`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
