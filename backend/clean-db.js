const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db'
    }
  }
});

async function cleanDB() {
  try {
    await prisma.resource.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.user.deleteMany();
    console.log('Database cleaned');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDB();