// frontend/src/pages/HomePage.js
import React from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div>
      <h1>Welcome to the ESL Video Transcription App</h1>
      <p>This application allows you to upload audio or video files, get them transcribed using WhisperX, and then practice your English skills with interactive playback features.</p>
      <Link to="/upload">
        <button style={{padding: '10px 20px', fontSize: '1.2em'}}>Get Started: Upload File</button>
      </Link>
      <h3>Features:</h3>
      <ul>
        <li>Automatic transcription of audio and video files.</li>
        <li>Word-level timestamps for accurate subtitle synchronization.</li>
        <li>Interactive video player with subtitles.</li>
        <li>ESL-focused controls: listen-and-repeat segments, playback speed adjustment.</li>
        <li>(Future) Shadowing mode.</li>
      </ul>
    </div>
  );
}

export default HomePage;
