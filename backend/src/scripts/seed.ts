import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { aiService } from '../services/aiService';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await prisma.assignmentSubmission.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.learningProgress.deleteMany();
    await prisma.learningModule.deleteMany();
    await prisma.learningSubject.deleteMany();
    await prisma.weakPoint.deleteMany();
    await prisma.mindMap.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.resource.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.searchLog.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Database cleared\n');

    // Create test user
    console.log('👤 Creating test user...');
    const hashedPassword = await bcrypt.hash('test123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password_hash: hashedPassword,
        name: 'Test User'
      }
    });
    console.log(`✅ Created user: ${user.email} (password: test123)\n`);

    // Create Learning Subjects with embeddings
    console.log('📚 Creating learning subjects...');

    const pythonSubject = await createSubjectWithEmbedding(user.id, {
      name: 'Python Programming',
      description: 'Learn Python from basics to advanced concepts including data structures, algorithms, and web development',
      current_level: 'beginner'
    });
    console.log(`✅ Created subject: ${pythonSubject.name}`);

    const webDevSubject = await createSubjectWithEmbedding(user.id, {
      name: 'Web Development',
      description: 'Full-stack web development with HTML, CSS, JavaScript, React, and Node.js',
      current_level: 'intermediate'
    });
    console.log(`✅ Created subject: ${webDevSubject.name}`);

    const mlSubject = await createSubjectWithEmbedding(user.id, {
      name: 'Machine Learning',
      description: 'Introduction to machine learning, neural networks, and artificial intelligence fundamentals',
      current_level: 'beginner'
    });
    console.log(`✅ Created subject: ${mlSubject.name}\n`);

    // Create Learning Modules with embeddings
    console.log('📖 Creating learning modules...');

    // Python modules
    await createModuleWithEmbedding(pythonSubject.id, {
      title: 'Python Basics',
      description: 'Variables, data types, operators, and control flow',
      content: 'Learn the fundamentals of Python programming including variables, data types, conditionals, and loops.',
      order_index: 0,
      difficulty: 'easy',
      estimated_time: 120
    });

    await createModuleWithEmbedding(pythonSubject.id, {
      title: 'Data Structures in Python',
      description: 'Lists, tuples, dictionaries, and sets',
      content: 'Master Python data structures including lists, tuples, dictionaries, sets, and their common operations.',
      order_index: 1,
      difficulty: 'medium',
      estimated_time: 180
    });

    await createModuleWithEmbedding(pythonSubject.id, {
      title: 'Object-Oriented Programming',
      description: 'Classes, objects, inheritance, and polymorphism',
      content: 'Understand OOP concepts in Python: classes, objects, inheritance, encapsulation, and polymorphism.',
      order_index: 2,
      difficulty: 'medium',
      estimated_time: 240
    });

    // Web Dev modules
    await createModuleWithEmbedding(webDevSubject.id, {
      title: 'HTML & CSS Fundamentals',
      description: 'Building blocks of web pages',
      content: 'Learn HTML structure, semantic tags, CSS styling, flexbox, and responsive design principles.',
      order_index: 0,
      difficulty: 'easy',
      estimated_time: 150
    });

    await createModuleWithEmbedding(webDevSubject.id, {
      title: 'JavaScript Essentials',
      description: 'Programming the web with JavaScript',
      content: 'Master JavaScript fundamentals: variables, functions, DOM manipulation, events, and async programming.',
      order_index: 1,
      difficulty: 'medium',
      estimated_time: 200
    });

    await createModuleWithEmbedding(webDevSubject.id, {
      title: 'React Development',
      description: 'Building modern UIs with React',
      content: 'Learn React components, hooks, state management, and building interactive user interfaces.',
      order_index: 2,
      difficulty: 'hard',
      estimated_time: 300
    });

    // ML modules
    await createModuleWithEmbedding(mlSubject.id, {
      title: 'Introduction to Machine Learning',
      description: 'ML concepts and terminology',
      content: 'Understand supervised vs unsupervised learning, regression, classification, and model evaluation.',
      order_index: 0,
      difficulty: 'medium',
      estimated_time: 180
    });

    await createModuleWithEmbedding(mlSubject.id, {
      title: 'Neural Networks Basics',
      description: 'How neural networks work',
      content: 'Learn about artificial neurons, activation functions, backpropagation, and training neural networks.',
      order_index: 1,
      difficulty: 'hard',
      estimated_time: 250
    });

    console.log('✅ Created 8 learning modules\n');

    // Create some resources with embeddings
    console.log('📄 Creating resources...');

    await createResourceWithEmbedding(user.id, {
      title: 'Python Official Documentation',
      description: 'The official Python 3 documentation',
      url: 'https://docs.python.org/3/',
      type: 'link',
      content: 'Comprehensive reference for Python programming language',
      tag_names: ['python', 'documentation', 'programming']
    });

    await createResourceWithEmbedding(user.id, {
      title: 'JavaScript Guide - MDN',
      description: 'Mozilla Developer Network JavaScript guide',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
      type: 'link',
      content: 'Complete guide to JavaScript programming for web development',
      tag_names: ['javascript', 'web development', 'documentation']
    });

    await createResourceWithEmbedding(user.id, {
      title: 'React Tutorial',
      description: 'Official React tutorial for beginners',
      url: 'https://react.dev/learn',
      type: 'link',
      content: 'Step-by-step tutorial for learning React from the official documentation',
      tag_names: ['react', 'javascript', 'frontend', 'tutorial']
    });

    await createResourceWithEmbedding(user.id, {
      title: 'Machine Learning Crash Course',
      description: 'Google\'s ML crash course',
      url: 'https://developers.google.com/machine-learning/crash-course',
      type: 'video',
      content: 'Fast-paced introduction to machine learning with TensorFlow APIs',
      tag_names: ['machine learning', 'AI', 'tensorflow', 'course']
    });

    console.log('✅ Created 4 resources\n');

    console.log('🎉 Seed complete!\n');
    console.log('📝 Test credentials:');
    console.log('   Email: test@example.com');
    console.log('   Password: test123');
    console.log('\n✨ You can now test semantic search with queries like:');
    console.log('   - "python programming basics"');
    console.log('   - "web development with react"');
    console.log('   - "machine learning introduction"');
    console.log('   - "what is my progress"');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Helper functions
