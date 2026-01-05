#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const googleTTS = require('google-tts-api');
require('dotenv').config();

/**
 * Search for videos on Pexels based on search terms
 * @param {string} query - Search query for videos
 * @param {number} perPage - Number of results per page
 * @returns {Promise<Array>} Array of video objects
 */
async function searchPexelsVideos(query, perPage = 5) {
  try {
    console.log(`🔍 Searching Pexels for: "${query}"...`);

    if (!process.env.PEXELS_API_KEY) {
      throw new Error('PEXELS_API_KEY not found in environment variables');
    }

    const response = await axios.get('https://api.pexels.com/videos/search', {
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
    console.error(`❌ Error searching Pexels for "${query}":`, error.message);
    throw error;
  }
}

/**
 * Download a video from URL to local file
 * @param {string} url - URL of the video to download
 * @param {string} outputPath - Path where video should be saved
 * @returns {Promise<string>} Path to downloaded file
 */
async function downloadVideo(url, outputPath) {
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

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ Video downloaded to: ${outputPath}`);
        resolve(outputPath);
      });
      writer.on('error', reject);
    });

  } catch (error) {
    console.error('❌ Error downloading video:', error.message);
    throw error;
  }
}

/**
 * Download HD portrait videos for a script's search terms
 * @param {Array} searchTerms - Array of search terms from script
 * @param {string} niche - The niche/topic name for organizing files
 * @returns {Promise<Array>} Array of downloaded video file paths
 */
async function downloadVideosForScript(searchTerms, niche) {
  try {
    const assetsDir = path.join(process.cwd(), 'assets', niche.replace(/\s+/g, '-'));
    await fs.ensureDir(assetsDir);

    const downloadedVideos = [];
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
        console.warn(`⚠️  Warning: Could not download videos for term "${term}": ${error.message}`);
      }
    }

    console.log(`✅ Downloaded ${downloadedVideos.length} video(s) total`);
    return downloadedVideos;

  } catch (error) {
    console.error('❌ Error downloading videos for script:', error.message);
    throw error;
  }
}

/**
 * Generate TTS audio from text using Google TTS API
 * @param {string} text - Text to convert to speech
 * @param {string} outputPath - Path where audio should be saved
 * @returns {Promise<string>} Path to generated audio file
 */
async function generateTTS(text, outputPath) {
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

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ TTS audio saved to: ${outputPath}`);
        resolve(outputPath);
      });
      writer.on('error', reject);
    });

  } catch (error) {
    console.error('❌ Error generating TTS:', error.message);
    throw error;
  }
}

/**
 * Generate TTS audio for a script's narration text
 * @param {Object} script - The script object containing narration text
 * @param {string} niche - The niche/topic name for organizing files
 * @returns {Promise<string>} Path to generated audio file
 */
async function generateTTSForScript(script, niche) {
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
    console.error('❌ Error generating TTS for script:', error.message);
    throw error;
  }
}

/**
 * Download all assets (videos and audio) for a script
 * @param {Object} script - The script object
 * @param {string} niche - The niche/topic name
 * @returns {Promise<Object>} Object containing paths to downloaded assets
 */
async function downloadAllAssets(script, niche) {
  try {
    console.log(`📦 Downloading all assets for niche: ${niche}...`);

    // Download videos based on search terms
    const videoFiles = await downloadVideosForScript(script.searchTerms || [], niche);

    // Generate TTS audio
    const audioFile = await generateTTSForScript(script, niche);

    console.log(`✅ All assets downloaded successfully!`);

    return {
      videos: videoFiles,
      audio: audioFile
    };

  } catch (error) {
    console.error('❌ Error downloading all assets:', error.message);
    throw error;
  }
}

module.exports = {
  searchPexelsVideos,
  downloadVideo,
  downloadVideosForScript,
  generateTTS,
  generateTTSForScript,
  downloadAllAssets
};
