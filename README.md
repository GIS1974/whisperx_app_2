# RepeatAfter.Me

This project is a web application that automatically transcribes user-uploaded audio and video files and plays subtitled videos with features useful for ESL activities.

## Project Structure

- **/frontend**: Contains the React (Vite) frontend application.
- **/backend**: Contains the Node.js (Express) backend API.

## Setup

Detailed setup instructions will be added here. Key initial steps:
1.  Configure backend environment variables in `backend/.env` (copy from `backend/.env.example`), especially `REPLICATE_API_TOKEN` and `REPLICATE_WHISPER_MODEL_VERSION`.
2.  Install dependencies for both frontend and backend: `npm install` in `/frontend` and `/backend`.
3.  Run `docker-compose up --build` from the root directory for local development.
    Alternatively, run frontend and backend separately:
    - Frontend: `npm run dev` in `/frontend` (usually on port 3000)
    - Backend: `npm run dev` in `/backend` (usually on port 5000)

##IMPORTANT

The app currently sends video files (.mp4) directly to WhisperX/Replicate
FFmpeg conversion is NOT currently being used 

This approach works because:
WhisperX/Replicate can handle video files directly - Modern speech recognition services like WhisperX can extract audio from video files automatically
It's more efficient - No need for server-side processing, faster uploads
Less server resources - No CPU-intensive FFmpeg operations on your server

FFmpeg is available but not used. For future updates consider adding FFmpeg:

- to reduce file sizes before sending to Replicate (to save bandwidth/costs)
- to standardize audio format (e.g., always convert to 16kHz mono WAV for optimal recognition)
- to extract only audio to reduce processing time on Replicate's end.
