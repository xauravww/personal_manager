const request = require('supertest');
const app = require('./backend/dist/index.js').default;
const { createTestUser, getAuthHeader } = require('./backend/src/__tests__/testUtils.ts');

async function testMCPIntegration() {
  console.log('🧪 Testing MCP Integration...');

  try {
    // Create a test user
    const testUser = await createTestUser();
    console.log('✅ Created test user:', testUser.email);

    // Test search with MCP enabled
    const response = await request(app)
      .get('/api/search')
      .query({
        q: 'test search query',
        useMCP: true,
        mcpCredentials: JSON.stringify({
          github_token: 'mock-github-token',
          api_key: 'mock-api-key'
        })
      })
      .set(getAuthHeader(testUser.token));

    console.log('📡 Search response status:', response.status);

    if (response.status === 200) {
      console.log('✅ Search successful');
      console.log('📊 Response contains MCP data:', !!response.body.ai?.mcpResults);
      console.log('📝 MCP Summary:', response.body.ai?.mcpSummary);

      if (response.body.ai?.mcpResults) {
        console.log('🔧 MCP Results count:', response.body.ai.mcpResults.length);
        response.body.ai.mcpResults.forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.toolName}: ${result.success ? '✅' : '❌'} ${result.error || 'OK'}`);
        });
      }
    } else {
      console.log('❌ Search failed:', response.body);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMCPIntegration();