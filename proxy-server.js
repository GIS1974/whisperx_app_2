const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');

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
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

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

    console.log(`📁 Processing file: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

    // Convert file buffer to base64
    const base64Audio = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

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

    // Make request to Replicate API
    const response = await axios.post('https://api.replicate.com/v1/predictions', payload, {
      headers: {
        'Authorization': `Token ${replicate_token}`,
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 minute timeout for large files
    });

    console.log(`✅ Replicate API response: ${response.data.id}`);
    res.json(response.data);

  } catch (error) {
    console.error('❌ Proxy error:', error.message);

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
        'Content-Type': 'application/json'
      }
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