async function createSubjectWithEmbedding(userId: string, data: any) {
  let embedding: string | null = null;
  try {
    const textToEmbed = `${data.name} ${data.description || ''}`;
    const embeddingResponse = await aiService.createEmbeddings(textToEmbed);
    embedding = JSON.stringify(embeddingResponse.data[0].embedding);
  } catch (error) {
    console.warn(`⚠️  Failed to generate embedding for subject: ${data.name}`);
  }

  return prisma.learningSubject.create({
    data: {
      user_id: userId,
      ...data,
      embedding
    }
  });
}

async function createModuleWithEmbedding(subjectId: string, data: any) {
  let embedding: string | null = null;
  try {
    const textToEmbed = `${data.title} ${data.description || ''} ${data.content || ''}`;
    const embeddingResponse = await aiService.createEmbeddings(textToEmbed);
    embedding = JSON.stringify(embeddingResponse.data[0].embedding);
  } catch (error) {
    console.warn(`⚠️  Failed to generate embedding for module: ${data.title}`);
  }

  return prisma.learningModule.create({
    data: {
      subject_id: subjectId,
      ...data,
      embedding
    }
  });
}

async function createResourceWithEmbedding(userId: string, data: any) {
  let embedding: string | null = null;
  const { tag_names, ...resourceData } = data;

  try {
    const textToEmbed = `${data.title} ${data.description || ''} ${data.content || ''}`;
    const embeddingResponse = await aiService.createEmbeddings(textToEmbed);
    embedding = JSON.stringify(embeddingResponse.data[0].embedding);
  } catch (error) {
    console.warn(`⚠️  Failed to generate embedding for resource: ${data.title}`);
  }

  // Create or connect tags
  const tags = tag_names ? await Promise.all(
    tag_names.map((name: string) =>
      prisma.tag.upsert({
        where: {
          user_id_name: { user_id: userId, name }
        },
        create: { user_id: userId, name },
        update: {}
      })
    )
  ) : [];

  return prisma.resource.create({
    data: {
      user_id: userId,
      ...resourceData,
      embedding,
      tags: {
        connect: tags.map(tag => ({ id: tag.id }))
      }
    }
  });
}

// Run seed
seed()
  .then(() => {
    console.log('\n✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });