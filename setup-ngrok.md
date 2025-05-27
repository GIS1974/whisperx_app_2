# ngrok Setup Guide

## Step 1: Sign up and get auth token
1. Go to https://dashboard.ngrok.com/signup
2. Sign up for a free account
3. Go to https://dashboard.ngrok.com/get-started/your-authtoken
4. Copy your auth token

## Step 2: Configure ngrok
```bash
./ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

## Step 3: Start ngrok
```bash
./ngrok http 5000
```

## Step 4: Update .env file
After starting ngrok, you'll see output like:
```
Forwarding    https://abc123.ngrok.io -> http://localhost:5000
```

Copy the https URL (e.g., `https://abc123.ngrok.io`) and update your backend/.env file:

```env
SERVER_PUBLIC_URL="https://abc123.ngrok.io"
```

## Step 5: Remove the workaround
Once ngrok is working, you can remove the workaround from frontend/src/pages/UploadPage.jsx that uses the public test file.

## Step 6: Test
1. Upload a file through the frontend
2. The transcription should now use your actual uploaded file
3. Replicate will be able to access the file via the ngrok URL

## Notes
- Keep ngrok running while testing
- The ngrok URL changes each time you restart (unless you have a paid plan)
- For production, consider using cloud storage instead of ngrok
