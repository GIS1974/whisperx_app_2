### Project Title: RepeatAfter.Me (ESL Video Learning Platform)
### Core Goal
To create a web application that allows users to upload audio (.mp3) or video (.mp4, .mkv) files, automatically transcribe them using the Replicate API for WhisperX, and provide ESL-focused playback features, including "listen-and-repeat" and "shadowing," with word-level highlighting.
### Refined Requirements
#### 1. User Accounts and Authentication
•	Users must be able to create accounts and log in securely.
•	Django's built-in authentication system will be used.
#### 2. File Upload and Storage
•	Users can upload audio (.mp3) and video (.mp4, .mkv) files from their local computers.
•	Local Storage (Initial Development): During development, uploaded files will be stored temporarily on the local server's filesystem.
•	Cloud Storage (Future): The application will be designed to be easily migrated to cloud storage (AWS S3, Google Cloud Storage, Azure Blob Storage) for production deployment.
•	Uploaded files will be associated with the user's account.
#### 3. Audio Extraction
•	The backend will use FFmpeg to extract audio from video files before sending them to the WhisperX API.
•	Recommended FFmpeg settings: see FFmpeg_settings.md
#### 4. WhisperX Transcription
•	The backend will interact with the Replicate API for the victor-upmeet/whisperx model (or similar).
•	API Parameters: 
o	Optimal API parameters: see Replicate_API_parameters.md
o	align_output: Must be set to true to obtain word-level timestamps for highlighting.
•	The Replicate API key will be securely managed using environment variables.
#### 5. Subtitle Generation
•	The backend will parse the JSON output from WhisperX and generate subtitle files in the following formats: 
o	.VTT: For web-based video playback with Video.js.
o	.SRT: For compatibility with desktop video players.
o	.TXT: A plain text transcript.
•	Subtitle files will be associated with the user's account and the original media file.
#### 6. Video Playback with Subtitles
•	The frontend will use Video.js to play the uploaded video with synchronized subtitles.
•	Word-Level Highlighting: The currently spoken word in the subtitles will be highlighted in real-time. This requires accurate word-level timestamps from WhisperX and VTT subtitle support in Video.js.
•	Customizable subtitle appearance (font size, color, background) is a desirable enhancement.
#### 7. ESL-Specific Features
•	"Listen-and-Repeat" Feature: 
o	The player should be able to play the audio/video segment by segment (based on subtitle timings).
o	Controls: Pause after each segment, replay current segment, move to next/previous segment.
•	"Shadowing" Feature: 
o	Playback speed control (e.g., 0.5x, 0.75x, 1.0x, 1.25x).
o	Option to mute the original audio track while the user attempts to shadow.
#### 8. User Interface (UI)
•	Clean and intuitive design.
•	Clear progress indication during file upload and transcription.
•	Easy-to-use controls for video playback and ESL features.
•	Tailwind CSS will be used for styling.
#### 9. Database
•	Django's ORM will be used to interact with the database.
•	SQLite (Initial Development): SQLite will be used for local development.
•	PostgreSQL (Production): The application will be designed to be easily migrated to PostgreSQL for production deployment.
•	Database Schemas: 
o	User: Stores user account information (username, password, email, etc.).
o	MediaFile: Stores metadata about uploaded files (filename, user_id, upload_date, storage_path_original, storage_path_audio, storage_path_vtt, etc.).
o	Transcription: Stores metadata about transcriptions (media_file_id, transcription_date, storage_path_vtt, storage_path_srt, storage_path_txt, etc.).
#### 10. Deployment
•	Frontend: Vercel.
•	Backend: To be determined (cloud provider or company server).
#### 11. Error Handling
•	The application should handle errors gracefully (e.g., upload failures, Replicate API errors, unsupported file types).
•	Informative error messages should be displayed to the user.
#### 12. No Transcription Editing (Initial MVP)
•	The initial version of the application will not include a feature for users to edit the generated subtitles. The focus will be on achieving high-quality transcriptions from WhisperX.
### Summary
This project aims to create a user-friendly web application for ESL learners that leverages automatic transcription and targeted playback features. The application will be built using React (with Vite), Video.js, Django, and the Replicate API for WhisperX. The initial development will focus on core functionality and local testing, with a clear path towards cloud storage and production deployment.
