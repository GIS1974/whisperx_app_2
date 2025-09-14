import React from 'react';
import TranscriptionApp from './components/TranscriptionApp';
import './styles/global.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>WhisperX Transcription Tool</h1>
        <p>Upload audio/video files and get high-quality transcriptions with precise timestamps</p>
      </header>
      <main className="main-content">
        <TranscriptionApp />
      </main>
    </div>
  );
}

export default App;
