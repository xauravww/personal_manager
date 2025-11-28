
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
    try {
        const users = await prisma.user.findMany();
        console.log(`Users found: ${users.length}`);
        if (users.length > 0) {
            console.log(`User ID: ${users[0].id}`);
            const subjects = await prisma.learningSubject.findMany({
                where: { user_id: users[0].id }
            });
            console.log(`Learning Subjects found: ${subjects.length}`);
            subjects.forEach(s => console.log(`- Subject: ${s.name}, Active: ${s.is_active}`));

            const modules = await prisma.learningModule.findMany({
                where: { subject: { user_id: users[0].id } }
            });
            console.log(`Learning Modules found: ${modules.length}`);
        }
    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
