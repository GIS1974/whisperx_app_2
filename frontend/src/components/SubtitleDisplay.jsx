// frontend/src/components/SubtitleDisplay.js
import React from 'react';

function SubtitleDisplay({ currentSegmentText }) {
  return (
    <div className="subtitle-display">
      <p>{currentSegmentText || ' '}</p> {/* Use non-breaking space for empty line */}
    </div>
  );
}

export default SubtitleDisplay;
