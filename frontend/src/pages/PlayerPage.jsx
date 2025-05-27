// frontend/src/pages/PlayerPage.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer.jsx';
import SubtitleDisplay from '../components/SubtitleDisplay.jsx';
import ESLAudioControls from '../components/ESLAudioControls.jsx';
import apiClient from '../services/apiClient';

// Helper to parse VTT (very basic) or use segments directly
const parseVTT = (vttString) => {
  if (!vttString) return [];
  const lines = vttString.split('\n');
  const segments = [];
  let currentSegment = null;

  for (const line of lines) {
    if (line.includes('-->')) {
      if (currentSegment) segments.push(currentSegment); // Should not happen if format is good
      const [startStr, endStr] = line.split(' --> ');
      currentSegment = {
        start: timeStringToSeconds(startStr),
        end: timeStringToSeconds(endStr),
        text: ''
      };
    } else if (currentSegment && line.trim() !== '' && !/^[0-9]+$/.test(line.trim())) {
      currentSegment.text += (currentSegment.text ? ' ' : '') + line.trim();
    } else if (line.trim() === '' && currentSegment) {
      if (currentSegment.text) segments.push(currentSegment);
      currentSegment = null;
    }
  }
  if (currentSegment && currentSegment.text) segments.push(currentSegment);
  return segments;
};

const timeStringToSeconds = (timeStr) => {
  const parts = timeStr.split(':');
  let seconds = 0;
  if (parts.length === 3) { // HH:MM:SS.mmm
    seconds += parseInt(parts[0], 10) * 3600;
    seconds += parseInt(parts[1], 10) * 60;
    seconds += parseFloat(parts[2]);
  } else if (parts.length === 2) { // MM:SS.mmm
    seconds += parseInt(parts[0], 10) * 60;
    seconds += parseFloat(parts[1]);
  }
  return seconds;
};


