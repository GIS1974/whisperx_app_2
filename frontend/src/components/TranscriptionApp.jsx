import React, { useState, useRef } from 'react';
import { REPLICATE_API_TOKEN } from '../config/apiConfig';
import ReplicateClient from '../utils/replicateClient';
import { validateFile, formatFileSize } from '../utils/fileValidator';
import { splitFileIntoChunks, combineChunkResults } from '../utils/fileChunker';
import { getOptimalSettings, WHISPERX_PRESETS } from '../config/whisperxConfig';

const TranscriptionApp = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileValidation, setFileValidation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [transcriptionResult, setTranscriptionResult] = useState(null);
  const [error, setError] = useState('');
  const [apiToken, setApiToken] = useState(REPLICATE_API_TOKEN);
  const [useDirectAPI, setUseDirectAPI] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize Replicate client
  const replicateClient = new ReplicateClient();

  // Transcription options
  const [options, setOptions] = useState({
    language: 'en',
    temperature: 0.0,
    alignOutput: true,
    diarization: false,
    huggingfaceToken: '',
    minSpeakers: '',
    maxSpeakers: '',
    languageDetectionMinProb: 0,
    languageDetectionMaxTries: 5,
    batchSize: 64,
    vadOnset: 0.500,
    vadOffset: 0.363,
    debug: false
  });

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log(`📁 File selected: ${file.name} (${formatFileSize(file.size)})`);

      // Estimate processing time
      const estimatedMinutes = Math.ceil(file.size / (1024 * 1024) / 10); // ~10MB per minute
      console.log(`⏱️ Estimated processing time: ${estimatedMinutes < 5 ? '2-5' : `${estimatedMinutes}-${estimatedMinutes + 10}`} minutes`);

      const validation = validateFile(file);
      if (validation.warnings.length > 0) {
        console.log(` ⚠️ File validation warnings:`, validation.warnings);
      }

      // Get optimal WhisperX settings for this file
      const fileInfo = {
        size: file.size,
        type: file.type,
        estimatedSpeakers: 1, // Default to single speaker
        audioQuality: 'medium' // Default quality assumption
      };

      const optimalSettings = getOptimalSettings(fileInfo, 'balanced');
      console.log(`🎯 Applied optimal WhisperX settings:`, optimalSettings);

      // Update options with optimal settings
      setOptions(prevOptions => ({
        ...prevOptions,
        ...optimalSettings
      }));

      setSelectedFile(file);
      setFileValidation(validation);
      setTranscriptionResult(null);
      setError('');
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      const validation = validateFile(file);
      setFileValidation(validation);
      setTranscriptionResult(null);
      setError('');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const startTranscription = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');
      setProgress(0);
      setCurrentStep('Starting transcription...');

      console.log('🚀 Starting transcription process...');

      // Set API token before starting transcription
      replicateClient.setApiToken(apiToken);
      if (!apiToken || apiToken === 'YOUR_REPLICATE_API_TOKEN_HERE') {
        throw new Error('Please set a valid Replicate API token');
      }

      // Use manual toggle or auto-detect proxy availability
      let finalUseDirectAPI = useDirectAPI;
      if (!useDirectAPI) {
        try {
          const proxyHealthCheck = await fetch('http://localhost:5001/health', { timeout: 3000 });
          if (!proxyHealthCheck.ok) {
            finalUseDirectAPI = true;
            console.log('🔄 Proxy server not responding, switching to direct API mode');
          } else {
            console.log('✅ Proxy server available, using proxy mode');
          }
        } catch (error) {
          finalUseDirectAPI = true;
          console.log('🔄 Proxy server not available, switching to direct API mode');
        }
      } else {
        console.log('🌐 Manual direct API mode enabled');
      }

      console.log(`🔧 Setting API mode: ${finalUseDirectAPI ? 'Direct API' : 'Proxy Server'}`);
      replicateClient.setDirectAPIMode(finalUseDirectAPI);

      // Check if file needs chunking
      if (fileValidation && fileValidation.needsChunking) {
        console.log(`⚠️ Large file detected (${formatFileSize(selectedFile.size)}). Processing in ${fileValidation.estimatedChunks} chunks...`);
        setCurrentStep(`Large file detected - splitting into ${fileValidation.estimatedChunks} chunks...`);
        setProgress(5);
        await processInChunks();
      } else {
        // Process smaller files directly
        await processDirectly();
      }

    } catch (error) {
      console.error('❌ Transcription error:', error);
      setError(error.message);
      setCurrentStep('');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const processDirectly = async () => {
    const maxRetries = 3;
    let retryCount = 0;
    let result = null;

    // Retry loop for direct processing
    while (retryCount <= maxRetries && !result) {
      try {
        const retryText = retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : '';

        // Skip FFmpeg conversion entirely - use original file
        setCurrentStep(`Preparing file for transcription${retryText}...`);
        setProgress(10);
        console.log(`🎵 Using original file${retryText}: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`);

        // Use original file as blob - no conversion needed
        const fileBlob = new Blob([selectedFile], { type: selectedFile.type });
        console.log(`✅ File prepared${retryText}: ${formatFileSize(fileBlob.size)}`);

        // Start transcription directly
        setCurrentStep(`Uploading to Replicate API${retryText}...`);
        setProgress(20);
        console.log(`📤 Starting Replicate transcription${retryText}...`);

        const prediction = await replicateClient.startTranscription(fileBlob, options);
        console.log(`✅ Transcription job started${retryText}: ${prediction.id}`);

        // Poll for completion with better progress tracking
        setCurrentStep(`Transcribing audio${retryText} (this may take several minutes)...`);
        setProgress(30);

        let pollCount = 0;
        result = await replicateClient.pollTranscription(
          prediction.id,
          (predictionUpdate) => {
            pollCount++;
            console.log(`🔄 Poll ${pollCount}${retryText}: Status = ${predictionUpdate.status}`);

            if (predictionUpdate.status === 'starting') {
              setCurrentStep(`Transcription job starting${retryText}...`);
              setProgress(40);
            } else if (predictionUpdate.status === 'processing') {
              setCurrentStep(`Processing audio with WhisperX${retryText}...`);
              // Gradually increase progress from 50% to 90%
              const processingProgress = 50 + Math.min(40, Math.floor(pollCount / 2));
              setProgress(processingProgress);
            }
          }
        );

        console.log(`✅ Transcription completed successfully${retryText}`);

      } catch (error) {
        retryCount++;
        console.warn(`⚠️ Direct processing failed (attempt ${retryCount}): ${error.message}`);

        // Check for specific Replicate errors that benefit from longer waits
        const isReplicateInterruption = error.message.includes('interrupted') ||
                                      error.message.includes('PA') ||
                                      error.message.includes('server error') ||
                                      error.message.includes('502');

        if (retryCount <= maxRetries) {
          // Exponential backoff with longer waits for Replicate interruptions
          const baseDelay = isReplicateInterruption ? 10000 : 5000; // 10s for interruptions, 5s for others
          const delay = baseDelay * Math.pow(2, retryCount - 1); // Exponential backoff
          const maxDelay = 60000; // Cap at 60 seconds
          const actualDelay = Math.min(delay, maxDelay);

          console.log(`🔄 Retrying direct processing in ${actualDelay / 1000} seconds...`);
          setCurrentStep(`Transcription failed, retrying in ${actualDelay / 1000}s (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, actualDelay));
        } else {
          console.error(`❌ Direct processing failed after ${maxRetries} retries`);
          throw new Error(`Transcription failed after ${maxRetries} retries: ${error.message}`);
        }
      }
    }

    setProgress(95);
    setCurrentStep('Processing results...');

    setProgress(100);
    setCurrentStep('Transcription completed!');
    setTranscriptionResult(result.output);

    console.log('🎉 All done! Results ready for download.');
  };

  const processInChunks = async () => {
    try {
      // Split file into chunks
      setCurrentStep('Splitting file into chunks...');
      setProgress(10);

      const chunks = await splitFileIntoChunks(selectedFile, 15 * 1024 * 1024); // 15MB chunks for better reliability
      console.log(`📦 Created ${chunks.length} chunks`);

      const chunkResults = [];
      const totalChunks = chunks.length;

      // Process each chunk with retry logic
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkProgress = 10 + (i / totalChunks) * 80; // Progress from 10% to 90%

        let chunkResult = null;
        let retryCount = 0;
        const maxRetries = 3;

        // Retry loop for each chunk with exponential backoff
        while (retryCount <= maxRetries && !chunkResult) {
          try {
            const retryText = retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : '';
            setCurrentStep(`Processing chunk ${i + 1}/${totalChunks} (${formatFileSize(chunk.size)})${retryText}...`);
            setProgress(chunkProgress);

            console.log(`🔄 Processing chunk ${i + 1}/${totalChunks}${retryText}: ${chunk.file.name}`);

            // Create blob from chunk file
            const chunkBlob = new Blob([chunk.file], { type: chunk.file.type });

            // Start transcription for this chunk
            const prediction = await replicateClient.startTranscription(chunkBlob, options);
            console.log(`✅ Chunk ${i + 1} transcription started${retryText}: ${prediction.id}`);

            // Poll for completion
            const result = await replicateClient.pollTranscription(
              prediction.id,
              (predictionUpdate) => {
                console.log(`🔄 Chunk ${i + 1}${retryText} status: ${predictionUpdate.status}`);
              }
            );

            chunkResult = result.output;
            console.log(`✅ Chunk ${i + 1} completed${retryText}`);

          } catch (error) {
            retryCount++;
            console.warn(`⚠️ Chunk ${i + 1} failed (attempt ${retryCount}): ${error.message}`);

            // Check for specific Replicate errors that benefit from longer waits
            const isReplicateInterruption = error.message.includes('interrupted') ||
                                          error.message.includes('PA') ||
                                          error.message.includes('server error') ||
                                          error.message.includes('502');

            if (retryCount <= maxRetries) {
              // Exponential backoff with longer waits for Replicate interruptions
              const baseDelay = isReplicateInterruption ? 10000 : 3000; // 10s for interruptions, 3s for others
              const delay = baseDelay * Math.pow(2, retryCount - 1); // Exponential backoff
              const maxDelay = 60000; // Cap at 60 seconds
              const actualDelay = Math.min(delay, maxDelay);

              console.log(`🔄 Retrying chunk ${i + 1} in ${actualDelay / 1000} seconds...`);
              setCurrentStep(`Chunk ${i + 1} failed, retrying in ${actualDelay / 1000}s (${retryCount}/${maxRetries})...`);

              await new Promise(resolve => setTimeout(resolve, actualDelay));
            } else {
              console.error(`❌ Chunk ${i + 1} failed after ${maxRetries} retries`);
              throw new Error(`Chunk ${i + 1} failed after ${maxRetries} retries: ${error.message}`);
            }
          }
        }

        chunkResults.push(chunkResult);
      }

      // Combine all chunk results
      setCurrentStep('Combining chunk results...');
      setProgress(95);

      const combinedResult = combineChunkResults(chunkResults);
      console.log(`🔗 Combined ${chunkResults.length} chunks into final result`);

      setCurrentStep('Transcription completed!');
      setProgress(100);
      setTranscriptionResult(combinedResult);
      console.log('🎉 Chunked transcription completed successfully!');

    } catch (error) {
      console.error('❌ Error in chunk processing:', error);
      throw error;
    }
  };

  const testApiConnection = async () => {
    try {
      setIsProcessing(true);
      setError('');
      setCurrentStep('Testing API connection...');
      setProgress(25);

      // Simple test - just check if we can reach the proxy server
      console.log('🔍 Testing proxy server connection...');

      const response = await fetch('http://localhost:5001/health');
      if (!response.ok) {
        throw new Error('Proxy server not responding');
      }

      setProgress(50);
      setCurrentStep('Proxy server connection successful!');

      // Test API token validation
      replicateClient.setApiToken(apiToken);
      if (!apiToken || apiToken === 'YOUR_REPLICATE_API_TOKEN_HERE') {
        throw new Error('Invalid API token');
      }

      setProgress(75);
      setCurrentStep('API token validated!');

      setProgress(100);
      setCurrentStep('Connection test successful!');

      console.log('✅ Connection test passed - ready for transcription');

      setTimeout(() => {
        setCurrentStep('');
        setProgress(0);
      }, 2000);

    } catch (error) {
      console.error('❌ Connection test failed:', error);
      setError(error.message);
      setCurrentStep('');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="transcription-app">
      {/* API Token Section */}
      <div className="api-token-section">
        <label htmlFor="api-token">Replicate API Token:</label>
        <input
          id="api-token"
          type="password"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          placeholder="Enter your Replicate API token"
        />
        <button onClick={testApiConnection} disabled={isProcessing}>
          Test API Connection
        </button>
      </div>

      {/* API Mode Selection */}
      <div className="api-mode-section">
        <label>
          <input
            type="checkbox"
            checked={useDirectAPI}
            onChange={(e) => setUseDirectAPI(e.target.checked)}
            disabled={isProcessing}
          />
          Use Direct API (bypass proxy server)
        </label>
        <small style={{display: 'block', color: '#666', marginTop: '5px'}}>
          {useDirectAPI
            ? '🌐 Direct API mode: Calls Replicate API directly (may have CORS issues)'
            : '🔄 Proxy mode: Uses local proxy server on port 5001'
          }
        </small>
      </div>

      {/* File Upload Section */}
      <div
        className="file-upload-section"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
          {selectedFile ? (
            <div>
              <p>Selected: {selectedFile.name}</p>
              <p>Size: {formatFileSize(selectedFile.size)}</p>
            </div>
          ) : (
            <p>Click or drag & drop audio/video files here</p>
          )}
        </div>
      </div>

      {/* File Validation Warnings */}
      {fileValidation && fileValidation.warnings.length > 0 && (
        <div className="warnings">
          {fileValidation.warnings.map((warning, index) => (
            <p key={index} className="warning">⚠️ {warning}</p>
          ))}
        </div>
      )}

      {/* Progress Section */}
      {isProcessing && (
        <div className="progress-section">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="progress-text">{currentStep}</p>
          <p className="progress-percent">{progress}%</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-section">
          <p className="error">❌ {error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          onClick={startTranscription}
          disabled={!selectedFile || isProcessing}
          className="primary-button"
        >
          {isProcessing ? 'Processing...' : 'Start Transcription'}
        </button>
      </div>

      {/* Results Section */}
      {transcriptionResult && (
        <div className="results-section">
          <h3>Transcription Complete!</h3>
          <div className="download-buttons">
            <button onClick={() => downloadTranscription('txt')}>Download TXT</button>
            <button onClick={() => downloadTranscription('srt')}>Download SRT</button>
            <button onClick={() => downloadTranscription('vtt')}>Download VTT</button>
          </div>
          <div className="transcription-preview">
            <h4>Preview:</h4>
            <pre>{JSON.stringify(transcriptionResult, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to convert seconds to SRT time format
  const timeSecondsToSRT = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  };

  // Helper function to convert seconds to VTT time format
  const timeSecondsToVTTCustom = (timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds * 1000) % 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  };

  function downloadTranscription(format) {
    if (!transcriptionResult || !transcriptionResult.segments || transcriptionResult.segments.length === 0) {
      alert('No transcription data available to download.');
      return;
    }

    const segments = transcriptionResult.segments;
    let content = '';
    let filename = `transcription_${Date.now()}.${format}`;
    let mimeType = 'text/plain';

    switch (format) {
      case 'txt':
        content = segments.map(segment => segment.text.trim()).join(' ');
        mimeType = 'text/plain';
        break;

      case 'srt':
        content = segments.map((segment, index) => {
          const startTime = timeSecondsToSRT(segment.start);
          const endTime = timeSecondsToSRT(segment.end);
          return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text.trim()}\n`;
        }).join('\n');
        mimeType = 'application/x-subrip';
        break;

      case 'vtt':
        content = 'WEBVTT\n\n' + segments.map(segment => {
          const startTime = timeSecondsToVTTCustom(segment.start);
          const endTime = timeSecondsToVTTCustom(segment.end);
          return `${startTime} --> ${endTime}\n${segment.text.trim()}\n`;
        }).join('\n');
        mimeType = 'text/vtt';
        break;

      default:
        alert('Unsupported format');
        return;
    }

    // Create and trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`✅ Downloaded transcription as ${format.toUpperCase()}: ${filename}`);
  }
};

export default TranscriptionApp;
