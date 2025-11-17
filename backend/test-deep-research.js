const EventSource = require('eventsource').default;

const query = 'python course';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkOTgyNjRkOS1lZGIzLTQ2YTQtOGU1Ny04MGU5Mzc3NWQwZGMiLCJpYXQiOjE3NjMzNjI3NDUsImV4cCI6MTc2Mzk2NzU0NX0.tvi5mAXd1byT_V7yF-Z2OVSLr9GhhoF2Vxk8Ea5ZTMo'; // From previous run

const url = `http://localhost:3001/api/deep-research/?query=${encodeURIComponent(query)}&maxThoughts=5&timezone=Asia/Calcutta&includeWebSearch=false&token=${token}`;

console.log('Testing deep research with local search...');
console.log('URL:', url);

const eventSource = new EventSource(url);

eventSource.onopen = () => {
  console.log('Connection opened');
};

eventSource.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    if (data.type === 'thought') {
      console.log(`\n--- Thought ${data.thought.thoughtNumber}/${data.thought.totalThoughts} ---`);
      console.log(`Thought: ${data.thought.thought}`);
      if (data.thought.action) {
        console.log(`Action: ${data.thought.action} - ${data.thought.actionDetails}`);
      }
      if (data.thought.result) {
        console.log(`Result: ${data.thought.result}`);
      }
    } else if (data.type === 'complete') {
      console.log('\n=== RESEARCH COMPLETE ===');
      console.log('Final Answer:', data.result.finalAnswer);
      console.log('Confidence:', data.result.confidence);
      console.log('Sources:', data.result.sourcesCount);
      eventSource.close();
    } else if (data.type === 'error') {
      console.error('Error:', data.message);
      eventSource.close();
    }
  } catch (error) {
    console.log('Raw event:', event.data);
  }
};

eventSource.onerror = (error) => {
  console.error('EventSource error:', error);
  eventSource.close();
};