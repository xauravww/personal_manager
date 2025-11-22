const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanup() {
    console.log('🧹 Cleaning up old test data...');

    // Delete old user and all related data
    const deleted = await prisma.user.deleteMany({
        where: { email: 'test@learning.com' }
    });

    console.log(`✅ Deleted ${deleted.count} user(s)`);
}

cleanup()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
