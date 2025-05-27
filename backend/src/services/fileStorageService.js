// backend/src/services/fileStorageService.js
// This service abstracts file storage operations (e.g., local, S3, GCS).
// For now, it provides placeholders for local storage, assuming files in 'uploads/'
// can be made publicly accessible for Replicate (e.g., via ngrok during development).

const path = require('path');
const fs = require('fs'); // For potential future use (e.g. checking existence)

// Example for AWS S3 (Uncomment and configure if using S3)
/*
const AWS = require('aws-sdk');

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION && process.env.S3_BUCKET_NAME) {
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
} else {
    console.warn("AWS S3 credentials or bucket name not fully configured in .env. S3 operations may fail.");
}
const s3 = new AWS.S3();

exports.uploadFileToCloud = (localFilePath, cloudKey) => {
  return new Promise((resolve, reject) => {
    if (!process.env.S3_BUCKET_NAME) return reject(new Error("S3_BUCKET_NAME not configured."));

    const fileStream = fs.createReadStream(localFilePath);
    fileStream.on('error', (err) => reject(err));

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: cloudKey, // File name you want to save as in S3 (e.g., 'media/unique-filename.mp4')
      Body: fileStream,
      // ACL: 'public-read', // If you want the file to be publicly accessible directly via S3 URL
    };

    s3.upload(params, (err, data) => {
      if (err) {
        return reject(err);
      }
      // data.Location is the URL of the uploaded file if ACL is public-read
      // For private files, you'd generate a signed URL using getSignedUrlForRead
      console.log(`File uploaded to S3: ${data.Location || data.Key}`);
      resolve(data.Location || data.Key); // Prefer Location if available
    });
  });
};

exports.getPublicUrlForFile = async (cloudKey) => {
  if (!process.env.S3_BUCKET_NAME) throw new Error("S3_BUCKET_NAME not configured.");
  // This generates a pre-signed URL for temporary public access to a private S3 object
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: cloudKey,
    Expires: 60 * 60 // URL expires in 1 hour (adjust as needed for Replicate job duration)
  };
  try {
    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (err) {
    console.error("Error generating S3 signed URL for key " + cloudKey + ":", err);
    throw err;
  }
};
*/

// --- Local Storage Placeholders (for development without cloud storage) ---

/**
 * "Uploads" a file by simply acknowledging its local path.
 * In a real local setup for Replicate, this file needs to be served publicly.
 * @param {string} localFilePath - The path where multer saved the file (e.g., backend/uploads/filename.mp4).
 * @param {string} uniqueFileName - The unique name of the file (e.g., multer's generated filename).
 * @returns {Promise<string>} A "public URL" (requires server to serve /uploads and ngrok/public IP).
 */
exports.uploadFile = async (localFilePath, uniqueFileName) => {
  // This function is a bit of a misnomer for local storage as the file is already "uploaded" by multer.
  // Its purpose here is to return a URL that Replicate *could* use if the local server is exposed.
  console.warn('FileStorageService: Using local file. Ensure server serves /uploads and is publicly accessible for Replicate.');

  // Construct a URL assuming the backend serves the 'uploads' directory.
  // This requires `app.use('/uploads', express.static(path.join(__dirname, '../uploads')))` in server.js
  // AND that the server is accessible from the internet (e.g., via ngrok).
  const serverBaseUrl = process.env.SERVER_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
  if (process.env.SERVER_PUBLIC_URL) {
    console.log(`Using SERVER_PUBLIC_URL from .env: ${process.env.SERVER_PUBLIC_URL}`);
  } else {
    console.warn(`SERVER_PUBLIC_URL not set in .env. Using localhost, which Replicate likely cannot access. Use ngrok or similar.`);
  }
  return `${serverBaseUrl}/uploads/${uniqueFileName}`;
};

/**
 * Gets a "public URL" for a locally stored file.
 * @param {string} uniqueFileName - The unique name of the file in the 'uploads' directory.
 * @returns {Promise<string>} A "public URL".
 */
exports.getFileUrl = async (uniqueFileName) => {
  console.warn('FileStorageService: getFileUrl for local file. Ensure server serves /uploads and is publicly accessible.');
  const serverBaseUrl = process.env.SERVER_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
   if (process.env.SERVER_PUBLIC_URL) {
    console.log(`Using SERVER_PUBLIC_URL from .env: ${process.env.SERVER_PUBLIC_URL}`);
  } else {
    console.warn(`SERVER_PUBLIC_URL not set in .env. Using localhost, which Replicate likely cannot access. Use ngrok or similar.`);
  }
  return `${serverBaseUrl}/uploads/${uniqueFileName}`;
};
