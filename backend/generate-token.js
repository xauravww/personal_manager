const jwt = require('jsonwebtoken');

// Test user data
const userId = '77eb38a2-9016-419b-972e-dd1a8651ea8c';
const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Generate JWT token
const token = jwt.sign(
  { userId: userId },
  jwtSecret,
  { expiresIn: '7d' }
);

console.log('🔑 Generated JWT Token:', token);
console.log('👤 User ID:', userId);