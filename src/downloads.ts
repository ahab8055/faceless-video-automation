#!/usr/bin/env node

import * as fs from 'fs-extra';
import * as path from 'path';
import axios, { AxiosResponse } from 'axios';
import * as googleTTS from 'google-tts-api';
import * as dotenv from 'dotenv';
import { 
  Script, 
  PexelsVideo, 
  PexelsSearchResponse, 
  Assets,
  PexelsPhoto,
  PexelsPhotoSearchResponse,
  AssetMetadata,
  DownloadAssetsResult
} from './types';

dotenv.config();

/**
 * Search for videos on Pexels based on search terms
 * @param query - Search query for videos
 * @param perPage - Number of results per page
 * @returns Array of video objects
 */
export async function searchPexelsVideos(query: string, perPage: number = 5): Promise<PexelsVideo[]> {
  try {
    console.log(`🔍 Searching Pexels for: "${query}"...`);

    if (!process.env.PEXELS_API_KEY) {
      throw new Error('PEXELS_API_KEY not found in environment variables');
    }

    const response: AxiosResponse<PexelsSearchResponse> = await axios.get('https://api.pexels.com/videos/search', {
      headers: {
        'Authorization': process.env.PEXELS_API_KEY
      },
      params: {
        query: query,
        per_page: perPage,
        orientation: 'portrait', // For vertical short-form videos
        size: 'medium'
      }
    });

    console.log(`✅ Found ${response.data.videos.length} video(s) for "${query}"`);
    return response.data.videos;

  } catch (error) {
    console.error(`❌ Error searching Pexels for "${query}":`, (error as Error).message);
    throw error;
  }
}

/**
 * Download a video from URL to local file
 * @param url - URL of the video to download
 * @param outputPath - Path where video should be saved
 * @returns Path to downloaded file
 */
export async function downloadVideo(url: string, outputPath: string): Promise<string> {
  try {
    console.log(`⬇️  Downloading video from: ${url}`);

    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    await fs.ensureDir(path.dirname(outputPath));
    const writer = fs.createWriteStream(outputPath);

    response.data.pipe(writer);

    return new Promise<string>((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ Video downloaded to: ${outputPath}`);
        resolve(outputPath);
      });
      writer.on('error', reject);
    });

  } catch (error) {
    console.error('❌ Error downloading video:', (error as Error).message);
    throw error;
  }
}

/**
 * Download HD portrait videos for a script's search terms
 * @param searchTerms - Array of search terms from script
 * @param niche - The niche/topic name for organizing files
 * @returns Array of downloaded video file paths
 */
export async function downloadVideosForScript(searchTerms: string[], niche: string): Promise<string[]> {
  try {
    const assetsDir = path.join(process.cwd(), 'assets', niche.replace(/\s+/g, '-'));
    await fs.ensureDir(assetsDir);

    const downloadedVideos: string[] = [];
    const videosPerTerm = 2; // Download 2 videos per search term

    for (const term of searchTerms) {
      try {
        const videos = await searchPexelsVideos(term, videosPerTerm);

        for (let i = 0; i < Math.min(videos.length, videosPerTerm); i++) {
          const video = videos[i];
          
          // Find HD portrait video file
          const hdVideo = video.video_files.find(file => 
            file.quality === 'hd' && (file.width < file.height || file.height >= 1920)
          ) || video.video_files[0]; // Fallback to first available

          if (hdVideo) {
            const filename = `${term.replace(/\s+/g, '-')}-${i + 1}.mp4`;
            const outputPath = path.join(assetsDir, filename);

            await downloadVideo(hdVideo.link, outputPath);
            downloadedVideos.push(outputPath);
          }
        }

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.warn(`⚠️  Warning: Could not download videos for term "${term}": ${(error as Error).message}`);
      }
    }

    console.log(`✅ Downloaded ${downloadedVideos.length} video(s) total`);
    return downloadedVideos;

  } catch (error) {
    console.error('❌ Error downloading videos for script:', (error as Error).message);
    throw error;
  }
}

/**
 * Generate TTS audio from text using Google TTS API
 * @param text - Text to convert to speech
 * @param outputPath - Path where audio should be saved
 * @returns Path to generated audio file
 */
export async function generateTTS(text: string, outputPath: string): Promise<string> {
  try {
    console.log(`🗣️  Generating TTS audio...`);

    // Get TTS audio URL from Google TTS API
    const audioUrl = await googleTTS.getAudioUrl(text, {
      lang: 'en',
      slow: false,
      host: 'https://translate.google.com',
    });

    console.log(`⬇️  Downloading TTS audio...`);

    // Download the audio file
    const response = await axios({
      method: 'GET',
      url: audioUrl,
      responseType: 'stream'
    });

    await fs.ensureDir(path.dirname(outputPath));
    const writer = fs.createWriteStream(outputPath);

    response.data.pipe(writer);

    return new Promise<string>((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ TTS audio saved to: ${outputPath}`);
        resolve(outputPath);
      });
      writer.on('error', reject);
    });

  } catch (error) {
    console.error('❌ Error generating TTS:', (error as Error).message);
    throw error;
  }
}

