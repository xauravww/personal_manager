import { PrismaClient } from '@prisma/client';
import { aiService } from '../services/aiService';

const prisma = new PrismaClient();

async function generateLearningEmbeddings() {
    console.log('🚀 Starting learning content embedding generation...\n');

    try {
        // Get all subjects without embeddings
        const subjectsWithoutEmbeddings = await prisma.learningSubject.findMany({
            where: {
                OR: [
                    { embedding: null },
                    { embedding: '' }
                ]
            }
        });

        console.log(`📚 Found ${subjectsWithoutEmbeddings.length} subjects without embeddings`);

        // Generate embeddings for subjects
        let subjectsProcessed = 0;
        for (const subject of subjectsWithoutEmbeddings) {
            try {
                const textToEmbed = `${subject.name} ${subject.description || ''} ${subject.goals || ''}`;
                const embeddingResponse = await aiService.createEmbeddings(textToEmbed);
                const embedding = JSON.stringify(embeddingResponse.data[0].embedding);

                await prisma.learningSubject.update({
                    where: { id: subject.id },
                    data: { embedding }
                });

                subjectsProcessed++;
                console.log(`✅ [${subjectsProcessed}/${subjectsWithoutEmbeddings.length}] Generated embedding for subject: ${subject.name}`);
            } catch (error) {
                console.error(`❌ Failed to generate embedding for subject ${subject.name}:`, error);
            }
        }

        // Get all modules without embeddings
        const modulesWithoutEmbeddings = await prisma.learningModule.findMany({
            where: {
                OR: [
                    { embedding: null },
                    { embedding: '' }
                ]
            },
            include: {
                subject: {
                    select: { name: true }
                }
            }
        });

        console.log(`\n📖 Found ${modulesWithoutEmbeddings.length} modules without embeddings`);

        // Generate embeddings for modules
        let modulesProcessed = 0;
        for (const module of modulesWithoutEmbeddings) {
            try {
                const textToEmbed = `${module.title} ${module.description || ''} ${module.content || ''}`;
                const embeddingResponse = await aiService.createEmbeddings(textToEmbed);
                const embedding = JSON.stringify(embeddingResponse.data[0].embedding);

                await prisma.learningModule.update({
                    where: { id: module.id },
                    data: { embedding }
                });

                modulesProcessed++;
                console.log(`✅ [${modulesProcessed}/${modulesWithoutEmbeddings.length}] Generated embedding for module: ${module.title} (${module.subject.name})`);
            } catch (error) {
                console.error(`❌ Failed to generate embedding for module ${module.title}:`, error);
            }
        }

        console.log('\n🎉 Migration complete!');
        console.log(`   Subjects processed: ${subjectsProcessed}/${subjectsWithoutEmbeddings.length}`);
        console.log(`   Modules processed: ${modulesProcessed}/${modulesWithoutEmbeddings.length}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the migration
generateLearningEmbeddings()
    .then(() => {
        console.log('\n✨ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
