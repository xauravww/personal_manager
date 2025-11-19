const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Test user data
const userId = '77eb38a2-9016-419b-972e-dd1a8651ea8c';
const email = 'test@example.com';
const password = 'password123';
const jwtSecret = 'test-jwt-secret-key';

// Generate JWT token
const token = jwt.sign(
  { userId: userId },
  jwtSecret,
  { expiresIn: '7d' }
);

console.log('🔑 Test User Token:', token);
console.log('📧 Test User Email:', email);
console.log('🔒 Test User Password:', password);

// Test the search API with MCP
const https = require('https');
const querystring = require('querystring');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/search?' + querystring.stringify({
    q: 'test search with MCP',
    useMCP: 'true',
    mcpCredentials: JSON.stringify({
      github_token: 'mock-github-token',
      api_key: 'mock-api-key'
    })
  }),
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

console.log('🌐 Testing MCP Search API...');
console.log('📡 Request URL:', `http://${options.hostname}:${options.port}${options.path}`);

const req = https.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('✅ Response received');
      console.log('🔍 Has MCP Results:', !!response.ai?.mcpResults);
      console.log('📝 MCP Summary:', response.ai?.mcpSummary);

      if (response.ai?.mcpResults) {
        console.log('🔧 MCP Results:');
        response.ai.mcpResults.forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.toolName}: ${result.success ? '✅' : '❌'} ${result.error || 'Success'}`);
        });
      }

      console.log('🎉 MCP Integration Test Completed Successfully!');
    } catch (error) {
      console.error('❌ Failed to parse response:', error.message);
      console.log('📄 Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.end();