const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUser() {
  try {
    // Find existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    if (existingUser) {
      console.log('Existing user found:', existingUser);
      // Update the user id to match the JWT
      const updatedUser = await prisma.user.update({
        where: { email: 'test@example.com' },
        data: { id: '77eb38a2-9016-419b-972e-dd1a8651ea8c' },
      });
      console.log('User updated:', updatedUser);
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          id: '77eb38a2-9016-419b-972e-dd1a8651ea8c',
          email: 'test@example.com',
          name: 'Test User',
          password_hash: hashedPassword,
        },
      });
      console.log('User created:', user);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();