/**
 * Generate TTS audio for a script's narration text
 * @param script - The script object containing narration text
 * @param niche - The niche/topic name for organizing files
 * @returns Path to generated audio file
 */
export async function generateTTSForScript(script: Script, niche: string): Promise<string> {
  try {
    const assetsDir = path.join(process.cwd(), 'assets', niche.replace(/\s+/g, '-'));
    await fs.ensureDir(assetsDir);

    const audioPath = path.join(assetsDir, 'narration.mp3');
    const narrationText = script.narration || script.fullText || '';

    if (!narrationText) {
      throw new Error('No narration text found in script');
    }

    await generateTTS(narrationText, audioPath);
    return audioPath;

  } catch (error) {
    console.error('❌ Error generating TTS for script:', (error as Error).message);
    throw error;
  }
}

/**
 * Download all assets (videos and audio) for a script
 * @param script - The script object
 * @param niche - The niche/topic name
 * @returns Object containing paths to downloaded assets
 */
export async function downloadAllAssets(script: Script, niche: string): Promise<Assets> {
  try {
    console.log(`📦 Downloading all assets for niche: ${niche}...`);

    // Download videos based on search terms
    const videoFiles = await downloadVideosForScript(script.searchTerms || [], niche);

    // Generate TTS audio
    const audioFile = await generateTTSForScript(script, niche);

    console.log(`✅ All assets downloaded successfully!`);

    return {
      videos: videoFiles,
      audio: [audioFile]
    };

  } catch (error) {
    console.error('❌ Error downloading all assets:', (error as Error).message);
    throw error;
  }
}

/**
 * Common stop words to filter out during keyword extraction
 */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'this', 'these', 'those', 'have',
  'but', 'or', 'which', 'we', 'you', 'your', 'their', 'what', 'when',
  'where', 'who', 'how', 'can', 'could', 'should', 'would', 'do', 'does'
]);

/**
 * Extract keywords from text for better search queries
 * Extracts meaningful nouns, verbs, and descriptive terms
 * @param text - Input text to extract keywords from
 * @returns Array of extracted keywords
 */
export function extractKeywords(text: string): string[] {
  try {
    // Convert to lowercase and remove special characters
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    
    // Split into words
    const words = cleanText.split(/\s+/).filter(word => word.length > 0);
    
    // Filter out stop words and short words (< 3 chars)
    const keywords = words.filter(word => 
      word.length >= 3 && !STOP_WORDS.has(word)
    );
    
    // Count word frequency
    const wordFreq = new Map<string, number>();
    keywords.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Sort by frequency and get top keywords
    const sortedKeywords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
    
    // Return top 5-7 keywords
    return sortedKeywords.slice(0, 7);
    
  } catch (error) {
    console.error('❌ Error extracting keywords:', (error as Error).message);
    return [];
  }
}

/**
 * Sanitize filename by removing special characters and spaces
 * @param filename - Original filename
 * @returns Sanitized filename
 */
function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Create timestamped directory for assets
 * @returns Object with directory path and timestamp
 */
function createTimestampedDirectory(): { dir: string; timestamp: string } {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19); // YYYY-MM-DDTHH-MM-SS
  const assetsDir = path.join(process.cwd(), 'assets', timestamp);
  return { dir: assetsDir, timestamp };
}

/**
 * Calculate aspect ratio from width and height
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns Aspect ratio (width / height)
 */
function calculateAspectRatio(width: number, height: number): number {
  return width / height;
}

/**
 * Check if aspect ratio is suitable for vertical video (9:16 or crop-friendly)
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns True if suitable for vertical format
 */
function isVerticalOrCropFriendly(width: number, height: number): boolean {
  const aspectRatio = calculateAspectRatio(width, height);
  const verticalRatio = 9 / 16; // 0.5625
  
  // Perfect vertical or portrait orientation
  if (aspectRatio <= 0.75) return true;
  
  // Close to vertical (within 20% tolerance)
  if (Math.abs(aspectRatio - verticalRatio) / verticalRatio < 0.2) return true;
  
  return false;
}

