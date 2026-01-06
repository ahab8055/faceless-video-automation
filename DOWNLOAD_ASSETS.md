# Download Assets Feature Documentation

## Overview

The `downloadAssets()` function provides a robust asset downloading system that integrates with the Pexels API to fetch video and photo assets for faceless video automation.

## Features

### 1. Smart Keyword Extraction
Automatically extracts relevant keywords from long text to optimize search queries:

```javascript
const { downloadAssets, extractKeywords } = require('./dist/downloads');

// Extract keywords from a script
const script = "Explore the beauty of ocean waves at sunset with breathtaking views of nature";
const keywords = extractKeywords(script);
// Result: ['explore', 'beauty', 'ocean', 'waves', 'sunset', 'breathtaking', 'views']

// Use with downloadAssets - it extracts automatically
const result = await downloadAssets(script, 8);
```

### 2. Video Priority with Photo Fallback
- Searches for videos first (preferred for video content)
- Automatically falls back to photos if videos are insufficient
- Prefers videos between 15-30 seconds duration
- Filters for HD quality (1080p minimum)

### 3. Vertical Format Optimization
- Prioritizes 9:16 aspect ratio (ideal for TikTok, Instagram Reels, YouTube Shorts)
- Checks for portrait orientation (width < height)
- Accepts crop-friendly aspect ratios (within 20% tolerance of vertical)

### 4. Organized Storage
Creates timestamped directories with clean structure:
```
assets/
└── 2026-01-05T19-10-13/
    ├── video-ocean-waves-1.mp4
    ├── video-ocean-waves-2.mp4
    ├── photo-ocean-waves-1.jpg
    └── metadata.json
```

### 5. Retry Logic and Error Handling
- Automatic retry on download failures (up to 3 attempts)
- Exponential backoff between retries
- Graceful error handling for individual assets
- Continues downloading remaining assets if one fails

### 6. Rate Limiting Awareness
- Built-in 500ms delay between downloads
- Respects Pexels API rate limits (200 requests/hour free tier)
- Prevents overwhelming the API

## API Reference

### `downloadAssets(query, count)`

Download video/photo assets from Pexels based on a search query.

**Parameters:**
- `query` (string): Search query or text to extract keywords from
- `count` (number, optional): Number of assets to download (default: 8, max: 50)

**Returns:** `Promise<DownloadAssetsResult>`

```typescript
interface DownloadAssetsResult {
  assets: AssetMetadata[];
  timestamp: string;
  directory: string;
  query: string;
  extractedKeywords?: string[];
}

interface AssetMetadata {
  id: number | string;
  type: 'video' | 'photo';
  path: string;
  url: string;
  width: number;
  height: number;
  aspectRatio: number;
  duration?: number;        // Only for videos
  relevance?: number;       // Higher = more relevant
}
```

### `extractKeywords(text)`

Extract meaningful keywords from text for search optimization.

**Parameters:**
- `text` (string): Input text to extract keywords from

**Returns:** `string[]` - Array of extracted keywords (top 5-7 by frequency)

## CLI Usage

### Basic Download
```bash
# Download 8 assets (default)
pnpm start download "ocean waves sunset"

# Download custom count
pnpm start download "nature landscape" --count 5

# Download with keyword extraction
pnpm start download "Explore the breathtaking beauty of mountain peaks at dawn"
```

### Output Example
```
═══════════════════════════════════════════════════
🎬 FACELESS VIDEO AUTOMATION - DOWNLOAD ASSETS
═══════════════════════════════════════════════════

📥 DOWNLOAD ASSETS
──────────────────────────────────────────────────
Query: "ocean waves sunset"
Count: 8

🔍 Searching for 6 videos...
✅ Found 6 suitable video(s)

📷 Searching for 2 photos to fill remaining slots...
✅ Found 2 suitable photo(s)

──────────────────────────────────────────────────
✅ Downloaded 8 asset(s) total
   Videos: 6
   Photos: 2
──────────────────────────────────────────────────

═══════════════════════════════════════════════════
✅ DOWNLOAD COMPLETE!
═══════════════════════════════════════════════════

📁 Directory: /path/to/assets/2026-01-05T19-10-13
📊 Total Assets: 8
   🎥 Videos: 6
   📷 Photos: 2

📄 Asset Details:
   1. 🎥 VIDEO (25.0s) - 📱 Vertical
      video-ocean-waves-1.mp4
   2. 🎥 VIDEO (18.5s) - 📱 Vertical
      video-ocean-waves-2.mp4
   ...
```

## Programmatic Usage

### Example 1: Direct Query
```javascript
const { downloadAssets } = require('./dist/downloads');

async function downloadOceanAssets() {
  const result = await downloadAssets('ocean waves sunset', 5);
  
  console.log(`Downloaded ${result.assets.length} assets`);
  console.log(`Saved to: ${result.directory}`);
  
  // Access individual assets
  result.assets.forEach(asset => {
    console.log(`${asset.type}: ${asset.path}`);
  });
}
```

