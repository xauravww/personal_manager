const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db'
    }
  }
});

async function addTestResources() {
  try {
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 12);
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password_hash: hashedPassword,
        name: 'Test User'
      }
    });

    // Create test resources
    await prisma.resource.createMany({
      data: [
        {
          user_id: user.id,
          title: 'Python Programming Guide',
          description: 'A comprehensive guide to Python programming',
          content: 'Python is a high-level programming language that is widely used for web development, data analysis, artificial intelligence, and more. This guide covers the basics of Python programming including variables, data types, control structures, functions, and object-oriented programming.',
          type: 'document'
        },
        {
          user_id: user.id,
          title: 'Machine Learning Notes',
          description: 'Notes on machine learning algorithms',
          content: 'Machine learning is a subset of AI that enables computers to learn from data without being explicitly programmed. Key concepts include supervised learning, unsupervised learning, neural networks, and deep learning.',
          type: 'note'
        },
        {
          user_id: user.id,
          title: 'Web Development Tutorial',
          description: 'Learn modern web development',
          content: 'Web development involves HTML, CSS, and JavaScript for frontend development, and languages like Python, Node.js, or PHP for backend development. Modern web development also includes frameworks like React, Vue, and Angular.',
          type: 'link'
        }
      ]
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '7d' }
    );

    console.log('Test resources added successfully');
    console.log('User ID:', user.id);
    console.log('Token:', token);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestResources();