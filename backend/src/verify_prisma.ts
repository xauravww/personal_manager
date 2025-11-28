import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Checking Prisma Client...');
        // Check if knowledgeConnection property exists
        if ('knowledgeConnection' in prisma) {
            console.log('✅ prisma.knowledgeConnection exists');
        } else {
            console.error('❌ prisma.knowledgeConnection does NOT exist');
            // List available properties
            console.log('Available properties:', Object.keys(prisma).filter(k => !k.startsWith('_')));
        }

        // Try to count connections
        const count = await prisma.knowledgeConnection.count();
        console.log(`✅ Current connection count: ${count}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
