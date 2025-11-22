import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding learning data...');

    // Create test user
    const hashedPassword = await bcrypt.hash('test123', 10);

    const user = await prisma.user.upsert({
        where: { email: 'test@learning.com' },
        update: {},
        create: {
            email: 'test@learning.com',
            password_hash: hashedPassword,
            name: 'Test Learner'
        }
    });

    console.log('✅ Created user:', user.email);

    // Create a learning subject
    const subject = await prisma.learningSubject.create({
        data: {
            user_id: user.id,
            name: 'JavaScript Fundamentals',
            description: 'Master the core concepts of JavaScript programming',
            goals: JSON.stringify(['Understand variables and data types', 'Learn functions and scope', 'Master async programming'])
        }
    });

    console.log('✅ Created subject:', subject.name);

    // Create modules
    const module1 = await prisma.learningModule.create({
        data: {
            subject_id: subject.id,
            title: 'Variables and Data Types',
            description: 'Learn about JavaScript variables, primitive types, and type coercion',
            estimated_time: 30,
            difficulty: 'beginner',
            order_index: 0,
            checkpoints: JSON.stringify([
                {
                    title: 'What are Variables?',
                    description: 'Understanding var, let, and const declarations'
                },
                {
                    title: 'Primitive Data Types',
                    description: 'String, Number, Boolean, Null, Undefined, Symbol'
                },
                {
                    title: 'Type Coercion',
                    description: 'How JavaScript converts between types'
                }
            ])
        }
    });

    const module2 = await prisma.learningModule.create({
        data: {
            subject_id: subject.id,
            title: 'Functions and Scope',
            description: 'Master function declarations, expressions, and scope rules',
            estimated_time: 45,
            difficulty: 'beginner',
            order_index: 1,
            checkpoints: JSON.stringify([
                {
                    title: 'Function Declarations',
                    description: 'Creating and calling functions'
                },
                {
                    title: 'Arrow Functions',
                    description: 'Modern ES6 arrow function syntax'
                },
                {
                    title: 'Scope and Closures',
                    description: 'Understanding lexical scope and closures'
                }
            ])
        }
    });

    console.log('✅ Created modules:', module1.title, module2.title);

    // Complete the first module with personalized data
    await prisma.learningProgress.create({
        data: {
            user_id: user.id,
            subject_id: subject.id,
            module_id: module1.id,
            status: 'completed',
            score: 95,
            completed_at: new Date(),
            chat_history: JSON.stringify([
                { role: 'assistant', content: 'Welcome! Let\'s learn about variables.', timestamp: new Date() },
                { role: 'user', content: 'What is the difference between let and const?', timestamp: new Date() },
                { role: 'assistant', content: 'Great question! `let` allows reassignment while `const` creates a constant reference.', timestamp: new Date() }
            ]),
            quiz_attempts: JSON.stringify([
                {
                    question: 'Which keyword should you use for values that won\'t change?',
                    options: ['var', 'let', 'const', 'function'],
                    userAnswer: 2,
                    correctAnswer: 2,
                    isCorrect: true
                },
                {
                    question: 'What is type coercion?',
                    options: ['Forcing a type', 'Automatic type conversion', 'Type checking', 'None'],
                    userAnswer: 1,
                    correctAnswer: 1,
                    isCorrect: true
                }
            ]),
            identified_weaknesses: JSON.stringify([
                'Type coercion edge cases',
                'Symbol data type usage'
            ]),
            code_snippets: JSON.stringify([
                {
                    language: 'javascript',
                    code: 'const name = "John";\nlet age = 25;\nage = 26; // This works\n// name = "Jane"; // This would error',
                    checkpoint: 'What are Variables?'
                }
            ])
        }
    });

    console.log('✅ Completed module 1 with personalized data');
    console.log('\n📧 Email: test@learning.com');
    console.log('🔑 Password: test123');
    console.log(`\n🎯 Module ID: ${module1.id}`);
}

main()
    .catch((e) => {
        console.error('❌ Error seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