### Example 2: With Script Analysis
```javascript
const { downloadAssets, extractKeywords } = require('./dist/downloads');

async function downloadFromScript() {
  const script = "Explore the beauty of ocean waves at sunset...";
  
  // Method 1: Let downloadAssets extract keywords automatically
  const result = await downloadAssets(script, 8);
  console.log(`Extracted keywords: ${result.extractedKeywords.join(', ')}`);
  
  // Method 2: Extract keywords manually first
  const keywords = extractKeywords(script);
  const query = keywords.slice(0, 3).join(' ');
  const result2 = await downloadAssets(query, 8);
}
```

### Example 3: Custom Processing
```javascript
const { downloadAssets } = require('./dist/downloads');

async function downloadAndProcess() {
  const result = await downloadAssets('nature landscape', 10);
  
  // Filter only videos
  const videos = result.assets.filter(a => a.type === 'video');
  console.log(`Downloaded ${videos.length} videos`);
  
  // Filter only vertical format
  const verticalAssets = result.assets.filter(a => a.aspectRatio < 0.75);
  console.log(`${verticalAssets.length} are vertical format`);
  
  // Sort by duration (videos only)
  const sortedVideos = videos
    .sort((a, b) => (b.duration || 0) - (a.duration || 0));
}
```

## Configuration

### Environment Variables

Add to your `.env` file:
```env
PEXELS_API_KEY=your_pexels_api_key_here
```

Get your free API key from: https://www.pexels.com/api/

### API Rate Limits

**Pexels Free Tier:**
- 200 requests per hour
- No daily limit
- Full access to library

**Best Practices:**
- Use reasonable count values (5-15 assets per call)
- Add delays between multiple calls
- Cache results when possible
- Monitor your usage at https://www.pexels.com/api/

## Error Handling

The function handles errors gracefully:

```javascript
try {
  const result = await downloadAssets('ocean waves', 10);
} catch (error) {
  // Common errors:
  // - PEXELS_API_KEY not found
  // - Network timeout
  // - Rate limit exceeded
  // - No results found
  console.error('Download failed:', error.message);
}
```

## Filtering Criteria

### Video Selection
- **Quality**: HD (1080p) preferred
- **Duration**: 15-30 seconds ideal
- **Orientation**: Vertical (9:16) or portrait preferred
- **File Type**: MP4 format

### Photo Selection
- **Quality**: Large2x or portrait size
- **Orientation**: Vertical (9:16) or portrait preferred
- **File Type**: JPG format

### Aspect Ratio Guidelines
- **Perfect Vertical**: ≤ 0.75 (e.g., 1080x1920 = 0.5625)
- **Crop-Friendly**: Within 20% of 0.5625
- **Horizontal**: > 0.75 (less preferred but accepted)

## Troubleshooting

### Issue: API Key Error
```
Error: PEXELS_API_KEY not found in environment variables
```
**Solution**: Create `.env` file with valid Pexels API key

### Issue: No Assets Downloaded
```
Downloaded 0 asset(s) total
```
**Solution**: 
- Try different search terms
- Check API rate limits
- Verify internet connection

### Issue: Rate Limit Exceeded
```
Error: 429 Too Many Requests
```
**Solution**: 
- Wait for rate limit reset (hourly)
- Reduce request frequency
- Consider Pexels paid plan

## Integration with Video Pipeline

The `downloadAssets()` function integrates seamlessly with the existing video automation pipeline:

```javascript
const { generateScript } = require('./dist/scripts');
const { downloadAssets, extractKeywords } = require('./dist/downloads');
const { createVideo } = require('./dist/editor');

async function createAutomatedVideo(niche) {
  // Step 1: Generate script
  const script = await generateScript(niche);
  
  // Step 2: Extract keywords and download assets
  const keywords = extractKeywords(script.narration);
  const assets = await downloadAssets(keywords.join(' '), 10);
  
  // Step 3: Create video with downloaded assets
  // (Use existing createVideo function)
  const videoPath = await createVideo({
    videos: assets.assets.filter(a => a.type === 'video').map(a => a.path),
    audio: ['path/to/audio.mp3']
  }, niche);
  
  return videoPath;
}
```

## Attribution

When using Pexels assets, follow their [license terms](https://www.pexels.com/license/):
- ✅ Free for personal and commercial use
- ✅ No attribution required (but appreciated)
- ❌ Don't sell unmodified photos/videos
- ❌ Don't create competing services

## Contributing

To improve the download functionality:
1. Enhance keyword extraction algorithm
2. Add support for other stock footage APIs
3. Implement caching mechanisms
4. Add progress callbacks for long downloads

## License

MIT License - See LICENSE file for details