/**
 * Search for photos on Pexels based on search terms
 * @param query - Search query for photos
 * @param perPage - Number of results per page
 * @returns Array of photo objects
 */
export async function searchPexelsPhotos(query: string, perPage: number = 5): Promise<PexelsPhoto[]> {
  try {
    console.log(`🔍 Searching Pexels photos for: "${query}"...`);

    if (!process.env.PEXELS_API_KEY) {
      throw new Error('PEXELS_API_KEY not found in environment variables');
    }

    const response: AxiosResponse<PexelsPhotoSearchResponse> = await axios.get('https://api.pexels.com/v1/search', {
      headers: {
        'Authorization': process.env.PEXELS_API_KEY
      },
      params: {
        query: query,
        per_page: perPage,
        orientation: 'portrait' // For vertical short-form content
      }
    });

    console.log(`✅ Found ${response.data.photos.length} photo(s) for "${query}"`);
    return response.data.photos;

  } catch (error) {
    console.error(`❌ Error searching Pexels photos for "${query}":`, (error as Error).message);
    throw error;
  }
}

/**
 * Download a photo from URL to local file
 * @param url - URL of the photo to download
 * @param outputPath - Path where photo should be saved
 * @returns Path to downloaded file
 */
export async function downloadPhoto(url: string, outputPath: string): Promise<string> {
  try {
    console.log(`⬇️  Downloading photo from: ${url}`);

    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    await fs.ensureDir(path.dirname(outputPath));
    const writer = fs.createWriteStream(outputPath);

    response.data.pipe(writer);

    return new Promise<string>((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ Photo downloaded to: ${outputPath}`);
        resolve(outputPath);
      });
      writer.on('error', reject);
    });

  } catch (error) {
    console.error('❌ Error downloading photo:', (error as Error).message);
    throw error;
  }
}

/**
 * Download video/photo assets with retry logic
 * @param url - URL of the asset to download
 * @param outputPath - Path where asset should be saved
 * @param maxRetries - Maximum number of retry attempts
 * @returns Path to downloaded file
 */
async function downloadAssetWithRetry(
  url: string, 
  outputPath: string, 
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 60000 // 60 second timeout
      });

      await fs.ensureDir(path.dirname(outputPath));
      const writer = fs.createWriteStream(outputPath);

      response.data.pipe(writer);

      return await new Promise<string>((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`✅ Asset downloaded to: ${outputPath}`);
          resolve(outputPath);
        });
        writer.on('error', reject);
      });

    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️  Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      
      if (attempt < maxRetries) {
        // Exponential backoff: wait 2^attempt seconds
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Waiting ${waitTime / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`Failed to download after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Main function to download assets based on query
 * Searches for videos first, falls back to photos if needed
 * @param query - Search query (can be keywords or full text for extraction)
 * @param count - Number of assets to download (default: 8)
 * @returns Object with downloaded assets metadata
 */
export async function downloadAssets(query: string, count: number = 8): Promise<DownloadAssetsResult> {
  try {
    console.log(`\n📥 DOWNLOAD ASSETS`);
    console.log(`${'─'.repeat(50)}`);
    console.log(`Query: "${query}"`);
    console.log(`Count: ${count}\n`);

    if (!process.env.PEXELS_API_KEY) {
      throw new Error('PEXELS_API_KEY not found in environment variables');
    }

    // Extract keywords if query is a long text
    let searchQuery = query;
    let extractedKeywords: string[] = [];
    
    if (query.split(' ').length > 10) {
      console.log('📝 Extracting keywords from text...');
      extractedKeywords = extractKeywords(query);
      searchQuery = extractedKeywords.slice(0, 3).join(' ');
      console.log(`✅ Extracted keywords: ${extractedKeywords.join(', ')}`);
      console.log(`🔍 Using search query: "${searchQuery}"\n`);
    }

    // Create timestamped directory
    const { dir: assetsDir, timestamp } = createTimestampedDirectory();
    await fs.ensureDir(assetsDir);
    console.log(`📁 Created directory: ${assetsDir}\n`);

    const downloadedAssets: AssetMetadata[] = [];
    const videosNeeded = Math.ceil(count * 0.8); // Prefer 80% videos
    const photosNeeded = count - videosNeeded;

    // Step 1: Search and download videos
    console.log(`🎥 Searching for ${videosNeeded} videos...`);
    try {
      const videos = await searchPexelsVideos(searchQuery, Math.min(videosNeeded + 5, 15));
      
      // Filter for vertical/crop-friendly videos with duration 15-30s
      const suitableVideos = videos.filter(video => {
        const hdFile = video.video_files.find(f => 
          f.quality === 'hd' && isVerticalOrCropFriendly(f.width, f.height)
        );
        return hdFile && video.duration >= 15 && video.duration <= 30;
      });

      // If no suitable videos, use any available HD videos
      const videosToDownload = suitableVideos.length > 0 
        ? suitableVideos.slice(0, videosNeeded)
        : videos.slice(0, videosNeeded);

      console.log(`✅ Found ${videosToDownload.length} suitable video(s)\n`);

      // Download videos
      for (let i = 0; i < videosToDownload.length; i++) {
        const video = videosToDownload[i];
        
        // Find best quality HD portrait/vertical video
        const hdVideo = video.video_files.find(file => 
          file.quality === 'hd' && isVerticalOrCropFriendly(file.width, file.height)
        ) || video.video_files.find(file => file.quality === 'hd') 
          || video.video_files[0];

        if (hdVideo) {
          const filename = sanitizeFilename(`video-${searchQuery}-${i + 1}`) + '.mp4';
          const outputPath = path.join(assetsDir, filename);

          try {
            await downloadAssetWithRetry(hdVideo.link, outputPath);
            
            downloadedAssets.push({
              id: video.id,
              type: 'video',
              path: outputPath,
              url: hdVideo.link,
              width: hdVideo.width,
              height: hdVideo.height,
              aspectRatio: calculateAspectRatio(hdVideo.width, hdVideo.height),
              duration: video.duration,
              relevance: videosToDownload.length - i // Higher for earlier results
            });

            // Rate limiting: wait 500ms between downloads
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.warn(`⚠️  Skipping video ${i + 1}: ${(error as Error).message}`);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Video search failed: ${(error as Error).message}`);
    }

    // Step 2: If we don't have enough assets, search and download photos
    const assetsStillNeeded = count - downloadedAssets.length;
    if (assetsStillNeeded > 0) {
      console.log(`\n📷 Searching for ${assetsStillNeeded} photos to fill remaining slots...`);
      try {
        const photos = await searchPexelsPhotos(searchQuery, assetsStillNeeded + 5);
        
        // Filter for vertical/portrait photos
        const suitablePhotos = photos.filter(photo => 
          isVerticalOrCropFriendly(photo.width, photo.height)
        );

        const photosToDownload = suitablePhotos.length > 0
          ? suitablePhotos.slice(0, assetsStillNeeded)
          : photos.slice(0, assetsStillNeeded);

        console.log(`✅ Found ${photosToDownload.length} suitable photo(s)\n`);

        // Download photos
        for (let i = 0; i < photosToDownload.length; i++) {
          const photo = photosToDownload[i];
          const filename = sanitizeFilename(`photo-${searchQuery}-${i + 1}`) + '.jpg';
          const outputPath = path.join(assetsDir, filename);

          try {
            // Use portrait or large2x for best quality vertical photo
            const photoUrl = photo.src.portrait || photo.src.large2x;
            await downloadAssetWithRetry(photoUrl, outputPath);
            
            downloadedAssets.push({
              id: photo.id,
              type: 'photo',
              path: outputPath,
              url: photoUrl,
              width: photo.width,
              height: photo.height,
              aspectRatio: calculateAspectRatio(photo.width, photo.height),
              relevance: photosToDownload.length - i
            });

            // Rate limiting: wait 500ms between downloads
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.warn(`⚠️  Skipping photo ${i + 1}: ${(error as Error).message}`);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Photo search failed: ${(error as Error).message}`);
      }
    }

    // Sort by relevance (higher relevance first)
    downloadedAssets.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`✅ Downloaded ${downloadedAssets.length} asset(s) total`);
    console.log(`   Videos: ${downloadedAssets.filter(a => a.type === 'video').length}`);
    console.log(`   Photos: ${downloadedAssets.filter(a => a.type === 'photo').length}`);
    console.log(`${'─'.repeat(50)}\n`);

    const result: DownloadAssetsResult = {
      assets: downloadedAssets,
      timestamp,
      directory: assetsDir,
      query: searchQuery,
      extractedKeywords: extractedKeywords.length > 0 ? extractedKeywords : undefined
    };

    // Save metadata to JSON file
    const metadataPath = path.join(assetsDir, 'metadata.json');
    await fs.writeJson(metadataPath, result, { spaces: 2 });
    console.log(`📝 Metadata saved to: ${metadataPath}\n`);

    return result;

  } catch (error) {
    console.error('❌ Error downloading assets:', (error as Error).message);
    throw error;
  }
}
