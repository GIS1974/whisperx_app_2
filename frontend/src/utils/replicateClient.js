import axios from 'axios';

class ReplicateClient {
  constructor() {
    this.apiToken = null;
    this.proxyURL = 'http://localhost:5001/api/replicate';
    this.modelVersion = 'victor-upmeet/whisperx:84d2ad2d6194fe98a17d2b60bef1c7f910c46b2f6fd38996ca457afd9c8abfcb';
  }

  setApiToken(token) {
    this.apiToken = token;
  }

  /**
   * Convert blob to data URL
   * @param {Blob} blob - Blob to convert
   * @returns {Promise<string>} - Data URL
   */
  async blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Start transcription job using proxy server
   * @param {Blob} audioBlob - Audio blob
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} - Prediction object with job ID
   */
  async startTranscription(audioBlob, options = {}) {
    if (!this.apiToken) {
      throw new Error('Replicate API token not set');
    }

    try {
      console.log(`📤 Sending ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB to proxy server...`);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'audio.wav');
      formData.append('replicate_token', this.apiToken);
      formData.append('language', options.language || 'en');
      formData.append('temperature', options.temperature || 0.0);
      formData.append('align_output', 'true');
      formData.append('diarization', options.diarization || false);
      formData.append('huggingface_access_token', options.huggingfaceToken || '');
      formData.append('min_speakers', options.minSpeakers || '');
      formData.append('max_speakers', options.maxSpeakers || '');
      formData.append('language_detection_min_prob', options.languageDetectionMinProb || 0);
      formData.append('language_detection_max_tries', options.languageDetectionMaxTries || 5);
      formData.append('batch_size', options.batchSize || 64);
      formData.append('vad_onset', options.vadOnset || 0.500);
      formData.append('vad_offset', options.vadOffset || 0.363);
      formData.append('debug', options.debug || false);

      const response = await axios.post(
        `${this.proxyURL}/predictions`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 300000, // 5 minute timeout for large files
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`📤 Upload progress: ${percentCompleted}%`);
          }
        }
      );

      console.log('✅ Transcription job started via proxy:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to start transcription:', error);

      if (error.code === 'ECONNREFUSED') {
        throw new Error('Proxy server not running. Please start the proxy server on port 5001.');
      }

      if (error.response) {
        const errorMsg = error.response.data?.error || error.response.data?.detail || error.response.statusText;
        throw new Error(`Proxy/API error (${error.response.status}): ${errorMsg}`);
      }

      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Get transcription status via proxy
   * @param {string} predictionId - Prediction ID from startTranscription
   * @returns {Promise<Object>} - Prediction object with status and output
   */
  async getTranscriptionStatus(predictionId) {
    if (!this.apiToken) {
      throw new Error('Replicate API token not set');
    }

    try {
      const response = await axios.get(
        `${this.proxyURL}/predictions/${predictionId}`,
        {
          params: {
            replicate_token: this.apiToken
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get transcription status:', error);

      if (error.code === 'ECONNREFUSED') {
        throw new Error('Proxy server not running. Please start the proxy server on port 5001.');
      }

      if (error.response) {
        const errorMsg = error.response.data?.error || error.response.data?.detail || error.response.statusText;
        throw new Error(`Proxy/API error (${error.response.status}): ${errorMsg}`);
      }

      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Poll transcription status until completion
   * @param {string} predictionId - Prediction ID
   * @param {Function} onUpdate - Callback for status updates
   * @returns {Promise<Object>} - Final prediction result
   */
  async pollTranscription(predictionId, onUpdate = null) {
    const pollInterval = 2000; // 2 seconds
    const maxPollTime = 30 * 60 * 1000; // 30 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxPollTime) {
      try {
        const prediction = await this.getTranscriptionStatus(predictionId);
        
        if (onUpdate) {
          onUpdate(prediction);
        }

        if (prediction.status === 'succeeded') {
          console.log('Transcription completed successfully');
          return prediction;
        }

        if (prediction.status === 'failed') {
          const errorMsg = prediction.error || 'Unknown error occurred';
          throw new Error(`Transcription failed: ${errorMsg}`);
        }

        // Handle interrupted predictions (Replicate server issues)
        if (prediction.status === 'interrupted') {
          throw new Error('Prediction interrupted by Replicate server (will retry automatically)');
        }

        if (prediction.status === 'canceled') {
          throw new Error('Transcription was canceled');
        }

        // Continue polling for starting/processing status
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        console.error(' Error polling transcription:', error);
        throw error;
      }
    }

    throw new Error('Transcription timed out after 30 minutes');
  }
}

export default ReplicateClient;
