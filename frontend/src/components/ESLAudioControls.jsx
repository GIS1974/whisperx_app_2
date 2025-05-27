// frontend/src/components/ESLAudioControls.js
import React from 'react';

function ESLAudioControls({ videoElement, currentSegment, onRepeatSegment }) {
  const handleRepeat = () => {
    if (onRepeatSegment && currentSegment) {
      onRepeatSegment();
    }
  };

  const handlePlaybackSpeed = (speed) => {
    if (videoElement) {
      videoElement.playbackRate = speed;
    }
  };

  return (
    <div className="esl-controls">
      <h4>ESL Controls:</h4>
      <button onClick={handleRepeat} disabled={!currentSegment}>Repeat Segment</button>
      <button onClick={() => handlePlaybackSpeed(0.5)}>Speed 0.5x</button>
      <button onClick={() => handlePlaybackSpeed(0.75)}>Speed 0.75x</button>
      <button onClick={() => handlePlaybackSpeed(1)}>Speed 1x</button>
      <button onClick={() => handlePlaybackSpeed(1.25)}>Speed 1.25x</button>
      {/* Add more controls like 'shadowing mode toggle' if needed */}
    </div>
  );
}

export default ESLAudioControls;
