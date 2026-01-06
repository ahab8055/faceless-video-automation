# Batch Commands Documentation

This guide covers the enhanced batch processing, automated scheduling, and cleanup functionality for the faceless video automation CLI.

## Table of Contents
- [Commands Overview](#commands-overview)
- [batch Command](#batch-command)
- [batch-multi Command](#batch-multi-command)
- [schedule Command](#schedule-command)
- [cleanup Command](#cleanup-command)
- [Complete Workflow Examples](#complete-workflow-examples)
- [Output Structure](#output-structure)
- [Tips & Best Practices](#tips--best-practices)
- [Troubleshooting](#troubleshooting)
- [PM2 Process Manager Setup](#pm2-process-manager-setup)

## Commands Overview

| Command | Description | Use Case |
|---------|-------------|----------|
| `batch` | Process a single niche through the complete pipeline | Generate one video with full automation |
| `batch-multi` | Process multiple niches sequentially | Bulk video creation from list or file |
| `schedule` | Automated scheduled video generation using cron | Continuous content creation on a schedule |
| `cleanup` | Remove old assets and temporary files | Free disk space and maintain organization |

## batch Command

### Description
Process a single niche through the complete video generation pipeline.

### Pipeline Steps
1. Generate viral script with AI (script, caption, hashtags)
2. Extract keywords from the generated script
3. Download assets from Pexels using keywords
4. Create timestamped output folder
5. Generate video with TTS, music, and text overlays

### Usage
```bash
# Using npm
npm run batch "motivational quotes"

# Using pnpm
pnpm batch "fitness motivation"

# Direct execution
node dist/index.js batch "tech tips"
```

### Example Output
```
═══════════════════════════════════════════════════
🎬 FACELESS VIDEO AUTOMATION - BATCH PIPELINE
═══════════════════════════════════════════════════

═══════════════════════════════════════════════════
🎬 PROCESSING: motivational quotes
═══════════════════════════════════════════════════

📝 Step 1/4: Generating viral script...
✅ Script generated and saved to: scripts/2024-01-06T10-30-45.txt

🔑 Step 2/4: Extracting keywords...
   Keywords: motivational, inspiration, success, mindset, growth

📦 Step 3/4: Downloading assets...
✅ Downloaded 8 asset(s) total

🎥 Step 4/4: Creating short video...
✅ Video created successfully!

═══════════════════════════════════════════════════
✅ SUCCESS!
═══════════════════════════════════════════════════
Video ready: output/motivational-quotes_1704537045/motivational-quotes_20240106_103045.mp4
Caption: 🚀 Transform your mindset and achieve greatness! Start today! 💪
═══════════════════════════════════════════════════
```

## batch-multi Command

### Description
Process multiple niches sequentially with automatic rate limiting and comprehensive reporting.

### Features
- ✅ Comma-separated niche input
- ✅ File-based niche input with `-f` flag
- ✅ Support for `#` comments in niches file
- ✅ 5-second delays between batches
- ✅ Graceful error handling
- ✅ Detailed summary report

### Usage

#### From Command Line Arguments
```bash
# Process multiple niches
npm run batch-multi "fitness,cooking,travel"

# With quotes for multi-word niches
npm run batch-multi "fitness motivation,cooking recipes,travel destinations"
```

#### From Niches File
```bash
# Using default niches.txt file
npm run batch-multi

# Using custom file
npm run batch-multi -- -f my-niches.txt
npm run batch-multi -- --file /path/to/niches.txt
```

### Niches File Format
Create a `niches.txt` file (or any name you prefer):

```text
# Faceless Video Niches
# One niche per line. Lines starting with # are ignored.

motivational quotes
tech tips
life hacks
fitness motivation
productivity tips
meditation mindfulness
cooking recipes
travel destinations
history facts
science explained

# Future ideas (commented out)
# fashion tips
# pet care
```

### Example Output
```
═══════════════════════════════════════════════════
🎬 FACELESS VIDEO AUTOMATION - BATCH MULTI
═══════════════════════════════════════════════════

📋 Processing 3 niche(s): fitness, cooking, travel

═══════════════════════════════════════════════════
📹 PROCESSING 1/3: fitness
═══════════════════════════════════════════════════
[... processing output ...]
✅ Completed: fitness

⏳ Waiting 5 seconds before next batch...

═══════════════════════════════════════════════════
📹 PROCESSING 2/3: cooking
═══════════════════════════════════════════════════
[... processing output ...]
✅ Completed: cooking

⏳ Waiting 5 seconds before next batch...

═══════════════════════════════════════════════════
📊 BATCH PROCESSING SUMMARY
═══════════════════════════════════════════════════

✅ Successful: 3/3

✅ Successful videos:

   📹 fitness
      Video: output/fitness_1704537045/fitness_20240106_103045.mp4
      Caption: 💪 Get fit with these amazing tips! Start your journey today!

   📹 cooking
      Video: output/cooking_1704537145/cooking_20240106_103145.mp4
      Caption: 🍳 Master these cooking techniques and impress everyone!

   📹 travel
      Video: output/travel_1704537245/travel_20240106_103245.mp4
      Caption: ✈️ Explore these amazing destinations around the world!

═══════════════════════════════════════════════════
```

## schedule Command

### Description
Automate video generation on a schedule using cron expressions.

### Features
- ✅ Cron-based scheduling
- ✅ Random niche selection from file
- ✅ Configurable video count per run
- ✅ Runs continuously until stopped
- ✅ Execution timestamp logging

### Usage
```bash
# Default: Every day at 8 AM, 5 videos per run
npm run schedule

# Custom schedule: Every 6 hours
npm run schedule -- -s "0 */6 * * *"

# Custom count: 3 videos per run
npm run schedule -- -c 3

# Custom niches file
npm run schedule -- -f custom-niches.txt

# Combined options
npm run schedule -- -s "0 9 * * 1" -c 10 -f premium-niches.txt
```

### Cron Expression Format
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday = 0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Cron Expression Examples

| Expression | Description |
|------------|-------------|
| `0 8 * * *` | Every day at 8:00 AM |
| `0 */6 * * *` | Every 6 hours |
| `0 9 * * 1` | Every Monday at 9:00 AM |
| `0 12 * * 1-5` | Weekdays at noon |
| `0 0 1 * *` | First day of every month at midnight |
| `*/15 * * * *` | Every 15 minutes |
| `0 8,12,18 * * *` | At 8 AM, 12 PM, and 6 PM daily |

### Example Output
```
═══════════════════════════════════════════════════
🎬 FACELESS VIDEO AUTOMATION - SCHEDULER
═══════════════════════════════════════════════════

⚙️  Schedule Configuration:
   Cron: 0 8 * * *
   Videos per run: 5
   Niches file: /home/user/project/niches.txt

🚀 Scheduler started! Press Ctrl+C to stop.

═══════════════════════════════════════════════════
🕒 SCHEDULED RUN: 2024-01-06T08:00:00.000Z
═══════════════════════════════════════════════════

📋 Selected niches: tech tips, fitness motivation, cooking recipes, travel destinations, productivity tips

📹 Processing 1/5: tech tips
[... processing output ...]
✅ Completed: tech tips
   Video: output/tech-tips_1704528000/tech-tips_20240106_080000.mp4

⏳ Waiting 5 seconds before next batch...

[... continues for all 5 niches ...]

✅ Scheduled run completed!

[... waits for next scheduled run ...]
```

### Stopping the Scheduler
Press `Ctrl+C` to gracefully stop the scheduler:
```
🛑 Scheduler stopped by user.
```

## cleanup Command

### Description
Remove old assets and temporary files to free disk space.

### Features
- ✅ Remove old timestamped folders in `assets/`
- ✅ Remove temporary folders in `output/` (folders starting with `temp-`)
- ✅ Configurable age threshold (days)
- ✅ Dry-run mode for preview
- ✅ Per-folder size and deletion info
- ✅ Total space freed calculation

### Usage
```bash
# Default: Remove assets older than 7 days
npm run cleanup

# Custom age: Remove assets older than 30 days
npm run cleanup -- -d 30
npm run cleanup -- --days 30

# Preview mode: See what would be deleted without deleting
npm run cleanup -- --dry-run

# Combined: Preview 30-day cleanup
npm run cleanup -- -d 30 --dry-run
```

### Example Output
```
═══════════════════════════════════════════════════
🎬 FACELESS VIDEO AUTOMATION - CLEANUP
═══════════════════════════════════════════════════

🧹 Cleanup Configuration:
   Remove files older than: 7 days (before 2023-12-30T10:30:00.000Z)
   Mode: DELETE

📁 Scanning assets/ directory...

   🗑️  Deleting: 2023-12-25T14-30-00
      Size: 245.67 MB
      Modified: 2023-12-25T14:30:00.000Z

   🗑️  Deleting: 2023-12-28T09-15-30
      Size: 189.42 MB
      Modified: 2023-12-28T09:15:30.000Z

📁 Scanning output/ directory...

   🗑️  Deleting: temp-1703512345
      Size: 12.34 MB
      Modified: 2023-12-25T14:32:25.000Z

═══════════════════════════════════════════════════
📊 CLEANUP SUMMARY
═══════════════════════════════════════════════════
🗑️  Removed: 3 folder(s)
💾 Space freed: 447.43 MB
═══════════════════════════════════════════════════
```

### Dry Run Example
```bash
npm run cleanup -- --dry-run
```

Output:
```
🧹 Cleanup Configuration:
   Remove files older than: 7 days (before 2023-12-30T10:30:00.000Z)
   Mode: DRY RUN (preview only)

📁 Scanning assets/ directory...

   🔍 Would delete: 2023-12-25T14-30-00
      Size: 245.67 MB
      Modified: 2023-12-25T14:30:00.000Z

═══════════════════════════════════════════════════
📊 CLEANUP SUMMARY
═══════════════════════════════════════════════════
🔍 Would remove: 1 folder(s)
💾 Space that would be freed: 245.67 MB
═══════════════════════════════════════════════════

💡 Run without --dry-run to actually delete these files.
```

## Complete Workflow Examples

### Scenario 1: Daily Content Creation
Create videos every day automatically:

```bash
# Setup: Create niches.txt with your topics
cat > niches.txt << EOF
motivational quotes
fitness tips
cooking hacks
productivity tips
tech news
EOF

# Start scheduler: 3 videos daily at 8 AM
npm run schedule -- -s "0 8 * * *" -c 3

# Weekly cleanup: Remove files older than 14 days
# Add to crontab or run manually:
npm run cleanup -- -d 14
```

### Scenario 2: Bulk Video Production
Generate multiple videos at once:

```bash
# Create 10 videos from file
echo "fitness\ncooking\ntravel\ntech\nhealth\nmotivation\nlifehacks\nscience\nhistory\nart" > my-niches.txt
npm run batch-multi -- -f my-niches.txt

# Or from command line
npm run batch-multi "fitness,cooking,travel,tech,health"
```

### Scenario 3: Testing New Niche
Test a single niche before bulk processing:

```bash
# Test single niche
npm run batch "cryptocurrency explained"

# If successful, add to niches.txt and run batch-multi
echo "cryptocurrency explained" >> niches.txt
npm run batch-multi
```

### Scenario 4: Weekend Content Batch
Generate content only on weekends:

```bash
# Every Saturday at 9 AM, create 10 videos
npm run schedule -- -s "0 9 * * 6" -c 10

# Every Sunday at 2 PM, create 5 videos
npm run schedule -- -s "0 14 * * 0" -c 5
```

## Output Structure

### Batch Pipeline Output
```
project-root/
├── output/
│   ├── niche-name_1704537045/
│   │   ├── niche-name_20240106_103045.mp4
│   │   ├── niche-name_20240106_103045_caption.txt
│   │   └── niche-name_20240106_103045_hashtags.txt
│   └── temp-1704537045/  (cleaned up automatically)
├── assets/
│   └── 2024-01-06T10-30-45/
│       ├── video-motivational-1.mp4
│       ├── video-motivational-2.mp4
│       ├── photo-inspiration-1.jpg
│       └── metadata.json
└── scripts/
    └── 2024-01-06T10-30-45.txt
```

### File Naming Convention
- **Video**: `{niche}_{timestamp}.mp4`
- **Caption**: `{niche}_{timestamp}_caption.txt`
- **Hashtags**: `{niche}_{timestamp}_hashtags.txt`
- **Timestamp Format**: `YYYYMMDD_HHmmss`

### Caption File Example
```
🚀 Transform your mindset and achieve greatness! Start today! 💪
```

### Hashtags File Example
```
#motivation #inspiration #mindset #success #growth #viral #shorts #trending #faceless #ai
```

## Tips & Best Practices

### Optimal Scheduling
1. **Peak Times**: Schedule for 6-8 AM to have content ready for peak engagement hours
2. **Consistency**: Use the same time daily for algorithm favorability
3. **Volume**: Start with 3-5 videos per day, scale based on performance
4. **Rest Periods**: Include delays between batches to respect API rate limits

### Niche Selection
1. **Evergreen Content**: Choose topics that remain relevant (tips, facts, quotes)
2. **Trending Topics**: Mix in current trends for higher engagement
3. **Niche Diversity**: Rotate between 10-15 niches for variety
4. **Performance Tracking**: Remove underperforming niches, add new ones

### Storage Management
1. **Regular Cleanup**: Run cleanup weekly with 7-14 day threshold
2. **Preview First**: Always use `--dry-run` before major cleanups
3. **Archive Important**: Move successful videos to archive before cleanup
4. **Monitor Space**: Keep at least 10GB free for smooth operations

### Error Handling
1. **Check Logs**: Review console output for error details
2. **API Keys**: Verify keys are valid and have quota remaining
3. **Network**: Ensure stable internet connection for downloads
4. **FFmpeg**: Confirm FFmpeg is installed and accessible
5. **Continue on Failure**: batch-multi continues even if some niches fail

## Troubleshooting

### "Invalid cron expression" Error
```bash
# ❌ Wrong
npm run schedule -- -s "every day at 8am"

# ✅ Correct
npm run schedule -- -s "0 8 * * *"
```

Use online cron validators: [crontab.guru](https://crontab.guru/)

### "Niches file not found" Error
```bash
# Check current directory
pwd

# List files
ls -la

# Create niches.txt if missing
cat > niches.txt << EOF
motivational quotes
tech tips
EOF

# Use absolute path
npm run batch-multi -- -f /full/path/to/niches.txt
```

### API Rate Limit Errors
**Symptoms**: "Too many requests" or 429 errors

**Solutions**:
1. Reduce videos per run: `npm run schedule -- -c 3`
2. Increase schedule interval: `0 */8 * * *` (every 8 hours)
3. The built-in 5-second delays help, but reduce batch size for sensitive APIs

### FFmpeg Errors
```bash
# Check FFmpeg installation
ffmpeg -version

# Install if missing
# Mac: brew install ffmpeg
# Ubuntu: sudo apt-get install ffmpeg
# Windows: Download from ffmpeg.org
```

### Scheduler Not Running
**Issue**: Scheduler starts but doesn't execute

**Solutions**:
1. Verify cron expression is valid
2. Check if time is in the future (not immediate)
3. Test with frequent schedule: `*/5 * * * *` (every 5 minutes)
4. Ensure process isn't killed/stopped

### Out of Disk Space
```bash
# Check disk space
df -h

# Run cleanup with aggressive settings
npm run cleanup -- -d 3

# Remove all temp folders manually if needed
rm -rf output/temp-*
```

## PM2 Process Manager Setup

For production environments, use PM2 to keep the scheduler running continuously.

### Installation
```bash
npm install -g pm2
```

### Configuration File
Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'video-scheduler',
    script: 'dist/index.js',
    args: 'schedule -s "0 8 * * *" -c 5',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/scheduler-error.log',
    out_file: 'logs/scheduler-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

### PM2 Commands
```bash
# Start scheduler
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs video-scheduler

# View real-time logs
pm2 logs video-scheduler --lines 100

# Stop scheduler
pm2 stop video-scheduler

# Restart scheduler
pm2 restart video-scheduler

# Delete from PM2
pm2 delete video-scheduler

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### Multiple Schedulers
Run different schedules simultaneously:

```javascript
module.exports = {
  apps: [
    {
      name: 'scheduler-morning',
      script: 'dist/index.js',
      args: 'schedule -s "0 8 * * *" -c 5 -f morning-niches.txt'
    },
    {
      name: 'scheduler-evening',
      script: 'dist/index.js',
      args: 'schedule -s "0 18 * * *" -c 3 -f evening-niches.txt'
    },
    {
      name: 'scheduler-weekend',
      script: 'dist/index.js',
      args: 'schedule -s "0 9 * * 0,6" -c 10 -f weekend-niches.txt'
    }
  ]
};
```

```bash
# Start all schedulers
pm2 start ecosystem.config.js

# Monitor all
pm2 monit
```

### PM2 Log Rotation
Prevent logs from growing too large:

```bash
# Install PM2 log rotate module
pm2 install pm2-logrotate

# Configure rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Health Monitoring
```bash
# Monitor CPU and memory
pm2 monit

# Get detailed info
pm2 show video-scheduler

# View metrics
pm2 web
# Then open http://localhost:9615
```

---

## Quick Reference Card

```bash
# Single Video
npm run batch "niche name"

# Multiple Videos (CLI)
npm run batch-multi "niche1,niche2,niche3"

# Multiple Videos (File)
npm run batch-multi -- -f niches.txt

# Schedule (Default)
npm run schedule

# Schedule (Custom)
npm run schedule -- -s "0 */6 * * *" -c 3

# Cleanup (Preview)
npm run cleanup -- --dry-run

# Cleanup (Execute)
npm run cleanup -- -d 7

# PM2 Start
pm2 start ecosystem.config.js

# PM2 Logs
pm2 logs video-scheduler --lines 100
```

---

**Need Help?** Check the main [README.md](README.md) or open an issue on GitHub.
