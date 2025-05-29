/**
 * File chunking utilities for handling large files
 */

/**
 * Split a large file into smaller chunks for processing
 * @param {File} file - Original file to split
 * @param {number} chunkSize - Size of each chunk in bytes (default: 25MB)
 * @returns {Promise<Array>} - Array of chunk objects
 */
export async function splitFileIntoChunks(file, chunkSize = 25 * 1024 * 1024) {
  console.log(`📦 Splitting ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) into chunks`);
  
  const chunks = [];
  const totalChunks = Math.ceil(file.size / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunkBlob = file.slice(start, end);
    
    // Create a File object for each chunk
    const chunkFile = new File(
      [chunkBlob], 
      `${file.name.split('.')[0]}_chunk_${i + 1}_of_${totalChunks}.${file.name.split('.').pop()}`,
      { type: file.type }
    );
    
    const chunk = {
      index: i,
      file: chunkFile,
      size: chunkFile.size,
      startTime: (i * chunkSize) / file.size, // Approximate relative position
      endTime: (end) / file.size,
      originalStart: start,
      originalEnd: end
    };
    
    chunks.push(chunk);
    console.log(`📄 Chunk ${i + 1}/${totalChunks}: ${(chunk.size / 1024 / 1024).toFixed(2)} MB`);
  }
  
  return chunks;
}

/**
 * Combine transcription results from multiple chunks
 * @param {Array} chunkResults - Array of transcription results from each chunk
 * @returns {Object} - Combined transcription result
 */
export function combineChunkResults(chunkResults) {
  console.log(`🔗 Combining ${chunkResults.length} chunk results`);
  
  if (!chunkResults || chunkResults.length === 0) {
    throw new Error('No chunk results to combine');
  }
  
  // If only one chunk, return it directly
  if (chunkResults.length === 1) {
    return chunkResults[0];
  }
  
  // Initialize combined result with structure from first chunk
  const combinedResult = {
    segments: [],
    language: chunkResults[0].language || 'en',
    text: '',
    word_segments: []
  };
  
  let timeOffset = 0;
  
  // Combine segments from all chunks
  chunkResults.forEach((chunkResult, chunkIndex) => {
    if (!chunkResult || !chunkResult.segments) {
      console.warn(`⚠️ Chunk ${chunkIndex + 1} has no segments, skipping`);
      return;
    }
    
    // Process each segment in the chunk
    chunkResult.segments.forEach(segment => {
      // Adjust timestamps to account for chunk position
      const adjustedSegment = {
        ...segment,
        start: segment.start + timeOffset,
        end: segment.end + timeOffset
      };
      
      // Adjust word-level timestamps if available
      if (segment.words) {
        adjustedSegment.words = segment.words.map(word => ({
          ...word,
          start: word.start + timeOffset,
          end: word.end + timeOffset
        }));
      }
      
      combinedResult.segments.push(adjustedSegment);
    });
    
    // Add chunk text to combined text
    if (chunkResult.text) {
      combinedResult.text += (combinedResult.text ? ' ' : '') + chunkResult.text.trim();
    }
    
    // Combine word segments if available
    if (chunkResult.word_segments) {
      const adjustedWordSegments = chunkResult.word_segments.map(word => ({
        ...word,
        start: word.start + timeOffset,
        end: word.end + timeOffset
      }));
      combinedResult.word_segments.push(...adjustedWordSegments);
    }
    
    // Update time offset for next chunk
    // Use the last segment's end time as the offset for the next chunk
    if (chunkResult.segments && chunkResult.segments.length > 0) {
      const lastSegment = chunkResult.segments[chunkResult.segments.length - 1];
      timeOffset = lastSegment.end + timeOffset;
    }
  });
  
  console.log(`✅ Combined result: ${combinedResult.segments.length} segments, ${combinedResult.text.length} characters`);
  
  return combinedResult;
}

/**
 * Estimate chunk processing time
 * @param {number} chunkSizeBytes - Size of chunk in bytes
 * @returns {number} - Estimated processing time in minutes
 */
export function estimateChunkProcessingTime(chunkSizeBytes) {
  // Rough estimate: ~10MB per minute for WhisperX
  const sizeInMB = chunkSizeBytes / (1024 * 1024);
  return Math.ceil(sizeInMB / 10);
}

/**
 * Calculate optimal chunk size based on file characteristics
 * @param {File} file - File to analyze
 * @returns {number} - Recommended chunk size in bytes
 */
export function calculateOptimalChunkSize(file) {
  const fileSizeMB = file.size / (1024 * 1024);
  
  // For very large files, use smaller chunks to avoid timeouts
  if (fileSizeMB > 500) {
    return 20 * 1024 * 1024; // 20MB
  } else if (fileSizeMB > 200) {
    return 25 * 1024 * 1024; // 25MB
  } else {
    return 30 * 1024 * 1024; // 30MB
  }
}

export default {
  splitFileIntoChunks,
  combineChunkResults,
  estimateChunkProcessingTime,
  calculateOptimalChunkSize
};
