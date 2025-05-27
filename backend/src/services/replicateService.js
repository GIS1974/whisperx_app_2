// backend/src/services/replicateService.js
const Replicate = require('replicate');

// Ensure REPLICATE_API_TOKEN is loaded (dotenv should handle this from .env)
if (!process.env.REPLICATE_API_TOKEN) {
  console.error("FATAL ERROR: REPLICATE_API_TOKEN is not defined in the environment variables.");
  // Consider throwing an error or exiting if this is critical for startup
  // throw new Error("REPLICATE_API_TOKEN is not defined.");
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Default model version - user MUST replace this in .env or provide it dynamically
const DEFAULT_WHISPER_MODEL_VERSION = "REPLACE_WITH_ACTUAL_WHISPER_MODEL_ON_REPLICATE";
// Example: "openai/whisper:4d50797290df275329f8b422a0aaef5535eb09d590a141599e049950ddfd1002" (a general Whisper model)
// Or a specific WhisperX variant if available on Replicate: "owner/whisperx-model:versionhash"

/**
 * Starts a transcription job on Replicate.
 * @param {string} audioUrl - Publicly accessible URL to the audio/video file.
 * @param {string} [language=null] - Language code (e.g., "en", "es"). Null for auto-detect.
 * @param {string} [model='large-v2'] - Whisper model size (e.g., "large-v2", "medium", "base").
 * @returns {Promise<object>} The Replicate prediction object.
 */
exports.startTranscription = async (audioUrl, language = null, model = 'large-v2') => {
  const replicateModelVersion = process.env.REPLICATE_WHISPER_MODEL_VERSION || DEFAULT_WHISPER_MODEL_VERSION;

  if (replicateModelVersion === DEFAULT_WHISPER_MODEL_VERSION) {
    const warningMessage = "Warning: REPLICATE_WHISPER_MODEL_VERSION is not configured or is using the default placeholder. Transcription will likely fail. Please set it in your .env file.";
    console.warn(warningMessage);
    // Optionally, throw an error to prevent API calls with a bad model string:
    // throw new Error(warningMessage);
  }

  console.log(`Starting Replicate transcription for: ${audioUrl}`);
  console.log(`Using Replicate model version: ${replicateModelVersion}`);

  const input = {
    audio_file: audioUrl, // Fixed: Replicate API expects 'audio_file', not 'audio'
    // model: model, // Note: WhisperX uses large-v3 by default, model parameter may not be needed
    // language: language, // Let Whisper auto-detect if null or not provided
    // transcription: "json", // Request "json" to get segments and word timestamps if model supports
    // word_timestamps: true, // Crucial for ESL features, ensure the Replicate model supports this
    align_output: true, // Essential for word-level timestamps (WhisperX specific)

    // Parameters from Replicate_API_parameters.md (these are common for Whisper models)
    // Adjust based on the specific Replicate model's documentation.
    // temperature: 0,
    // patience: null, // Or a float value
    // suppress_tokens: "-1", // Default, or a list of token IDs
    // initial_prompt: null, // Or a string
    // condition_on_previous_text: true, // Boolean
    // temperature_increment_on_fallback: 0.2, // Float
    // compression_ratio_threshold: 2.4, // Float
    // logprob_threshold: -1.0, // Float
    // no_speech_threshold: 0.6, // Float

    // WhisperX specific parameters (if the chosen Replicate model is a WhisperX variant):
    // diarize: false, // Boolean, for speaker diarization
    // hf_token: process.env.HF_TOKEN, // If model needs HuggingFace token for gated models
    // batch_size: 16, // Integer
    // compute_type: "float16", // "float16", "float32", "int8"
    // align_model: null, // String, e.g., "WAV2VEC2_ASR_LARGE_LV60K_960H" for word alignment
    // language_detection_model: null, // String, specific model for lang detection
    // vad_model: "silero-vad", // String, Voice Activity Detection model
    // chunk_size: 30, // Integer, for chunking audio
  };

  if (language) { // Only add language to input if it's explicitly provided
    input.language = language;
  }

  try {
    const predictionConfig = {
      version: replicateModelVersion, // The Replicate model_owner/model_name:version_hash string
      input: input
    };

    // Only add webhook configuration if webhook URL is provided
    if (process.env.REPLICATE_WEBHOOK_URL) {
      predictionConfig.webhook = process.env.REPLICATE_WEBHOOK_URL;
      predictionConfig.webhook_events_filter = ["completed", "failed"];
    }

    const prediction = await replicate.predictions.create(predictionConfig);
    console.log(`Replicate job created: ${prediction.id}, Status: ${prediction.status}`);
    return prediction;
  } catch (error) {
    console.error('Error creating Replicate prediction:', error.response ? error.response.data : error.message);
    throw error; // Re-throw to be caught by controller
  }
};

/**
 * Fetches the status and output of a Replicate transcription job.
 * @param {string} jobId - The ID of the Replicate prediction.
 * @returns {Promise<object>} The Replicate prediction object with current status and output.
 */
exports.getTranscriptionStatus = async (jobId) => {
  console.log(`Fetching status for Replicate job: ${jobId}`);
  try {
    const prediction = await replicate.predictions.get(jobId);
    return prediction;
  } catch (error) {
    console.error(`Error fetching Replicate job status for ${jobId}:`, error.response ? error.response.data : error.message);
    throw error; // Re-throw
  }
};
