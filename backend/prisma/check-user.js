const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkUser() {
    const user = await prisma.user.findUnique({
        where: { email: 'test@learning.com' }
    });

    if (!user) {
        console.log('❌ User not found in database!');
        return;
    }

    console.log('✅ User found:');
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Password hash (first 30 chars):', user.password_hash.substring(0, 30));

    // Test password verification
    const testPassword = 'test123';
    const isValid = await bcrypt.compare(testPassword, user.password_hash);

    console.log('\n🔐 Password verification:');
    console.log('  Testing password:', testPassword);
    console.log('  Result:', isValid ? '✅ VALID' : '❌ INVALID');

    if (!isValid) {
        console.log('\n⚠️  Password does not match! Creating new hash...');
        const newHash = await bcrypt.hash(testPassword, 12);
        console.log('  New hash (first 30 chars):', newHash.substring(0, 30));
    }
}

checkUser()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
