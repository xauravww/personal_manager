import { execSync } from 'child_process';
import prisma from '../config/database';

async function initDatabase() {
  try {
    console.log('Initializing database with Prisma...');

    // Push the schema to the database
    execSync('npx prisma db push', { stdio: 'inherit' });

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initDatabase();