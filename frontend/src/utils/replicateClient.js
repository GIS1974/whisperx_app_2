import axios from 'axios';

class ReplicateClient {
  constructor() {
    this.apiToken = null;
    this.proxyURL = 'http://localhost:5001/api/replicate';
    this.directAPIURL = 'https://api.replicate.com/v1';
    this.modelVersion = 'victor-upmeet/whisperx:84d2ad2d6194fe98a17d2b60bef1c7f910c46b2f6fd38996ca457afd9c8abfcb';
    this.useDirectAPI = false; // Flag to switch between proxy and direct API
  }

  setApiToken(token) {
    this.apiToken = token;
  }

  /**
   * Enable direct API mode (bypasses proxy server)
   * @param {boolean} enabled - Whether to use direct API calls
   */
  setDirectAPIMode(enabled) {
    this.useDirectAPI = enabled;
    console.log(`🔄 Replicate API mode: ${enabled ? 'Direct API' : 'Proxy Server'}`);
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
   * Start transcription job using direct API or proxy server
   * @param {Blob} audioBlob - Audio blob
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} - Prediction object with job ID
   */
  async startTranscription(audioBlob, options = {}) {
    if (!this.apiToken) {
      throw new Error('Replicate API token not set');
    }

    console.log(`🔧 ReplicateClient mode: ${this.useDirectAPI ? 'Direct API' : 'Proxy Server'}`);

    if (this.useDirectAPI) {
      console.log('📡 Using direct API mode');
      return this.startTranscriptionDirect(audioBlob, options);
    } else {
      console.log('🔄 Using proxy server mode');
      return this.startTranscriptionViaProxy(audioBlob, options);
    }
  }

  /**
   * Start transcription job using direct API calls
   * @param {Blob} audioBlob - Audio blob
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} - Prediction object with job ID
   */
  async startTranscriptionDirect(audioBlob, options = {}) {
    try {
      console.log(`📤 Sending ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB directly to Replicate API...`);

      // Convert blob to base64
      const base64Audio = await this.blobToDataURL(audioBlob);

      // Prepare payload for direct API call
      const payload = {
        version: this.modelVersion,
        input: {
          audio_file: base64Audio,
          language: options.language || 'en',
          temperature: parseFloat(options.temperature) || 0.0,
          align_output: true,
          diarization: options.diarization || false,
          huggingface_access_token: options.huggingfaceToken || '',
          min_speakers: options.minSpeakers && options.minSpeakers !== '' ? parseInt(options.minSpeakers) : undefined,
          max_speakers: options.maxSpeakers && options.maxSpeakers !== '' ? parseInt(options.maxSpeakers) : undefined,
          language_detection_min_prob: parseFloat(options.languageDetectionMinProb) || 0,
          language_detection_max_tries: parseInt(options.languageDetectionMaxTries) || 5,
          batch_size: parseInt(options.batchSize) || 64,
          vad_onset: parseFloat(options.vadOnset) || 0.500,
          vad_offset: parseFloat(options.vadOffset) || 0.363,
          debug: options.debug || false
        }
      };

      const response = await axios.post(
        `${this.directAPIURL}/predictions`,
        payload,
        {
          headers: {
            'Authorization': `Token ${this.apiToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'WhisperX-App/1.0'
          },
          timeout: 300000 // 5 minute timeout for large files
        }
      );

      console.log('✅ Transcription job started via direct API:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to start transcription via direct API:', error);

      if (error.response) {
        const errorMsg = error.response.data?.error || error.response.data?.detail || error.response.statusText;
        throw new Error(`Direct API error (${error.response.status}): ${errorMsg}`);
      }

      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Start transcription job using proxy server
   * @param {Blob} audioBlob - Audio blob
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} - Prediction object with job ID
   */
  async startTranscriptionViaProxy(audioBlob, options = {}) {
    try {
      console.log(`📤 Sending ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB to proxy server...`);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'audio.wav');
      formData.append('replicate_token', this.apiToken);

      // Core transcription parameters (optimized based on whisper-webui documentation)
      formData.append('language', options.language || 'en');
      formData.append('temperature', options.temperature || 0.0); // 0 = deterministic, higher = more random
      formData.append('align_output', 'true'); // Essential for precise word-level timestamps

      // Speaker diarization (requires HuggingFace token)
      formData.append('diarization', options.diarization || false);
      formData.append('huggingface_access_token', options.huggingfaceToken || '');
      formData.append('min_speakers', options.minSpeakers || '');
      formData.append('max_speakers', options.maxSpeakers || '');

      // Language detection settings
      formData.append('language_detection_min_prob', options.languageDetectionMinProb || 0);
      formData.append('language_detection_max_tries', options.languageDetectionMaxTries || 5);

      // Processing parameters
      formData.append('batch_size', options.batchSize || 64); // Larger = faster but more memory

      // VAD (Voice Activity Detection) parameters - critical for timing accuracy
      // These thresholds determine when speech starts/ends
      formData.append('vad_onset', options.vadOnset || 0.500); // Speech start threshold (0-1)
      formData.append('vad_offset', options.vadOffset || 0.363); // Speech end threshold (0-1)

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
   * Get transcription status via direct API or proxy
   * @param {string} predictionId - Prediction ID from startTranscription
   * @returns {Promise<Object>} - Prediction object with status and output
   */
  async getTranscriptionStatus(predictionId) {
    if (!this.apiToken) {
      throw new Error('Replicate API token not set');
    }

    if (this.useDirectAPI) {
      return this.getTranscriptionStatusDirect(predictionId);
    } else {
      return this.getTranscriptionStatusViaProxy(predictionId);
    }
  }

  /**
   * Get transcription status via direct API
   * @param {string} predictionId - Prediction ID from startTranscription
   * @returns {Promise<Object>} - Prediction object with status and output
   */
  async getTranscriptionStatusDirect(predictionId) {
    try {
      const response = await axios.get(
        `${this.directAPIURL}/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${this.apiToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'WhisperX-App/1.0'
          },
          timeout: 30000 // 30 second timeout for status checks
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get transcription status via direct API:', error);

      if (error.response) {
        const errorMsg = error.response.data?.error || error.response.data?.detail || error.response.statusText;
        throw new Error(`Direct API error (${error.response.status}): ${errorMsg}`);
      }

      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Get transcription status via proxy
   * @param {string} predictionId - Prediction ID from startTranscription
   * @returns {Promise<Object>} - Prediction object with status and output
   */
  async getTranscriptionStatusViaProxy(predictionId) {
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
      console.error('Failed to get transcription status via proxy:', error);

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
    const pollInterval = 3000; // 3 seconds (reduced frequency to be gentler on Replicate)
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
          throw new Error('Transcription failed: Prediction interrupted; please retry (code: PA)');
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
