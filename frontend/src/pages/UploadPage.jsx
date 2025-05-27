// frontend/src/pages/UploadPage.js
import React, { useState } from 'react';
import FileUploader from '../components/FileUploader.jsx';
import apiClient from '../services/apiClient';
import { useNavigate } from 'react-router-dom';

function UploadPage() {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');

  const handleFileUpload = async (file) => {
    setIsUploading(true);
    setMessage('Uploading file...');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('mediaFile', file);

    try {
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': undefined, // Let axios set the correct multipart/form-data header
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
          setMessage(`Uploading: ${percentCompleted}%`);
        }
      });

      setMessage(`File uploaded: ${response.data.originalName}. Starting transcription...`);
      // The backend's /upload endpoint now returns fileId.
      // We need to call /transcribe/start with this fileId or a URL.
      // For simplicity, let's assume the backend /upload gives us what we need to proceed,
      // or we construct the URL.

      // Construct file URL for transcription using ngrok URL
      // In a real app, this URL might come from a file storage service.
      const ngrokUrl = "https://5296-174-66-200-209.ngrok-free.app"; // Your ngrok URL
      let fileUrlForTranscription = `${ngrokUrl}/uploads/${response.data.fileId}`;

      // ngrok is now configured! Using actual uploaded files.
      console.log('Using uploaded file for transcription:', fileUrlForTranscription);

      const transcriptionResponse = await apiClient.post('/transcribe/start', {
        fileUrl: fileUrlForTranscription,
        // language: 'en', // Optional: specify language, or let backend default
        // model: 'large-v2' // Optional: specify model, or let backend default
      });

      setMessage(`Transcription job started. Job ID: ${transcriptionResponse.data.jobId}. You will be redirected.`);
      // Navigate to player page which will poll for transcription status
      navigate(`/player/${transcriptionResponse.data.jobId}`);

    } catch (error) {
      console.error('Error during upload or transcription start:', error);
      setMessage(`Error: ${error.response?.data?.message || error.message}`);
      setIsUploading(false);
      setUploadProgress(0);
    }
    // setIsUploading(false); // Handled by navigation or error
  };

  return (
    <div>
      <h2>Upload Audio/Video File</h2>
      <FileUploader onFileUpload={handleFileUpload} isUploading={isUploading} />
      {isUploading && <progress value={uploadProgress} max="100" style={{width: "100%", marginTop: "10px"}}></progress>}
      {message && <p style={{marginTop: "10px"}}>{message}</p>}
    </div>
  );
}

export default UploadPage;
