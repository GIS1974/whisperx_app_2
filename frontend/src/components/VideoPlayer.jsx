// frontend/src/components/VideoPlayer.js
import React, { forwardRef } from 'react';

const VideoPlayer = forwardRef(({ videoSrc, subtitleUrl, onTimeUpdate, onLoadedMetadata }, ref) => {
  // Determine if the source is audio or video based on file extension
  const isAudioFile = videoSrc && (videoSrc.includes('.wav') || videoSrc.includes('.mp3') || videoSrc.includes('.ogg') || videoSrc.includes('.aac'));

  return (
    <div>
      {isAudioFile && <p><em>Audio file detected - using audio player</em></p>}
      <video
        ref={ref}
        controls
        width="100%"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        crossOrigin="anonymous" // Important if subtitles/video are from different origin
        style={isAudioFile ? {height: '60px'} : {}} // Make audio player smaller
      >
        <source src={videoSrc} type={isAudioFile ? 'audio/wav' : 'video/mp4'} />
        {subtitleUrl && <track label="English" kind="subtitles" srcLang="en" src={subtitleUrl} default />}
        Your browser does not support the {isAudioFile ? 'audio' : 'video'} tag.
      </video>
    </div>
  );
});

export default VideoPlayer;