function PlayerPage() {
  const { jobId } = useParams(); // This is Replicate's prediction ID
  const navigate = useNavigate();
  const [jobStatus, setJobStatus] = useState(null);
  const [videoSrc, setVideoSrc] = useState('');
  const [subtitleUrl, setSubtitleUrl] = useState(''); // URL to .vtt file from Replicate
  const [segments, setSegments] = useState([]); // Parsed from Replicate output.segments or VTT
  const [currentSegmentText, setCurrentSegmentText] = useState('');
  const [currentActiveSegment, setCurrentActiveSegment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const videoRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const fetchJobStatus = useCallback(async () => {
    try {
      const response = await apiClient.get(`/transcribe/status/${jobId}`);
      const data = response.data;
      setJobStatus(data.status);

      if (data.status === 'succeeded') {
        setIsLoading(false);
        // Use the original input file URL as the media source
        // For audio files, this will work in the video element
        let mediaSource = data.output?.audio_path || data.input?.audio_file || data.input?.audio;

        // FALLBACK: If input data is missing (data_removed=true), we can't get the original file
        // In this case, we'll show a message that the media is no longer available
        if (!mediaSource) {
          console.warn('Media source not available - input data may have been removed by Replicate');
          setErrorMessage('Transcription completed, but the original media file is no longer available. This can happen if too much time has passed.');
          return;
        }

        setVideoSrc(mediaSource);
        console.log('Media source set to:', mediaSource);

        // Prefer direct VTT URL if available from Replicate output
        if (data.output?.vtt) {
            setSubtitleUrl(data.output.vtt); // This is a URL
             // Fetch and parse VTT if direct URL is given, to also populate segments for ESL controls
            fetch(data.output.vtt).then(res => res.text()).then(vttText => {
                setSegments(parseVTT(vttText));
            }).catch(err => console.error("Error fetching/parsing VTT from URL:", err));

        } else if (data.output?.segments) {
            setSegments(data.output.segments); // Assuming segments have {start, end, text}
            // If we only have segments, we might need to generate a VTT blob URL client-side
            // For now, let's assume VideoPlayer can handle segments or we generate VTT if needed
            const vttBlob = new Blob([generateVTTFromSegments(data.output.segments)], {type: 'text/vtt'});
            setSubtitleUrl(URL.createObjectURL(vttBlob));
        } else {
            console.warn("No VTT URL or segments found in Replicate output.");
            // Check if output is null (no speech detected) vs missing segments
            if (data.output === null) {
                setErrorMessage("Transcription completed, but no speech was detected in the audio/video file.");
            } else if (data.data_removed) {
                setErrorMessage("Transcription completed, but subtitle data is no longer available (data removed by Replicate).");
            } else {
                setErrorMessage("Transcription complete, but subtitle data is missing.");
            }
        }

        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      } else if (data.status === 'failed' || data.status === 'canceled') {
        setIsLoading(false);
        setErrorMessage(`Transcription job ${data.status}: ${data.error || 'Unknown error'}`);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
      // If still processing, the interval will continue polling.
    } catch (error) {
      console.error('Error fetching transcription status:', error);
      setIsLoading(false);
      setErrorMessage('Failed to fetch transcription status.');
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJobStatus(); // Initial fetch
    pollIntervalRef.current = setInterval(fetchJobStatus, 5000); // Poll every 5 seconds
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if(subtitleUrl && subtitleUrl.startsWith('blob:')) {
        URL.revokeObjectURL(subtitleUrl); // Clean up blob URL
      }
    };
  }, [fetchJobStatus, subtitleUrl]);

  const handleTimeUpdate = () => {
    if (videoRef.current && segments.length > 0) {
      const currentTime = videoRef.current.currentTime;
      const activeSegment = segments.find(seg => currentTime >= seg.start && currentTime < seg.end);
      if (activeSegment) {
        setCurrentSegmentText(activeSegment.text);
        setCurrentActiveSegment(activeSegment);
      } else {
        setCurrentSegmentText('');
        setCurrentActiveSegment(null);
      }
    }
  };

  const generateVTTFromSegments = (segArray) => {
    let vtt = "WEBVTT\n\n";
    segArray.forEach((s, i) => {
        vtt += `${i+1}\n`;
        vtt += `${timeSecondsToVTTCustom(s.start)} --> ${timeSecondsToVTTCustom(s.end)}\n`;
        vtt += `${s.text}\n\n`;
    });
    return vtt;
  };

  const timeSecondsToVTTCustom = (timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds * 1000) % 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  };


  const handleRepeatSegment = () => {
    if (videoRef.current && currentActiveSegment) {
      videoRef.current.currentTime = currentActiveSegment.start;
      videoRef.current.play();
    }
  };

  // Download functions
  const downloadTranscript = (format) => {
    if (!segments || segments.length === 0) {
      alert('No transcription data available to download.');
      return;
    }

    let content = '';
    let filename = `transcription_${jobId}.${format}`;
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
  };

  // Helper function to convert seconds to SRT time format
  const timeSecondsToSRT = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  };

  if (isLoading) return <p>Loading transcription data (Job ID: {jobId})... Status: {jobStatus || 'Initializing'}</p>;
  if (errorMessage) return <p style={{color: 'red'}}>Error: {errorMessage} <button onClick={() => navigate('/upload')}>Try another upload</button></p>;

  return (
    <div>
      <h2>Transcription Results (Job: {jobId})</h2>

      {/* Transcription Status */}
      <div style={{marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px'}}>
        <h3>Status: {jobStatus}</h3>
        {segments.length > 0 && (
          <p>✅ Transcription completed successfully! Found {segments.length} segments.</p>
        )}
      </div>

      {/* Download Controls */}
      {segments.length > 0 && (
        <div style={{marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px'}}>
          <h3>Download Transcription</h3>
          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
            <button onClick={() => downloadTranscript('txt')} style={{padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>
              Download TXT
            </button>
            <button onClick={() => downloadTranscript('srt')} style={{padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>
              Download SRT
            </button>
            <button onClick={() => downloadTranscript('vtt')} style={{padding: '10px 20px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>
              Download VTT
            </button>
          </div>
        </div>
      )}

      {/* Video Player (if media source is available) */}
      {videoSrc && (
        <div style={{marginBottom: '20px'}}>
          <h3>Media Player</h3>
          <VideoPlayer
            ref={videoRef}
            videoSrc={videoSrc}
            subtitleUrl={subtitleUrl}
            onTimeUpdate={handleTimeUpdate}
          />
          <SubtitleDisplay currentSegmentText={currentSegmentText} />
          <ESLAudioControls
            videoElement={videoRef.current}
            currentSegment={currentActiveSegment}
            onRepeatSegment={handleRepeatSegment}
          />
        </div>
      )}

      {/* Transcription Preview */}
      {segments.length > 0 && (
        <div style={{marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px'}}>
          <h3>Transcription Preview</h3>
          <div style={{maxHeight: '300px', overflowY: 'auto', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '3px'}}>
            {segments.map((segment, index) => (
              <div key={index} style={{marginBottom: '10px', padding: '5px', backgroundColor: 'white', borderRadius: '3px'}}>
                <strong>[{timeSecondsToVTTCustom(segment.start)} → {timeSecondsToVTTCustom(segment.end)}]</strong>
                <br />
                {segment.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* For debugging: */}
      {/* <pre>Segments: {JSON.stringify(segments, null, 2)}</pre> */}
    </div>
  );
}

export default PlayerPage;
