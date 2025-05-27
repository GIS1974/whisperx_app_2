// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import UploadPage from './pages/UploadPage.jsx';
import PlayerPage from './pages/PlayerPage.jsx';
import './styles/global.css';

function App() {
  return (
    <Router>
      <div className="app-container"> {/* Changed class name */}
        <nav>
          <Link to="/">Home</Link>
          <Link to="/upload">Upload & Transcribe</Link>
        </nav>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/player/:jobId" element={<PlayerPage />} /> {/* Changed to jobId */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
