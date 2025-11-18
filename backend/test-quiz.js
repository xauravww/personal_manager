const axios = require('axios');

// Test quiz functionality
async function testQuiz() {
  try {
    // First, create a test user and get token
    console.log('Testing quiz functionality...');

    // Login to get token (assuming test user exists)
    const loginResponse = await axios.post('http://localhost:3001/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    console.log('Got auth token');

    // Create a learning subject
    const subjectResponse = await axios.post('http://localhost:3001/learning/subjects', {
      name: 'Test Subject',
      description: 'Testing quiz functionality',
      goals: ['Learn basic concepts', 'Practice quizzes']
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const subjectId = subjectResponse.data.id;
    console.log('Created subject:', subjectId);

    // Create a module
    const moduleResponse = await axios.post('http://localhost:3001/learning/modules', {
      subject_id: subjectId,
      title: 'Test Module',
      description: 'Module for testing quizzes',
      content: 'This module covers basic concepts that will be tested in a quiz.',
      order_index: 1,
      estimated_time: 30
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const moduleId = moduleResponse.data.id;
    console.log('Created module:', moduleId);

    // Create a quiz assignment
    const assignmentResponse = await axios.post('http://localhost:3001/learning/assignments', {
      module_id: moduleId,
      title: 'Basic Concepts Quiz',
      description: 'Test your understanding of basic concepts',
      type: 'quiz'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const assignmentId = assignmentResponse.data.id;
    console.log('Created assignment:', assignmentId);

    // Get assignment details (should generate quiz questions)
    const assignmentDetails = await axios.get(`http://localhost:3001/learning/assignments/${assignmentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Assignment details:', JSON.stringify(assignmentDetails.data, null, 2));

    // Submit quiz answers
    if (assignmentDetails.data.assignment.questions && assignmentDetails.data.assignment.questions.length > 0) {
      const answers = {};
      assignmentDetails.data.assignment.questions.forEach(q => {
        answers[q.id] = q.correctAnswer; // Answer correctly for testing
      });

      const submissionResponse = await axios.post('http://localhost:3001/learning/assignments/submit', {
        assignment_id: assignmentId,
        content: JSON.stringify({
          answers,
          questions: assignmentDetails.data.assignment.questions
        })
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Submission result:', JSON.stringify(submissionResponse.data, null, 2));

      // Try retake - get fresh questions
      const retakeDetails = await axios.get(`http://localhost:3001/learning/assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Retake questions different?', retakeDetails.data.assignment.questions[0].question !== assignmentDetails.data.assignment.questions[0].question);
    }

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testQuiz();