// frontend/src/components/FileUploader.js
import React, { useState } from 'react';

function FileUploader({ onFileUpload, isUploading }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      alert('Please select a file first.');
      return;
    }
    if (onFileUpload) {
      onFileUpload(selectedFile);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} accept="audio/*,video/*" disabled={isUploading} />
      <button onClick={handleSubmit} disabled={!selectedFile || isUploading}>
        {isUploading ? 'Uploading...' : 'Upload and Transcribe'}
      </button>
    </div>
  );
}

export default FileUploader;
