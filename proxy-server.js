const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const https = require('https');

// Temporarily disable SSL verification to handle SSL issues
// This is for development only - in production, proper SSL certificates should be used
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const app = express();
const PORT = 5001;

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase body parser limits for large files
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

console.log('🚀 Starting minimal Replicate proxy server...');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Proxy server is running' });
});

// Proxy endpoint for Replicate API predictions
app.post('/api/replicate/predictions', upload.single('audio_file'), async (req, res) => {
  try {
    console.log('📥 Received transcription request');

    const { replicate_token, ...otherParams } = req.body;

    if (!replicate_token) {
      return res.status(400).json({ error: 'Replicate token is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const fileSizeMB = req.file.size / 1024 / 1024;
    console.log(`📁 Processing file: ${req.file.originalname} (${fileSizeMB.toFixed(2)} MB)`);
    console.log(`📄 File type: ${req.file.mimetype}`);

    // Check file size limits (base64 encoding increases size by ~33%)
    const estimatedBase64Size = req.file.size * 1.33;
    const estimatedBase64SizeMB = estimatedBase64Size / 1024 / 1024;

    // Replicate API limit is much smaller than we thought - around 25-30MB for the entire payload
    if (estimatedBase64SizeMB > 25) {
      console.warn(`⚠️ File too large after base64 encoding: ${estimatedBase64SizeMB.toFixed(2)} MB`);
      return res.status(413).json({
        error: 'File too large',
        message: `File size after encoding would be ${estimatedBase64SizeMB.toFixed(2)} MB. Replicate API limit is ~25MB. Please use a smaller file or enable chunking in the frontend.`,
        originalSize: fileSizeMB.toFixed(2),
        encodedSize: estimatedBase64SizeMB.toFixed(2),
        suggestion: 'Try using a shorter audio/video clip or enable file chunking in the app.'
      });
    }

    console.log(`🔄 Converting to base64 (estimated size: ${estimatedBase64SizeMB.toFixed(2)} MB)...`);

    // Convert file buffer to base64
    const base64Audio = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    console.log(`✅ Base64 conversion complete (actual size: ${(base64Audio.length / 1024 / 1024).toFixed(2)} MB)`);

    // Prepare payload for Replicate
    const payload = {
      version: 'victor-upmeet/whisperx:84d2ad2d6194fe98a17d2b60bef1c7f910c46b2f6fd38996ca457afd9c8abfcb',
      input: {
        audio_file: base64Audio,
        language: otherParams.language || 'en',
        temperature: parseFloat(otherParams.temperature) || 0.0,
        align_output: otherParams.align_output === 'true' || true,
        diarization: otherParams.diarization === 'true' || false,
        huggingface_access_token: otherParams.huggingface_access_token || '',
        min_speakers: otherParams.min_speakers && otherParams.min_speakers !== '' ? parseInt(otherParams.min_speakers) : undefined,
        max_speakers: otherParams.max_speakers && otherParams.max_speakers !== '' ? parseInt(otherParams.max_speakers) : undefined,
        language_detection_min_prob: parseFloat(otherParams.language_detection_min_prob) || 0,
        language_detection_max_tries: parseInt(otherParams.language_detection_max_tries) || 5,
        batch_size: parseInt(otherParams.batch_size) || 64,
        vad_onset: parseFloat(otherParams.vad_onset) || 0.500,
        vad_offset: parseFloat(otherParams.vad_offset) || 0.363,
        debug: otherParams.debug === 'true' || false
      }
    };

    console.log(`📤 Sending request to Replicate API...`);
    console.log(`🔧 Request details: ${JSON.stringify({
      version: payload.version,
      inputKeys: Object.keys(payload.input),
      audioFileSize: `${(base64Audio.length / 1024 / 1024).toFixed(2)} MB`,
      language: payload.input.language
    }, null, 2)}`);

    // Make request to Replicate API with SSL configuration
    const response = await axios.post('https://api.replicate.com/v1/predictions', payload, {
      headers: {
        'Authorization': `Token ${replicate_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'WhisperX-App/1.0'
      },
      timeout: 600000, // 10 minute timeout for large files
      maxContentLength: 200 * 1024 * 1024, // 200MB max content length
      maxBodyLength: 200 * 1024 * 1024, // 200MB max body length
      // Add SSL configuration to handle potential SSL issues
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Disable SSL verification for development
        keepAlive: true,
        timeout: 60000
      }),
      // Add retry configuration
      validateStatus: function (status) {
        return status >= 200 && status < 300; // default
      }
    });

    console.log(`✅ Replicate API response: ${response.data.id}`);
    res.json(response.data);

  } catch (error) {
    console.error('❌ Proxy error:', error.message);

    // Log more detailed error information
    if (error.response) {
      console.error('📊 Error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: error.response.data
      });
    }

    if (error.response) {
      // Replicate API error
      console.error('Replicate API error:', error.response.status, error.response.data);
      res.status(error.response.status).json({
        error: 'Replicate API error',
        details: error.response.data,
        status: error.response.status
      });
    } else if (error.code === 'ECONNABORTED') {
      // Timeout error
      res.status(408).json({
        error: 'Request timeout',
        message: 'The request to Replicate API timed out'
      });
    } else {
      // Other errors
      res.status(500).json({
        error: 'Proxy server error',
        message: error.message
      });
    }
  }
});

// Proxy endpoint for checking prediction status
app.get('/api/replicate/predictions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { replicate_token } = req.query;

    if (!replicate_token) {
      return res.status(400).json({ error: 'Replicate token is required' });
    }

    const response = await axios.get(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: {
        'Authorization': `Token ${replicate_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'WhisperX-App/1.0'
      },
      // Add SSL configuration to handle potential SSL issues
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Disable SSL verification for development
        keepAlive: true,
        timeout: 60000
      }),
      timeout: 30000 // 30 second timeout for status checks
    });

    res.json(response.data);
  } catch (error) {
    console.error('❌ Status check error:', error.message);

    if (error.response) {
      res.status(error.response.status).json({
        error: 'Replicate API error',
        details: error.response.data
      });
    } else {
      res.status(500).json({
        error: 'Proxy server error',
        message: error.message
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy server running on http://localhost:${PORT}`);
  console.log('🔗 Ready to proxy requests to Replicate API');
});
