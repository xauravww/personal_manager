import { PrismaClient } from '@prisma/client';
import { aiService } from '../services/aiService';

const prisma = new PrismaClient();

async function addProgressLearning() {
  try {
    // Get test user
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (!user) {
      console.log('Test user not found');
      return;
    }

    console.log('Adding progress tracking learning content...\n');

    // Create Progress Tracking subject
    const textToEmbed = `Personal Progress Tracking Learn how to track your progress, set goals, and measure achievements across different areas of life`;
    const embeddingResponse = await aiService.createEmbeddings(textToEmbed);
    const embedding = JSON.stringify(embeddingResponse.data[0].embedding);

    const subject = await prisma.learningSubject.create({
      data: {
        user_id: user.id,
        name: 'Personal Progress Tracking',
        description: 'Learn how to track your progress, set goals, and measure achievements across different areas of life',
        current_level: 'beginner',
        embedding
      }
    });
    console.log(`✅ Created subject: ${subject.name}`);

    // Create modules
const modules = [
      {
        title: 'Understanding Progress Metrics',
        description: 'Learn about different types of progress measurements',
        content: 'Progress can be tracked through various metrics: completion rates, time spent, skill improvements, and achievement milestones. Understanding these helps you measure your growth effectively.',
        difficulty: 'easy',
        estimated_time: 90,
        order_index: 0
      },
      {
        title: 'Setting SMART Goals',
        description: 'Create specific, measurable, achievable goals',
        content: 'SMART goals are Specific, Measurable, Achievable, Relevant, and Time-bound. This framework helps you set clear objectives and track your progress toward them.',
        difficulty: 'medium',
        estimated_time: 120,
        order_index: 1
      }
    ];

    for (const moduleData of modules) {
      const moduleText = `${moduleData.title} ${moduleData.description} ${moduleData.content}`;
      const moduleEmbedding = await aiService.createEmbeddings(moduleText);
      const moduleEmbeddingStr = JSON.stringify(moduleEmbedding.data[0].embedding);

      await prisma.learningModule.create({
        data: {
          subject_id: subject.id,
          ...moduleData,
          embedding: moduleEmbeddingStr
        }
      });
      console.log(`✅ Created module: ${moduleData.title}`);
    }

    console.log('\n🎉 Progress tracking content added successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addProgressLearning();
