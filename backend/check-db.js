const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db'
    }
  }
});

async function checkDB() {
  try {
    const userCount = await prisma.user.count();
    const resourceCount = await prisma.resource.count();

    console.log(`Users: ${userCount}`);
    console.log(`Resources: ${resourceCount}`);

    const users = await prisma.user.findMany();
    console.log('Users:');
    users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.name} (${u.id}) - ${u.email}`);
    });

    if (resourceCount > 0) {
      const resources = await prisma.resource.findMany({
        include: { tags: true }
      });
      console.log('\nResources:');
      resources.forEach((r, i) => {
        console.log(`${i + 1}. ${r.title} (${r.type}) - User: ${r.user_id}`);
        console.log(`   Content: ${r.content?.substring(0, 100)}...`);
        console.log(`   Description: ${r.description?.substring(0, 50)}...`);
        console.log(`   Tags: ${r.tags?.map(t => t.name).join(', ') || 'none'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDB();