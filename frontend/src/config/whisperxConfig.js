/**
 * WhisperX Configuration
 * Optimal settings based on whisper-webui documentation
 * https://gitlab.com/aadnk/whisper-webui/-/blob/main/docs/options.md
 */

export const WHISPERX_PRESETS = {
  // High accuracy preset for important content
  highAccuracy: {
    name: 'High Accuracy',
    description: 'Best quality transcription with precise timestamps',
    settings: {
      temperature: 0.0,           // Deterministic output
      align_output: true,         // Essential for word-level timestamps
      batch_size: 32,            // Smaller batch for better accuracy
      vad_onset: 0.500,          // Default speech start threshold
      vad_offset: 0.363,         // Default speech end threshold
      language_detection_max_tries: 5,
      debug: false
    }
  },

  // Balanced preset for general use
  balanced: {
    name: 'Balanced',
    description: 'Good balance of speed and accuracy',
    settings: {
      temperature: 0.0,           // Still deterministic
      align_output: true,         // Keep precise timestamps
      batch_size: 64,            // Default batch size
      vad_onset: 0.500,          // Default thresholds
      vad_offset: 0.363,
      language_detection_max_tries: 5,
      debug: false
    }
  },

  // Fast preset for quick processing
  fast: {
    name: 'Fast Processing',
    description: 'Faster processing with slightly lower accuracy',
    settings: {
      temperature: 0.1,           // Slightly more random for speed
      align_output: true,         // Still need timestamps
      batch_size: 128,           // Larger batch for speed
      vad_onset: 0.400,          // More sensitive to speech
      vad_offset: 0.300,         // Quicker to end speech detection
      language_detection_max_tries: 3,
      debug: false
    }
  },

  // Diarization preset for multiple speakers
  diarization: {
    name: 'Speaker Diarization',
    description: 'Optimized for identifying multiple speakers',
    settings: {
      temperature: 0.0,           // Deterministic for consistency
      align_output: true,         // Essential for speaker timing
      diarization: true,          // Enable speaker detection
      batch_size: 32,            // Smaller batch for better speaker detection
      vad_onset: 0.600,          // More conservative speech detection
      vad_offset: 0.400,         // Better speaker boundaries
      language_detection_max_tries: 5,
      debug: false
    }
  }
};

// Default settings for different file types
export const FILE_TYPE_DEFAULTS = {
  // Video files (extracted audio)
  video: {
    preset: 'balanced',
    customSettings: {
      // Video-extracted audio often has consistent quality
      vad_onset: 0.500,
      vad_offset: 0.363,
      batch_size: 64
    }
  },

  // Audio files
  audio: {
    preset: 'highAccuracy',
    customSettings: {
      // Audio files may have varying quality
      vad_onset: 0.450,  // Slightly more sensitive
      vad_offset: 0.350,
      batch_size: 32     // Smaller batch for better handling
    }
  },

  // Podcast/interview content
  podcast: {
    preset: 'diarization',
    customSettings: {
      // Optimized for speech content
      vad_onset: 0.400,  // Sensitive to speech
      vad_offset: 0.300,
      batch_size: 32
    }
  }
};

// VAD parameter explanations based on documentation
export const VAD_PARAMETER_INFO = {
  vad_onset: {
    name: 'VAD Onset',
    description: 'Threshold for detecting speech start (0.0-1.0)',
    recommendations: {
      'Clear audio': 0.500,
      'Noisy audio': 0.600,
      'Sensitive detection': 0.400,
      'Conservative detection': 0.700
    }
  },
  vad_offset: {
    name: 'VAD Offset', 
    description: 'Threshold for detecting speech end (0.0-1.0)',
    recommendations: {
      'Clear audio': 0.363,
      'Noisy audio': 0.400,
      'Quick transitions': 0.300,
      'Slow speech': 0.450
    }
  }
};

// Temperature parameter guidance
export const TEMPERATURE_INFO = {
  0.0: 'Deterministic - same output every time (recommended for transcription)',
  0.1: 'Slightly random - minor variations',
  0.2: 'Low randomness - some variation in word choice',
  0.5: 'Medium randomness - noticeable variations',
  1.0: 'High randomness - very creative/unpredictable output'
};

// Batch size recommendations based on file characteristics
export const BATCH_SIZE_RECOMMENDATIONS = {
  small_file: 32,      // < 10MB - prioritize accuracy
  medium_file: 64,     // 10-50MB - balanced approach  
  large_file: 128,     // > 50MB - prioritize speed
  high_quality: 32,    // High quality audio - smaller batches
  low_quality: 64,     // Lower quality - standard batches
  multiple_speakers: 32 // Multiple speakers - smaller for better detection
};

/**
 * Get optimal settings for a file
 * @param {Object} fileInfo - File information
 * @param {string} userPreference - User's preference (accuracy/balanced/speed)
 * @returns {Object} Optimal WhisperX settings
 */
export function getOptimalSettings(fileInfo, userPreference = 'balanced') {
  const { size, type, estimatedSpeakers, audioQuality } = fileInfo;
  const sizeMB = size / (1024 * 1024);
  
  // Start with preset
  let settings = { ...WHISPERX_PRESETS[userPreference].settings };
  
  // Adjust based on file size
  if (sizeMB < 10) {
    settings.batch_size = BATCH_SIZE_RECOMMENDATIONS.small_file;
  } else if (sizeMB > 50) {
    settings.batch_size = BATCH_SIZE_RECOMMENDATIONS.large_file;
  }
  
  // Adjust for multiple speakers
  if (estimatedSpeakers > 1) {
    settings.batch_size = BATCH_SIZE_RECOMMENDATIONS.multiple_speakers;
    settings.vad_onset = 0.600; // More conservative for speaker boundaries
    settings.vad_offset = 0.400;
  }
  
  // Adjust for audio quality
  if (audioQuality === 'low') {
    settings.vad_onset = 0.600; // More conservative for noisy audio
    settings.vad_offset = 0.400;
    settings.batch_size = Math.min(settings.batch_size, 64);
  }
  
  return settings;
}

export default {
  WHISPERX_PRESETS,
  FILE_TYPE_DEFAULTS,
  VAD_PARAMETER_INFO,
  TEMPERATURE_INFO,
  BATCH_SIZE_RECOMMENDATIONS,
  getOptimalSettings
};
