# Quick Usage Examples

## Setup
```bash
# Install dependencies
npm install

# Build the project
npm run build

# Create .env file with your API keys
cp .env.example .env
# Edit .env and add your MISTRAL_API_KEY and PEXELS_API_KEY
```

## Basic Commands

### Generate a Single Video
```bash
npm run batch "motivational quotes"
```

### Generate Multiple Videos from Command Line
```bash
npm run batch-multi "fitness,cooking,travel"
```

### Generate Multiple Videos from File
```bash
# Using default niches.txt
npm run batch-multi

# Using custom file
npm run batch-multi -- -f my-niches.txt
```

## Scheduling

### Run Daily at 8 AM (Default)
```bash
npm run schedule
```

### Custom Schedule - Every 6 Hours
```bash
npm run schedule -- -s "0 */6 * * *"
```

### Generate 3 Videos Per Run
```bash
npm run schedule -- -c 3
```

### All Options Combined
```bash
npm run schedule -- -s "0 9 * * 1-5" -c 5 -f work-niches.txt
# Every weekday at 9 AM, generate 5 videos from work-niches.txt
```

## Cleanup

### Preview Cleanup (Dry Run)
```bash
npm run cleanup -- --dry-run
```

### Clean Files Older Than 7 Days (Default)
```bash
npm run cleanup
```

### Clean Files Older Than 30 Days
```bash
npm run cleanup -- -d 30
```

### Preview 30-Day Cleanup
```bash
npm run cleanup -- -d 30 --dry-run
```

## Existing Commands (Still Available)

### Generate Script Only
```bash
npm run generate "tech tips"
```

### Full Video Pipeline (Legacy)
```bash
npm run video "fitness motivation"
```

### Download Assets
```bash
npm run download "ocean waves"
npm run download "mountain landscape" -- -c 10
```

### Edit Video from Assets
```bash
npm run edit ./assets/my-folder ./scripts/my-script.txt
```

## Common Workflows

### Daily Content Creation
```bash
# 1. Setup niches file
cat > niches.txt << 'NICHES'
# My Video Niches
motivational quotes
fitness tips
cooking hacks
productivity tips
tech news
NICHES

# 2. Start scheduler (runs daily at 8 AM)
npm run schedule -- -c 3

# 3. Setup weekly cleanup (add to crontab)
# 0 2 * * 0 cd /path/to/project && npm run cleanup -- -d 14
```

### Bulk Production
```bash
# Generate 10 videos at once
npm run batch-multi "niche1,niche2,niche3,niche4,niche5,niche6,niche7,niche8,niche9,niche10"

# Or use file
echo "fitness\ncooking\ntravel\ntech\nhealth\nmotivation\nlifehacks\nscience\nhistory\nart" > batch.txt
npm run batch-multi -- -f batch.txt
```

### Testing
```bash
# Test single niche first
npm run batch "cryptocurrency"

# If successful, add to production list
echo "cryptocurrency" >> niches.txt
```

## PM2 Production Setup

```bash
# Install PM2
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'PM2'
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
    }
  }]
};
PM2

# Start with PM2
pm2 start ecosystem.config.js

# View logs
pm2 logs video-scheduler

# Save configuration
pm2 save

# Setup startup script
pm2 startup
```

## Troubleshooting

### Check Command Help
```bash
npm run batch -- --help
npm run batch-multi -- --help
npm run schedule -- --help
npm run cleanup -- --help
```

### Verify Installation
```bash
# Check if commands are available
node dist/index.js --help

# Check FFmpeg
ffmpeg -version

# Check API keys
grep -E 'MISTRAL|PEXELS' .env
```

### Test Without Executing
```bash
# Test cleanup without deleting
npm run cleanup -- --dry-run

# View what would be processed
cat niches.txt | grep -v '^#' | grep -v '^$'
```

For detailed documentation, see [BATCH_COMMANDS.md](BATCH_COMMANDS.md)
