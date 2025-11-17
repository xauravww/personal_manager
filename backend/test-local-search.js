// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';

const { DeepResearchService } = require('./dist/services/deepResearchService');

async function testLocalSearch() {
  const userId = 'e0ba766d-d2ab-45db-9ed6-b114fead3b3b'; // User ID from add-test-resources.js
  const service = new DeepResearchService(userId);

  // Set web search to disabled to enable local search
  service.includeWebSearch = false;

  console.log('Testing local search with "python programming"...');

  try {
    // Test with different actionDetails formats
    console.log('\n1. Testing with simple term:');
    let result = await service.executeResearchAction('search_local', 'python', 'test query');
    console.log('Result:', result);

    console.log('\n2. Testing with quoted terms:');
    result = await service.executeResearchAction('search_local', "'python', 'programming'", 'test query');
    console.log('Result:', result);

    console.log('\n3. Testing with complex AI-style query:');
    result = await service.executeResearchAction('search_local', "Search for keywords like 'python programming', 'python tutorial', 'programming guide'", 'test query');
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testLocalSearch();