import { PrismaClient } from '@prisma/client';

import dotenv from 'dotenv';
import path from 'path';
import embeddingService from '../services/embeddingService';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function seed() {
    console.log('🌱 Starting seed...');

    // 1. Seed for Test Learner (the currently logged in user based on JWT)
    const targetUserId = '0ccdb3a8-2db1-4bfb-96e4-4a4937bf998c';

    let user = await prisma.user.findUnique({
        where: { id: targetUserId }
    });

    if (!user) {
        console.log(`User ${targetUserId} not found!`);
        process.exit(1);
    }

    console.log(`Seeding for user: ${user.name} (${user.email})`);
    const userId = user.id;

    // 2. Create Learning Subjects
    const subjects = [
        {
            name: 'Python Mastery',
            description: 'Comprehensive guide to Python programming from basics to advanced.',
            level: 'intermediate',
            modules: [
                { title: 'Python Basics', content: 'Variables, loops, functions.' },
                { title: 'Data Structures', content: 'Lists, dicts, sets, tuples.' },
                { title: 'OOP in Python', content: 'Classes, inheritance, polymorphism.' },
                { title: 'AsyncIO', content: 'Coroutines, tasks, event loops.' }
            ]
        },
        {
            name: 'React Development',
            description: 'Modern frontend development with React.',
            level: 'advanced',
            modules: [
                { title: 'Components & Props', content: 'Building blocks of React.' },
                { title: 'Hooks Deep Dive', content: 'useState, useEffect, useMemo.' },
                { title: 'State Management', content: 'Context API, Redux, Zustand.' }
            ]
        }
    ];

    for (const sub of subjects) {
        // Delete if exists to ensure fresh start with resources
        await prisma.learningSubject.deleteMany({
            where: { user_id: userId, name: sub.name }
        });

        // Delete existing resources for this subject to avoid duplicates
        await prisma.resource.deleteMany({
            where: {
                user_id: userId,
                title: { startsWith: sub.name }
            }
        });

        console.log(`Creating subject: ${sub.name}`);
        const subject = await prisma.learningSubject.create({
            data: {
                user_id: userId,
                name: sub.name,
                description: sub.description,
                current_level: sub.level,
                is_active: true
            }
        });

        // Create Modules & Progress
        for (const [index, mod] of sub.modules.entries()) {
            const module = await prisma.learningModule.create({
                data: {
                    subject_id: subject.id,
                    title: mod.title,
                    content: mod.content,
                    order_index: index,
                    estimated_time: 60
                }
            });

            // Create Progress (Random status)
            const status = Math.random() > 0.5 ? 'completed' : 'in_progress';
            const score = status === 'completed' ? Math.floor(Math.random() * 20) + 80 : null;

            await prisma.learningProgress.create({
                data: {
                    user_id: userId,
                    subject_id: subject.id,
                    module_id: module.id,
                    status: status,
                    score: score,
                    time_spent: Math.floor(Math.random() * 120)
                }
            });

            // Create Resource for Searchability
            // We create a 'document' resource representing this module
            const resourceContent = `Full content for ${mod.title} in ${sub.name}. \n\n ${mod.content} \n\n Status: ${status}`;

            console.log(`  Generating embedding for: ${mod.title}...`);
            let embedding: string | null = null;
            try {
                const embeddingVector = await embeddingService.generateEmbedding(resourceContent);
                embedding = JSON.stringify(embeddingVector);
            } catch (error) {
                console.warn(`  Failed to generate embedding for ${mod.title}, skipping embedding:`, error);
            }

            await prisma.resource.create({
                data: {
                    user_id: userId,
                    title: `${sub.name}: ${mod.title}`,
                    description: `Learning module for ${sub.name}. ${mod.content}`,
                    content: resourceContent,
                    type: 'document',
                    tags: {
                        connectOrCreate: [
                            { where: { user_id_name: { user_id: userId, name: 'learning' } }, create: { user_id: userId, name: 'learning' } },
                            { where: { user_id_name: { user_id: userId, name: sub.name.toLowerCase().split(' ')[0] } }, create: { user_id: userId, name: sub.name.toLowerCase().split(' ')[0] } },
                            { where: { user_id_name: { user_id: userId, name: 'course' } }, create: { user_id: userId, name: 'course' } }
                        ]
                    },
                    // Real embedding from AI service
                    embedding: embedding
                }
            });
        }
    }

    console.log('✅ Seeding completed!');
}

seed()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
