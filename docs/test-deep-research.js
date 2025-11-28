const request = require('supertest');
const app = require('./backend/src/index');
const { createTestUser } = require('./backend/src/__tests__/testUtils');

async function testDeepResearch() {
  try {
    // Create a test user
    const testUser = await createTestUser('test-deep-research@example.com');

    console.log('Created test user:', testUser.email);

    // Test deep research query
    const response = await request(app)
      .get('/api/search')
      .query({
        q: 'what is the current nextjs version',
        focusMode: 'deep-research',
        timezone: 'UTC'
      })
      .set('Authorization', `Bearer ${testUser.token}`)
      .expect(200);

    console.log('Deep research response:');
    console.log('Success:', response.body.success);
    console.log('Message:', response.body.data?.message);
    console.log('AI Info:', response.body.ai);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testDeepResearch();