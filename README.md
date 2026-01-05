# Faceless Video Automation

A Node.js CLI tool for automated faceless short-form video generation using AI-powered scripts, free stock footage from Pexels, and FFmpeg for video editing.

## Features

- 🤖 AI-powered script generation using Google Gemini
- 🎥 Automatic stock footage download from Pexels
- 🎬 Video editing and assembly with FFmpeg
- 🗣️ Text-to-speech audio generation
- 💻 CLI interface for easy operation
- 📦 Batch processing support

## Prerequisites

- Node.js (v16 or higher)
- FFmpeg installed on your system
- Google API key (for Gemini AI)
- Pexels API key (free tier available)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ahab8055/faceless-video-automation. git
cd faceless-video-automation
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and add your API keys:
```
GOOGLE_API_KEY=your_gemini_api_key_here
PEXELS_API_KEY=your_pexels_api_key_here
```

## Getting API Keys

### Google Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy and paste into your `.env` file

### Pexels API Key
1. Visit [Pexels API](https://www.pexels.com/api/)
2. Sign up for a free account
3. Navigate to your API section
4. Copy your API key and paste into your `.env` file

## Usage

### Generate Script
Generate a video script for a specific niche:
```bash
npm start generate [niche]
# Example: npm start generate "motivational quotes"
```

### Run Single Video
Process and create a complete video for a niche:
```bash
npm start run [niche]
# Example: npm start run "tech tips"
```

### Batch Process
Create multiple videos at once:
```bash
npm start batch [niche1,niche2,...]
# Example: npm start batch "fitness,cooking,travel"
```

## Project Structure

```
faceless-video-automation/
├── assets/              # Downloaded media assets (videos, images, audio)
├── output/              # Generated videos
├── scripts/             # Generated scripts and metadata
├── index.js             # Main CLI entry point
├── scripts.js           # Script generation module
├── downloads.js         # Asset download module
├── editor.js            # Video editing module
├── package.json         # Project dependencies
├── . env.example         # Environment template
└── README.md           # Documentation
```

## Modules

### scripts.js
Handles AI-powered script generation using Google Gemini:
- Generate engaging short-form content
- Format scripts for video narration
- Save scripts with metadata

### downloads.js
Manages media asset downloads: 
- Search and download Pexels videos
- Download images for thumbnails
- Generate TTS audio from scripts

### editor.js
Video editing and assembly:
- Combine footage with audio
- Add text overlays
- Apply transitions and effects
- Export final video

## Development

To contribute or modify:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Troubleshooting

### FFmpeg not found
Make sure FFmpeg is installed and in your system PATH:
- **Windows**: Download from [ffmpeg. org](https://ffmpeg.org/download.html)
- **Mac**: `brew install ffmpeg`
- **Linux**: `sudo apt-get install ffmpeg`

### API Rate Limits
- Pexels free tier: 200 requests per hour
- Gemini API: Check your quota in Google Cloud Console

## License

MIT License - feel free to use for personal and commercial projects

## Disclaimer

This tool is for content creation only. Ensure you comply with: 
- Pexels license terms
- Platform-specific content guidelines
- Copyright and fair use laws
