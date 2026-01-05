# Faceless Video Automation

A Node.js CLI tool for automated faceless short-form video generation using AI-powered scripts, free stock footage from Pexels, and FFmpeg for video editing.

**Built with TypeScript** for type safety and improved developer experience.
**Powered by Mistral AI** for intelligent script generation.

## Features

- 🤖 AI-powered script generation using Mistral AI
- 🎥 Automatic stock footage download from Pexels
- 🎬 Video editing and assembly with FFmpeg
- 🗣️ Text-to-speech audio generation
- 💻 CLI interface for easy operation
- 📦 Batch processing support

## Prerequisites

- Node.js (v16 or higher)
- pnpm (recommended) or npm
- FFmpeg installed on your system
- Mistral AI API key
- Pexels API key (free tier available)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ahab8055/faceless-video-automation.git
cd faceless-video-automation
```

2. Install dependencies:
pnpm install
```

3. Build the TypeScript project:
```bash
pnpm build
```

4
3. Set up environment variables:
```bash
cp .env.example .env
```


## Scripts

- `pnpm build` - Compile TypeScript to JavaScript
- `pnpm start` - Run the compiled CLI
- `pnpm dev` - Run TypeScript directly with ts-node (for development)
- `pnpm watch` - Watch mode for development
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
pnpm start generate [niche]
# Example: pnpm start generate "motivational quotes"
```

### Run Single Video
Process and create a complete video for a niche:
```bash
pnpm start run [niche]
# Example: pnpm start run "tech tips"
```

### Batch Process
Create multiple videos at once:
```bash
pnpm start batch [niche1,niche2,...]
# Example: pnpm start run "tech tips"
```

### Batch Process
Create multiple videos at once:
```bash
npm start batch [niche1,niche2,...]
# Exsrc/                 # TypeScript source files
│   ├── index.ts         # Main CLI entry point
│   ├── scripts.ts       # Script generation module
│   ├── downloads.ts     # Asset download module
│   ├── editor.ts        # Video editing module
│   └── types.ts         # TypeScript type definitions
├── dist/                # Compiled JavaScript output
├── assets/              # Downloaded media assets
├── output/              # Generated videos
├── scripts/             # Generated scripts and metadata
├── tsconfig.json        # TypeScript configuration
├── package.json         # Project dependencies
├── .env.example         # Environment template
└── README.md           # Documentation
```

## Modules

### src/types.ts
TypeScript type definitions:
- Script, Assets, and API response interfaces
- FFmpeg metadata and progress types
- Command options types

### src/scripts.ts
Handles AI-powered script generation using Mistral AI:
- Generate engaging short-form content
- Format scripts for video narration
- Save scripts with metadata

### src/downloads.ts
Manages media asset downloads: 
- Search and download Pexels videos
- Download images for thumbnails
- Generate TTS audio from scripts

### src/editor.t
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
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- **Mac**: `brew install ffmpeg`
- **Linux**: `sudo apt-get install ffmpeg`

### API Rate Limits
- Pexels free tier: 200 requests per hour
- Mistral AI: Check your quota in Mistral Console

### Missing API Keys
If you see "MISTRAL_API_KEY not found" or "PEXELS_API_KEY not found" errors:
1. Make sure you've created a `.env` file in the project root
2. Copy the contents from `.env.example`
3. Replace the placeholder values with your actual API keys
4. Save the file and try again

### Videos Not Downloading
- Check your Pexels API key is valid
- Ensure you haven't exceeded the rate limit (200 requests/hour)
- Check your internet connection
- Some search terms may not return results - try different terms

### Video Creation Fails
- Verify FFmpeg is installed: run `ffmpeg -version` in terminal
- Check that downloaded videos are in the assets directory
- Ensure sufficient disk space for video processing
- Check the output logs for specific error messages

## License

MIT License - feel free to use for personal and commercial projects

## Disclaimer

This tool is for content creation only. Ensure you comply with: 
- Pexels license terms
- Platform-specific content guidelines
- Copyright and fair use laws
