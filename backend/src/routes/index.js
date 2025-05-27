// backend/src/routes/index.js
const express = require('express');
const router = express.Router();

// Base API route
router.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the WhisperX App API!',
    status: 'API is running',
    version: '1.0.0', // Consider reading from package.json
    documentation: '/api-docs' // If you add Swagger/OpenAPI docs
  });
});

// Example: Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Other root-level API routes can be defined here if they don't fit elsewhere.

module.exports = router;
