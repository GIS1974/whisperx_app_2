/**
 * Validate uploaded files for transcription
 */

// Supported file types
const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac'
];

const SUPPORTED_VIDEO_TYPES = [
  'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mkv'
];

const ALL_SUPPORTED_TYPES = [...SUPPORTED_AUDIO_TYPES, ...SUPPORTED_VIDEO_TYPES];

// File size limits
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (Replicate API limit)
const CHUNK_SIZE = 25 * 1024 * 1024; // 25MB chunks
const WARNING_SIZE = 50 * 1024 * 1024; // 50MB warning threshold

/**
 * Validate a file for transcription
 * @param {File} file - File to validate
 * @returns {Object} - Validation result with warnings and recommendations
 */
export function validateFile(file) {
  const result = {
    isValid: true,
    warnings: [],
    errors: [],
    needsChunking: false,
    estimatedChunks: 0,
    estimatedProcessingTime: 0
  };

  // Check file type
  if (!ALL_SUPPORTED_TYPES.includes(file.type)) {
    result.warnings.push(`File type ${file.type} may not be supported. Recommended: MP4, MP3, WAV, M4A`);
  }

  // Check file size and determine chunking needs
  if (file.size > MAX_FILE_SIZE) {
    result.needsChunking = true;
    result.estimatedChunks = Math.ceil(file.size / CHUNK_SIZE);
    result.warnings.push(`File is ${formatFileSize(file.size)}. Will be split into ${result.estimatedChunks} chunks.`);
  } else if (file.size > WARNING_SIZE) {
    result.warnings.push(`Large file (${formatFileSize(file.size)}). Processing may take longer.`);
  }

  // Estimate processing time (rough approximation)
  const sizeInMB = file.size / (1024 * 1024);
  result.estimatedProcessingTime = Math.ceil(sizeInMB / 10); // ~10MB per minute

  // Check for very small files
  if (file.size < 1024 * 1024) { // Less than 1MB
    result.warnings.push('Very small file. Ensure it contains clear audio for best results.');
  }

  return result;
}

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file type category
 * @param {File} file - File to categorize
 * @returns {string} - 'audio', 'video', or 'unknown'
 */
export function getFileCategory(file) {
  if (SUPPORTED_AUDIO_TYPES.includes(file.type)) {
    return 'audio';
  } else if (SUPPORTED_VIDEO_TYPES.includes(file.type)) {
    return 'video';
  } else {
    return 'unknown';
  }
}

/**
 * Check if file needs preprocessing
 * @param {File} file - File to check
 * @returns {boolean} - True if preprocessing recommended
 */
export function needsPreprocessing(file) {
  // For now, we're sending files directly to WhisperX
  // Future: Could add logic for format conversion, noise reduction, etc.
  return false;
}

export default {
  validateFile,
  formatFileSize,
  getFileCategory,
  needsPreprocessing,
  SUPPORTED_AUDIO_TYPES,
  SUPPORTED_VIDEO_TYPES,
  ALL_SUPPORTED_TYPES,
  MAX_FILE_SIZE,
  CHUNK_SIZE
};
