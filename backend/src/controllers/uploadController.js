// backend/src/controllers/uploadController.js
const path = require('path');
const fs = require('fs');
// const audioProcessingService = require('../services/audioProcessingService'); // If pre-processing needed
// const fileStorageService = require('../services/fileStorageService'); // For cloud storage

// Multer saves the file to req.file.path (which is in backend/uploads/ by default)
exports.handleUpload = async (req, res) => {
  console.log('Upload request received');
  console.log('Request headers:', req.headers);
  console.log('Request file:', req.file);
  console.log('Request body:', req.body);

  if (!req.file) {
    console.log('No file found in request');
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const uploadedFile = req.file; // Contains path, filename, originalname, etc.

  try {
    // At this point, the file is saved locally by multer.
    // The `fileId` (which is multer's generated filename) can be used to construct a URL
    // if the backend serves the 'uploads' directory.
    // This URL can then be passed to the Replicate service.

    // Example: If backend serves /uploads at http://localhost:5000/uploads
    // const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${uploadedFile.filename}`;
    // console.log(`File available for Replicate at: ${fileUrl}`);

    // The frontend will now call /api/transcribe/start with this fileId or a constructed URL.
    // This controller's job is primarily to receive the file and make it available.

    res.status(201).json({
      message: 'File uploaded successfully. Ready for transcription.',
      fileId: uploadedFile.filename, // This is multer's unique filename in the uploads dir
      originalName: uploadedFile.originalname,
      // filePath: uploadedFile.path, // For server-side reference if needed
      // You could also return a direct public URL if you have cloud storage integrated here:
      // publicUrl: await fileStorageService.uploadFile(uploadedFile.path, `media/${uploadedFile.filename}`)
    });

    // Optional: If you were to upload to cloud storage here and didn't need the local copy:
    // fs.unlinkSync(uploadedFile.path); // Clean up local file

  } catch (error) {
    console.error('Error processing upload:', error);
    // Clean up uploaded file on error if it exists
    if (uploadedFile && uploadedFile.path && fs.existsSync(uploadedFile.path)) {
      fs.unlinkSync(uploadedFile.path);
    }
    res.status(500).json({ message: 'Error processing file.', error: error.message });
  }
};
