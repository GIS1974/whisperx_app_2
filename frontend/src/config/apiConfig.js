// API Configuration
// The Replicate API token should be set as an environment variable
// Get your token from: https://replicate.com/account/api-tokens
// Set VITE_REPLICATE_API_TOKEN in your .env file

export const REPLICATE_API_TOKEN = import.meta.env.VITE_REPLICATE_API_TOKEN || 'YOUR_REPLICATE_API_TOKEN_HERE';

// WhisperX model configuration
export const WHISPERX_MODEL = 'victor-upmeet/whisperx:84d2ad2d6194fe98a17d2b60bef1c7f910c46b2f6fd38996ca457afd9c8abfcb';
