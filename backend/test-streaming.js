const axios = require('axios');
const jwt = require('jsonwebtoken');

// Configuration
const BACKEND_PORT = process.env.BACKEND_PORT || 3001; // Set BACKEND_PORT environment variable to your backend port
console.log(`Testing streaming on port ${BACKEND_PORT}...`);
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3N2ViMzhhMi05MDE2LTQxOWItOTcyZS1kZDFhODY1MWEyOGMiLCJpYXQiOjE3NjMzMjU5MTUsImV4cCI6MTc2MzkzMDcxNX0.2T-Df7jIlCHdvkRvSlbPVEQhtrf-ckprqTZX98vXpLM';

async function testStreaming() {
  const url = `http://localhost:${BACKEND_PORT}/api/search?q=hi&timezone=Asia%2FCalcutta&focusMode=general&stream=1&token=${token}`;

  console.log('Testing streaming with URL:', url);

  try {
    const response = await axios.get(url, {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      responseType: 'stream',
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (response.headers['content-type'] === 'text/event-stream') {
      console.log('✅ Streaming response detected!');

      const stream = response.data;
      let buffer = '';

      let accumulatedContent = '';

      stream.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log('\n✅ Stream completed with [DONE]');
              console.log('📄 Final accumulated content:', accumulatedContent);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (typeof parsed === 'object' && parsed.content) {
                accumulatedContent += parsed.content;
                process.stdout.write(parsed.content); // Real-time character output
              } else if (typeof parsed === 'string') {
                // Handle string responses (our SSE format)
                accumulatedContent += parsed;
                process.stdout.write(parsed); // Real-time character output
              } else {
                console.log('📄 Received data:', parsed);
              }
            } catch (e) {
              // If not JSON, treat as plain text
              const content = data.replace(/^"|"$/g, '');
              accumulatedContent += content;
              process.stdout.write(content); // Real-time character output
            }
          }
        }
      });

      stream.on('end', () => {
        console.log('Stream ended');
      });

      stream.on('error', (error) => {
        console.error('Stream error:', error.message);
      });
    } else {
      console.log('❌ Not a streaming response');
      // For non-streaming, collect the data
      let data = '';
      response.data.on('data', (chunk) => {
        data += chunk.toString();
      });
      response.data.on('end', () => {
        console.log('Response body:', data);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('❌ Full error:', error);
    if (error.response) {
      console.log('Error status:', error.response.status);
      console.log('Error headers:', error.response.headers);
      console.log('Error data:', error.response.data);
    } else {
      console.log('No response in error');
      console.log('Error code:', error.code);
    }
  }
}

testStreaming();