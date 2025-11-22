import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function listUsers() {
    console.log('📋 Listing all users in database...\n');

    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            created_at: true
        }
    });

    console.log(`Found ${users.length} users:\n`);

    users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Created: ${user.created_at}\n`);
    });
}

listUsers()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
