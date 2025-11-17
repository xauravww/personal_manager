const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db'
    }
  }
});

async function debugSQL() {
  try {
    const userId = 'e0ba766d-d2ab-45db-9ed6-b114fead3b3b';

    // Test basic query
    console.log('Testing basic resource query...');
    const basicResources = await prisma.resource.findMany({
      where: { user_id: userId }
    });
    console.log(`Found ${basicResources.length} resources with basic query`);

    // Test LIKE query
    console.log('\nTesting LIKE query...');
    const likeResources = await prisma.resource.findMany({
      where: {
        user_id: userId,
        title: { contains: 'python' }
      }
    });
    console.log(`Found ${likeResources.length} resources with LIKE query`);
    likeResources.forEach(r => console.log(`- ${r.title}`));

    // Test raw SQL
    console.log('\nTesting raw SQL...');
    const rawResources = await prisma.$queryRawUnsafe(`
      SELECT * FROM resources
      WHERE user_id = ?
      AND (title LIKE ? OR content LIKE ? OR description LIKE ?)
    `, userId, '%python%', '%python%', '%python%');
    console.log(`Found ${rawResources.length} resources with raw SQL`);
    rawResources.forEach(r => console.log(`- ${r.title}`));

    // Test the exact query from the service
    console.log('\nTesting exact service query...');
    const serviceQuery = `
      SELECT r.*, '' as tag_names
      FROM resources r
      WHERE r.user_id = ?
      AND ((r.title LIKE ? OR r.content LIKE ? OR r.description LIKE ?))
      LIMIT 10
    `;
    const serviceResources = await prisma.$queryRawUnsafe(serviceQuery, userId, '%python%', '%python%', '%python%');
    console.log(`Found ${serviceResources.length} resources with service query`);
    serviceResources.forEach(r => console.log(`- ${r.title}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSQL();