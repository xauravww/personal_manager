import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function checkResources() {
    const targetUserId = '0ccdb3a8-2db1-4bfb-96e4-4a4937bf998c'; // Test Learner

    console.log('🔍 Checking resources for Test Learner...\n');

    const resources = await prisma.resource.findMany({
        where: {
            user_id: targetUserId,
            OR: [
                { title: { contains: 'Python' } },
                { title: { contains: 'React' } }
            ]
        },
        include: {
            tags: true
        }
    });

    console.log(`Found ${resources.length} Python/React resources:\n`);

    resources.forEach((r, i) => {
        console.log(`${i + 1}. ${r.title}`);
        console.log(`   Type: ${r.type}`);
        console.log(`   Tags: ${r.tags.map(t => t.name).join(', ')}`);
        console.log(`   Has Embedding: ${r.embedding ? 'Yes' : 'No'}`);
        console.log(`   Content preview: ${r.content?.substring(0, 80)}...`);
        console.log('');
    });

    // Also check learning subjects
    const subjects = await prisma.learningSubject.findMany({
        where: { user_id: targetUserId },
        include: {
            modules: true
        }
    });

    console.log(`\n📚 Found ${subjects.length} learning subjects:`);
    subjects.forEach(s => {
        console.log(`- ${s.name} (${s.modules.length} modules)`);
    });
}

checkResources()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
