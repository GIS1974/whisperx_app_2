// backend/src/middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define the path to the uploads directory relative to this file's location
const uploadsDirPath = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists synchronously at startup
if (!fs.existsSync(uploadsDirPath)) {
  try {
    fs.mkdirSync(uploadsDirPath, { recursive: true });
    console.log(`Uploads directory created at: ${uploadsDirPath}`);
  } catch (err) {
    console.error(`Error creating uploads directory at ${uploadsDirPath}:`, err);
    // Depending on how critical this is, you might want to throw or exit
  }
}


// Configure storage for Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDirPath); // Save files to the 'uploads' directory
  },
  filename: function (req, file, cb) {
    // Create a unique filename: fieldname + timestamp + random + original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// File filter (optional: to accept only certain file types)
const fileFilter = (req, file, cb) => {
  // Accept common audio and video mimetypes
  const allowedMimeTypes = [
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/x-m4a',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska', 'video/x-msvideo'
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.warn(`Rejected file type: ${file.mimetype} for file ${file.originalname}`);
    cb(new Error('Invalid file type. Only common audio and video files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit (adjust as needed based on Replicate limits and server capacity)
  },
  fileFilter: fileFilter
});

module.exports = upload;
