import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function verify() {
    console.log('📊 Verifying seeded data...\n');

    const user = await prisma.user.findFirst({
        where: { email: 'user@example.com' }
    });

    if (!user) {
        console.log('❌ User not found');
        return;
    }

    console.log(`✅ User: ${user.name} (${user.email})\n`);

    // Check subjects
    const subjects = await prisma.learningSubject.findMany({
        where: { user_id: user.id, is_active: true },
        include: {
            modules: {
                include: {
                    progress: { where: { user_id: user.id } }
                }
            },
            progress: { where: { user_id: user.id } }
        }
    });

    console.log(`📚 Found ${subjects.length} learning subjects:\n`);

    for (const subject of subjects) {
        const totalModules = subject.modules.length;
        const completedModules = subject.progress.filter(p => p.status === 'completed').length;
        const progressPercent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

        console.log(`  ${subject.name} (${progressPercent}% complete)`);
        console.log(`  └─ ${totalModules} modules, ${completedModules} completed\n`);

        for (const module of subject.modules) {
            const mProgress = module.progress[0];
            console.log(`     • ${module.title}`);
            console.log(`       Status: ${mProgress?.status || 'not_started'}`);
            console.log(`       Score: ${mProgress?.score || 'N/A'}\n`);
        }
    }

    // Check resources
    const resources = await prisma.resource.findMany({
        where: {
            user_id: user.id,
            OR: [
                { title: { contains: 'Python' } },
                { title: { contains: 'React' } }
            ]
        },
        include: {
            tags: true
        }
    });

    console.log(`\n📄 Found ${resources.length} learning resources:`);
    for (const resource of resources) {
        const hasEmbedding = resource.embedding ? '✓' : '✗';
        console.log(`  [${hasEmbedding}] ${resource.title}`);
        console.log(`      Tags: ${resource.tags.map(t => t.name).join(', ')}`);
    }

    console.log('\n✅ Verification complete!\n');
}

verify()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
