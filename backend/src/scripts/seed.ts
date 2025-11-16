import prisma from '../config/database';
import aiService from '../services/aiService';

async function seedDatabase() {
  try {
    console.log('Seeding database with test resources...');

    // Get the test user
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    if (!user) {
      console.log('Test user not found. Please create a user with email test@example.com first.');
      return;
    }

    const testResources = [
      {
        title: 'The Pragmatic Programmer',
        description: 'A guide to becoming a better programmer',
        type: 'document' as const,
        content: 'This book covers best practices for software development, including code organization, testing, and career development.',
        tags: ['programming', 'book', 'software development']
      },
      {
        title: 'Machine Learning Notes',
        description: 'Personal notes on machine learning concepts',
        type: 'note' as const,
        content: 'Key concepts: supervised learning, unsupervised learning, neural networks, deep learning, reinforcement learning.',
        tags: ['machine learning', 'ai', 'notes']
      },
      {
        title: 'React Documentation',
        description: 'Official React documentation link',
        type: 'link' as const,
        url: 'https://reactjs.org/docs',
        content: 'Comprehensive documentation for React, including guides, API reference, and tutorials.',
        tags: ['react', 'javascript', 'frontend']
      },
      {
        title: 'Database Design Principles',
        description: 'Notes on database design and normalization',
        type: 'note' as const,
        content: 'First normal form, second normal form, third normal form. Entity-relationship diagrams, primary keys, foreign keys.',
        tags: ['database', 'design', 'sql']
      },
      {
        title: 'Python Tutorial Video',
        description: 'Beginner Python programming tutorial',
        type: 'video' as const,
        url: 'https://example.com/python-tutorial',
        content: 'A comprehensive video tutorial covering Python basics, data structures, and object-oriented programming.',
        tags: ['python', 'tutorial', 'programming']
      }
    ];

    for (const resourceData of testResources) {
      // Create resource
      const resource = await prisma.resource.create({
        data: {
          user_id: user.id,
          title: resourceData.title,
          description: resourceData.description,
          url: resourceData.url,
          type: resourceData.type,
          content: resourceData.content,
        },
      });

      // Create tags
      for (const tagName of resourceData.tags) {
        const tag = await prisma.tag.upsert({
          where: {
            user_id_name: {
              user_id: user.id,
              name: tagName,
            },
          },
          update: {},
          create: {
            user_id: user.id,
            name: tagName,
          },
        });

        await prisma.resource.update({
          where: { id: resource.id },
          data: {
            tags: {
              connect: { id: tag.id },
            },
          },
        });
      }

      // Generate embedding
      try {
        const textToEmbed = `${resource.title} ${resource.description || ''} ${resource.content || ''}`.trim();
        if (textToEmbed) {
          const embeddingResponse = await aiService.createEmbeddings(textToEmbed);
          const embedding = embeddingResponse.data[0].embedding;
          await prisma.resource.update({
            where: { id: resource.id },
            data: { embedding: JSON.stringify(embedding) },
          });
          console.log(`Generated embedding for: ${resource.title}`);
        }
      } catch (error) {
        console.warn(`Failed to generate embedding for ${resource.title}:`, error);
      }

      console.log(`Created resource: ${resource.title}`);
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();