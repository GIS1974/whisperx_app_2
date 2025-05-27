// backend/src/server.js
require('dotenv').config(); // Load .env file at the very beginning

const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan'); // HTTP request logger

const errorHandler = require('./middleware/errorHandler');

// Import routes
const mainApiRoutes = require('./routes/index');
const uploadRoutes = require('./routes/uploadRoutes');
const transcriptionRoutes = require('./routes/transcriptionRoutes');

// const connectDB = require('./config/db'); // Uncomment if using a database

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database (if configured)
// connectDB();

// Middleware
app.use(cors({ // Configure CORS options as needed
  // origin: process.env.FRONTEND_URL || "http://localhost:3000", // Allow specific origin
  // methods: ["GET", "POST", "PUT", "DELETE"],
  // allowedHeaders: ["Content-Type", "Authorization"],
})); 
app.use(express.json({ limit: '50mb' })); // Parse JSON request bodies, increase limit if needed
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded request bodies

// HTTP request logging (use 'dev' for concise output, 'combined' for Apache standard)
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'short'));

// Serve static files from the 'uploads' directory (for temporary local access during development)
// This allows files in 'backend/uploads/' to be accessed via e.g. http://localhost:5000/uploads/filename.mp4
// Crucial if Replicate needs to fetch from a URL and you're testing locally without cloud storage + ngrok.
const uploadsDirStaticPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDirStaticPath));
console.log(`Serving static files from /uploads mapped to ${uploadsDirStaticPath}`);


// API Routes
app.use('/api', mainApiRoutes); // For base API routes like /api/health
app.use('/api/upload', uploadRoutes);
app.use('/api/transcribe', transcriptionRoutes);

// Catch-all for 404 Not Found (if no routes matched)
app.use((req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler - should be the LAST middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT} in ${process.env.NODE_ENV} mode.`);

  // Sanity checks for critical environment variables
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn('CRITICAL WARNING: REPLICATE_API_TOKEN is not set in .env file. Replicate services WILL NOT WORK.');
  }
  const replicateModel = process.env.REPLICATE_WHISPER_MODEL_VERSION;
  if (!replicateModel || replicateModel === "REPLACE_WITH_ACTUAL_WHISPER_MODEL_ON_REPLICATE") {
    console.warn('CRITICAL WARNING: REPLICATE_WHISPER_MODEL_VERSION is not set or is a placeholder in .env. Transcription will likely fail.');
  }
  if (process.env.NODE_ENV === 'development' && !process.env.SERVER_PUBLIC_URL) {
    console.warn('DEVELOPMENT WARNING: SERVER_PUBLIC_URL is not set in .env. If using local uploads for Replicate, you may need ngrok and set this variable for Replicate to access uploaded files.');
  }
});
