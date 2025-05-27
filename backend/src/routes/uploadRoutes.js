// backend/src/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const uploadMiddleware = require('../middleware/uploadMiddleware');

// POST /api/upload - Handles file upload
// 'mediaFile' should match the name attribute of the file input field in the FormData on the client
router.post(
  '/', 
  uploadMiddleware.single('mediaFile'), // This middleware handles the file parsing and saving
  uploadController.handleUpload         // Then this controller processes it
);

module.exports = router;
