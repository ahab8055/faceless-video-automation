# Generate Videos Command

The `generate-videos` command is a simple script to generate multiple videos for a specific niche.

## Usage

```bash
# Generate 5 videos (default) for a niche
npm run generate-videos "motivational quotes"

# Generate a custom number of videos
npm run generate-videos "fitness tips" -- -c 10

# Using the CLI directly
node dist/index.js generate-videos "tech news" -c 3
```

## Syntax

```bash
generate-videos <niche> [options]
```

### Arguments

- `<niche>` - The niche/topic for the videos (e.g., "motivational quotes")

### Options

- `-c, --count <number>` - Number of videos to generate (default: 5, max: 50)

## How It Works

The `generate-videos` command:

1. Takes a single niche as input
2. Generates the specified number of videos for that niche
3. Each video goes through the complete pipeline:
   - Generates a unique viral script with AI
   - Extracts keywords from the script
   - Downloads assets from Pexels
   - Creates a timestamped output folder
   - Generates the video with TTS, music, and overlays
4. Adds 5-second delays between videos to respect API rate limits
5. Provides a summary report at the end

## Examples

### Generate 3 Fitness Videos

```bash
npm run generate-videos "fitness motivation" -- -c 3
```

**Output:**
```
═══════════════════════════════════════════════════
🎬 FACELESS VIDEO AUTOMATION - GENERATE VIDEOS
═══════════════════════════════════════════════════

📋 Generating 3 video(s) for niche: fitness motivation

═══════════════════════════════════════════════════
📹 GENERATING VIDEO 1/3
═══════════════════════════════════════════════════

🎬 PROCESSING: fitness motivation
📝 Step 1/4: Generating viral script...
🔑 Step 2/4: Extracting keywords...
📦 Step 3/4: Downloading assets...
🎥 Step 4/4: Creating short video...
✅ Completed video 1/3

⏳ Waiting 5 seconds before next video...

[... continues for videos 2 and 3 ...]

═══════════════════════════════════════════════════
📊 GENERATION SUMMARY
═══════════════════════════════════════════════════

✅ Successful: 3/3

✅ Successful videos:

   📹 Video 1
      Path: output/fitness-motivation_1704537045/fitness-motivation_20240106_103045.mp4
      Caption: 💪 Transform your fitness journey with these powerful tips!

   📹 Video 2
      Path: output/fitness-motivation_1704537145/fitness-motivation_20240106_103145.mp4
      Caption: 🔥 Unlock your potential with these fitness secrets!

   📹 Video 3
      Path: output/fitness-motivation_1704537245/fitness-motivation_20240106_103245.mp4
      Caption: 🏋️ Achieve your fitness goals faster with this advice!

═══════════════════════════════════════════════════
```

### Generate 10 Tech Videos

```bash
npm run generate-videos "tech tips" -- -c 10
```

This will generate 10 unique tech tips videos, each with its own:
- Unique AI-generated script
- Relevant assets from Pexels
- Custom caption and hashtags
- Timestamped output folder

## Benefits Over `batch-multi`

The `generate-videos` command is ideal when you want:

1. **Multiple variations of the same niche** - Perfect for testing different scripts for the same topic
2. **Simpler workflow** - No need for a niches file, just specify the niche directly
3. **Quick bulk generation** - Generate many videos for a single niche quickly
4. **Content testing** - Test which script style works best for your audience

Use `batch-multi` when you want to generate videos across different niches.

## Tips

1. **Start Small**: Test with 2-3 videos first to ensure everything works
2. **Monitor API Limits**: Pexels free tier allows 200 requests/hour
3. **Check Output**: Review the first video before generating many
4. **Error Recovery**: The command continues even if some videos fail
5. **Unique Content**: Each video will have a unique script, even for the same niche

## Error Handling

If a video fails to generate, the command will:
- Log the error
- Continue to the next video
- Include the failure in the summary report

Example with failures:
```
═══════════════════════════════════════════════════
📊 GENERATION SUMMARY
═══════════════════════════════════════════════════

✅ Successful: 2/3

✅ Successful videos:
   📹 Video 1: output/tech-tips_1704537045/...
   📹 Video 3: output/tech-tips_1704537245/...

❌ Failed: 1/3

Failed videos:
   ✗ Video 2: API rate limit exceeded
═══════════════════════════════════════════════════
```

## Output Structure

Each video is saved in its own timestamped folder:

```
output/
├── niche-name_1704537045/
│   ├── niche-name_20240106_103045.mp4
│   ├── niche-name_20240106_103045_caption.txt
│   └── niche-name_20240106_103045_hashtags.txt
├── niche-name_1704537145/
│   ├── niche-name_20240106_103145.mp4
│   ├── niche-name_20240106_103145_caption.txt
│   └── niche-name_20240106_103145_hashtags.txt
└── ...
```

## Comparison with Other Commands

| Command | Purpose | Input | Videos per Niche |
|---------|---------|-------|------------------|
| `batch` | Single video | One niche | 1 |
| `batch-multi` | Multiple niches | Comma-separated or file | 1 per niche |
| `generate-videos` | Multiple videos | One niche + count | Multiple (configurable) |

## Requirements

- Valid API keys in `.env` file (MISTRAL_API_KEY, PEXELS_API_KEY)
- FFmpeg installed and in PATH
- Node.js v16 or higher
- Sufficient disk space for videos

## Scheduling with Cron

You can schedule this command using system cron:

```bash
# Edit crontab
crontab -e

# Add entry to generate 5 fitness videos daily at 8 AM
0 8 * * * cd /path/to/project && npm run generate-videos "fitness motivation" -- -c 5 >> /path/to/logs/fitness.log 2>&1

# Generate 3 tech videos every 6 hours
0 */6 * * * cd /path/to/project && npm run generate-videos "tech tips" -- -c 3 >> /path/to/logs/tech.log 2>&1
```

Or use a task scheduler on Windows or macOS.

## Troubleshooting

**Command not found:**
```bash
npm run build  # Rebuild the project
```

**API rate limits:**
- Reduce the count (-c option)
- Add longer delays between runs
- Upgrade your Pexels plan

**FFmpeg errors:**
- Ensure FFmpeg is installed: `ffmpeg -version`
- Check disk space
- Review FFmpeg logs in console output

For more help, see the main [README.md](README.md) or [BATCH_COMMANDS.md](BATCH_COMMANDS.md).
