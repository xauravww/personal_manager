import { PrismaClient } from '@prisma/client';

// Use test database URL for SQLite
process.env.DATABASE_URL = 'file:./test.db';

const prisma = new PrismaClient();

// Set up test database
beforeAll(async () => {
  // Clean database before all tests
  await prisma.resource.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();
});

// Note: Individual test suites handle their own cleanup in afterEach

// Clean up after all tests
afterAll(async () => {
  await prisma.$disconnect();
});