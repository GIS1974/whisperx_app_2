// backend/src/services/audioProcessingService.js
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const path = require('path');
const fs = require('fs').promises; // Using promises version of fs

/**
 * Converts an audio/video file to a standard audio format (e.g., MP3, 16kHz mono WAV).
 * This might be useful if Replicate's Whisper model has specific input requirements.
 * @param {string} inputPath - Path to the input file.
 * @param {string} outputDir - Directory to save the converted file.
 * @param {string} originalFilename - Original name of the file for output naming.
 * @param {object} [options] - FFmpeg options (e.g., { format: 'wav', audioChannels: 1, audioFrequency: 16000 }).
 * @returns {Promise<string>} Path to the converted audio file.
 */
exports.convertToStandardAudio = (inputPath, outputDir, originalFilename, options = {}) => {
  return new Promise(async (resolve, reject) => {
    const outputFormat = options.format || 'mp3'; // Default to mp3
    const outputFilename = `${path.parse(originalFilename).name}_${Date.now()}.${outputFormat}`;
    const outputPath = path.join(outputDir, outputFilename);

    try {
      await fs.mkdir(outputDir, { recursive: true }); // Ensure output directory exists

      let command = ffmpeg(inputPath)
        .toFormat(outputFormat);

      if (options.audioCodec) command = command.audioCodec(options.audioCodec); // e.g., 'pcm_s16le' for WAV
      if (options.audioChannels) command = command.audioChannels(options.audioChannels); // e.g., 1 for mono
      if (options.audioFrequency) command = command.audioFrequency(options.audioFrequency); // e.g., 16000 for 16kHz
      if (options.audioBitrate) command = command.audioBitrate(options.audioBitrate); // e.g., '128k' for MP3

      command
        .on('start', (commandLine) => {
          console.log('FFmpeg command started: ' + commandLine);
        })
        .on('end', () => {
          console.log(`Audio conversion finished: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err, stdout, stderr) => {
          console.error(`Error during audio conversion: ${err.message}`);
          console.error('FFmpeg stdout:', stdout);
          console.error('FFmpeg stderr:', stderr);
          reject(err);
        })
        .save(outputPath);
    } catch (err) {
      console.error(`Error setting up FFmpeg conversion: ${err.message}`);
      reject(err);
    }
  });
};

/**
 * Extracts audio from a video file.
 * @param {string} videoPath - Path to the video file.
 * @param {string} outputDir - Directory to save the extracted audio file.
 * @param {string} originalFilename - Original name of the file for output naming.
 * @param {string} [audioFormat='mp3'] - Desired audio format for extraction.
 * @returns {Promise<string>} Path to the extracted audio file.
 */
exports.extractAudioFromVideo = (videoPath, outputDir, originalFilename, audioFormat = 'mp3') => {
  return new Promise(async (resolve, reject) => {
    const outputFilename = `audio_from_${path.parse(originalFilename).name}_${Date.now()}.${audioFormat}`;
    const outputPath = path.join(outputDir, outputFilename);

    try {
      await fs.mkdir(outputDir, { recursive: true });

      ffmpeg(videoPath)
        .noVideo() // Disable video recording
        .toFormat(audioFormat)
        // .audioCodec('libmp3lame') // Example for MP3, adjust if needed
        // .audioBitrate('192k')    // Example bitrate
        .on('start', (commandLine) => {
          console.log('FFmpeg audio extraction started: ' + commandLine);
        })
        .on('end', () => {
          console.log(`Audio extraction finished: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err, stdout, stderr) => {
          console.error(`Error during audio extraction: ${err.message}`);
          console.error('FFmpeg stdout:', stdout);
          console.error('FFmpeg stderr:', stderr);
          reject(err);
        })
        .save(outputPath);
    } catch (err) {
      console.error(`Error setting up FFmpeg audio extraction: ${err.message}`);
      reject(err);
    }
  });
};

/**
 * Gets media file metadata using ffprobe.
 * @param {string} filePath - Path to the media file.
 * @returns {Promise<object>} Metadata object from ffprobe.
 */
exports.getMediaMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error(`Error probing file ${filePath}:`, err.message);
        return reject(err);
      }
      resolve(metadata); // metadata object contains format, streams, etc.
    });
  });
};

// Consider adding functions based on FFmpeg_settings.md if specific pre-processing
// is required before sending to Replicate (e.g., normalize audio, change sample rate).
// However, many Replicate models handle common formats well.

