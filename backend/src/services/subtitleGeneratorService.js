// backend/src/services/subtitleGeneratorService.js

/**
 * Helper function to format time from seconds to VTT/SRT timestamp.
 * @param {number} timeInSeconds - Time in seconds.
 * @param {string} formatType - 'vtt' or 'srt'.
 * @returns {string} Formatted time string.
 */
const formatTimestamp = (timeInSeconds, formatType = 'vtt') => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) {
    // console.warn(`Invalid timeInSeconds: ${timeInSeconds}, returning zero timestamp.`);
    timeInSeconds = 0;
  }
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const milliseconds = Math.floor((timeInSeconds * 1000) % 1000);

  const separator = formatType === 'srt' ? ',' : '.';

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${separator}${String(milliseconds).padStart(3, '0')}`;
};

/**
 * Converts WhisperX JSON output (segments with word timestamps) to VTT format.
 * @param {Array<Object>} segments - Array of segment objects from WhisperX.
 *   Each segment: { text: string, start: float, end: float, words?: [{ word: string, start: float, end: float }] }
 * @returns {string} VTT formatted string.
 */
exports.convertToVTT = (segments) => {
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    console.warn("convertToVTT: Segments data is invalid or empty. Returning empty VTT.");
    return "WEBVTT\n\n"; // Return a valid empty VTT
  }

  let vttContent = "WEBVTT\n\n";

  segments.forEach((segment, index) => {
    // Validate segment structure
    if (typeof segment.start !== 'number' || typeof segment.end !== 'number' || typeof segment.text !== 'string') {
      console.warn(`Skipping invalid segment at index ${index} for VTT: `, segment);
      return; // Skip this segment
    }
    const startTime = formatTimestamp(segment.start, 'vtt');
    const endTime = formatTimestamp(segment.end, 'vtt');

    // VTT cues can have an optional identifier (like a number)
    vttContent += `${index + 1}\n`;
    vttContent += `${startTime} --> ${endTime}\n`;
    vttContent += `${segment.text.trim()}\n\n`;
  });

  return vttContent;
};

/**
 * Converts WhisperX JSON output to SRT format.
 * @param {Array<Object>} segments - Array of segment objects from WhisperX.
 * @returns {string} SRT formatted string.
 */
exports.convertToSRT = (segments) => {
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    console.warn("convertToSRT: Segments data is invalid or empty. Returning empty SRT.");
    return ""; // Return an empty string for SRT
  }
  let srtContent = "";

  segments.forEach((segment, index) => {
    if (typeof segment.start !== 'number' || typeof segment.end !== 'number' || typeof segment.text !== 'string') {
      console.warn(`Skipping invalid segment at index ${index} for SRT: `, segment);
      return; // Skip this segment
    }
    const startTime = formatTimestamp(segment.start, 'srt');
    const endTime = formatTimestamp(segment.end, 'srt');

    srtContent += `${index + 1}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${segment.text.trim()}\n\n`;
  });

  return srtContent;
};

// (Optional) If you need to generate VTT/SRT with word-level highlighting (more complex)
// This would involve creating cues for each word or small phrase.
// For standard subtitles, segment-level is usually sufficient.
