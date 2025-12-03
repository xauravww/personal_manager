import { PrismaClient } from '@prisma/client';

// Ensure DATABASE_URL has connection limit to prevent connection exhaustion
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && !databaseUrl.includes('connection_limit')) {
  process.env.DATABASE_URL = `${databaseUrl}?connection_limit=10`;
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Test the connection
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL database with Prisma');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
}

if (process.env.NODE_ENV !== 'test') {
  testConnection();
}

export default prisma;