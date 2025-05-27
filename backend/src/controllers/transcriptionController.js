// backend/src/controllers/transcriptionController.js
const replicateService = require('../services/replicateService');
// const subtitleGeneratorService = require('../services/subtitleGeneratorService'); // If generating VTT/SRT manually

// Simple in-memory storage for job metadata (replace with database in production)
const jobMetadata = new Map();

exports.startTranscriptionJob = async (req, res) => {
  const { fileUrl, language, model } = req.body;

  if (!fileUrl) {
    return res.status(400).json({ message: 'File URL is required to start transcription.' });
  }

  // fileUrl should be a publicly accessible URL that Replicate can fetch.
  // If using local uploads for dev, ensure the /uploads dir is served and accessible.
  // e.g., http://<your_ngrok_url_or_public_ip>:<port>/uploads/<fileId_from_upload_step>

  try {
    const job = await replicateService.startTranscription(fileUrl, language, model);
    if (!job || !job.id) {
        throw new Error("Failed to create transcription job with Replicate.");
    }

    // Store job metadata for later retrieval
    jobMetadata.set(job.id, {
      originalFileUrl: fileUrl,
      language: language,
      model: model,
      createdAt: new Date(),
      status: job.status
    });

    res.status(202).json({
        message: 'Transcription job started with Replicate.',
        jobId: job.id,
        status: job.status
    });
  } catch (error) {
    console.error('Error starting transcription job with Replicate:', error);
    res.status(500).json({ message: 'Failed to start transcription job.', error: error.message });
  }
};

exports.getTranscriptionStatus = async (req, res) => {
  const { jobId } = req.params;
  if (!jobId) {
    return res.status(400).json({ message: 'Job ID is required.' });
  }

  try {
    const jobDetails = await replicateService.getTranscriptionStatus(jobId);

    // The Replicate output for Whisper models often includes:
    // jobDetails.output.segments: array of {start, end, text, words: [{start, end, word}]}
    // jobDetails.output.vtt: URL to a VTT file
    // jobDetails.output.srt: URL to an SRT file
    // jobDetails.output.text: Full plain text transcription
    // jobDetails.output.detected_language: Detected language
    // jobDetails.input.audio: The original audio URL passed to Replicate

    // If Replicate has removed the input data, restore it from our metadata
    const metadata = jobMetadata.get(jobId);
    if (metadata && (!jobDetails.input || Object.keys(jobDetails.input).length === 0)) {
      console.log(`Restoring input data for job ${jobId} from local metadata`);
      jobDetails.input = {
        audio_file: metadata.originalFileUrl,
        language: metadata.language,
        model: metadata.model
      };
    }

    res.status(200).json(jobDetails); // Send the full job details from Replicate

  } catch (error) {
    console.error('Error fetching transcription status from Replicate:', error);
    // Replicate API might return specific errors, pass them through if possible
    if (error.response && error.response.data) {
        return res.status(error.response.status || 500).json({
            message: 'Failed to fetch transcription status from Replicate.',
            replicateError: error.response.data
        });
    }
    res.status(500).json({ message: 'Failed to fetch transcription status.', error: error.message });
  }
};
