#!/usr/bin/env node

import * as fs from 'fs-extra';
import * as path from 'path';
import axios, { AxiosResponse } from 'axios';
import * as googleTTS from 'google-tts-api';
import * as dotenv from 'dotenv';
import { Script, PexelsVideo, PexelsSearchResponse, Assets } from './types';

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
