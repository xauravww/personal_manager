import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function resetEmbeddings() {
    console.log('🔄 Resetting all embeddings...\n');

    // Get count before
    const totalBefore = await prisma.resource.count();
    const withEmbeddingsBefore = await prisma.resource.count({
        where: { embedding: { not: null } }
    });

    console.log(`📊 Current state:`);
    console.log(`   Total resources: ${totalBefore}`);
    console.log(`   With embeddings: ${withEmbeddingsBefore}\n`);

    // Reset all embeddings to null
    const result = await prisma.resource.updateMany({
        data: { embedding: null }
    });

    console.log(`✅ Reset ${result.count} resources`);
    console.log(`   All embeddings set to null\n`);

    // Verify
    const withEmbeddingsAfter = await prisma.resource.count({
        where: { embedding: { not: null } }
    });

    console.log(`📊 After reset:`);
    console.log(`   Resources with embeddings: ${withEmbeddingsAfter}`);

    if (withEmbeddingsAfter === 0) {
        console.log('\n✅ All embeddings successfully cleared!');
    } else {
        console.log('\n⚠️  Warning: Some embeddings still exist');
    }
}

resetEmbeddings()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
