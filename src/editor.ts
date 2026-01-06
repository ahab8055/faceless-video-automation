#!/usr/bin/env node

import * as fs from 'fs-extra';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { FfprobeData } from 'fluent-ffmpeg';
import axios from 'axios';
import * as googleTTS from 'google-tts-api';
import { Assets, FFmpegProgress, CreateShortParams } from './types';

/**
 * Get video duration in seconds
 * @param videoPath - Path to video file
 * @returns Duration in seconds
 */
export function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err: Error | null, metadata: FfprobeData) => {
      if (err) {
        reject(err);
      } else {
        const duration = metadata.format.duration || 0;
        resolve(duration);
      }
    });
  });
}

/**
 * Get audio duration in seconds
 * @param audioPath - Path to audio file
 * @returns Duration in seconds
 */
export function getAudioDuration(audioPath: string): Promise<number> {
  return getVideoDuration(audioPath); // ffprobe works for audio too
}

/**
 * Scale and crop a video to 9:16 aspect ratio (1080x1920)
 * @param inputPath - Path to input video
 * @param outputPath - Path for output video
 * @returns Path to processed video
 */
export function scaleAndCropVideo(inputPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`✂️  Processing video: ${path.basename(inputPath)}`);

    ffmpeg(inputPath)
      .size('1080x1920')
      .autopad()
      .aspect('9:16')
      .videoBitrate('3000k')
      .outputOptions([
        '-preset fast',
        '-crf 23'
      ])
      .on('start', (cmd: string) => {
        console.log(`   FFmpeg command: ${cmd}`);
      })
      .on('progress', (progress: FFmpegProgress) => {
        if (progress.percent) {
          process.stdout.write(`\r   Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`\n✅ Video processed: ${path.basename(outputPath)}`);
        resolve(outputPath);
      })
      .on('error', (err: Error) => {
        console.error(`\n❌ Error processing video: ${err.message}`);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Concatenate multiple videos into one
 * @param videoPaths - Array of video file paths
 * @param outputPath - Path for concatenated output
 * @param targetDuration - Target duration in seconds (optional)
 * @returns Path to concatenated video
 */
export async function concatenateVideos(
  videoPaths: string[], 
  outputPath: string, 
  targetDuration: number | null = null
): Promise<string> {
  try {
    console.log(`🎬 Concatenating ${videoPaths.length} video(s)...`);

    if (videoPaths.length === 0) {
      throw new Error('No videos to concatenate');
    }

    // If only one video, just copy it
    if (videoPaths.length === 1) {
      await fs.copy(videoPaths[0], outputPath);
      console.log(`✅ Single video copied to: ${outputPath}`);
      return outputPath;
    }

    // Create a temporary list file for FFmpeg concat
    const listFilePath = path.join(path.dirname(outputPath), 'concat-list.txt');
    const listContent = videoPaths
      .map(p => `file '${path.resolve(p)}'`)
      .join('\n');
    
    await fs.writeFile(listFilePath, listContent);

    return new Promise<string>((resolve, reject) => {
      const command = ffmpeg()
        .input(listFilePath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions([
          '-c copy',
          '-preset fast'
        ]);

      // If target duration specified, trim to that length
      if (targetDuration) {
        command.duration(targetDuration);
      }

      command
        .on('start', (cmd: string) => {
          console.log(`   FFmpeg command: ${cmd}`);
        })
        .on('progress', (progress: FFmpegProgress) => {
          if (progress.percent) {
            process.stdout.write(`\r   Progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', async () => {
          console.log(`\n✅ Videos concatenated: ${path.basename(outputPath)}`);
          // Clean up list file
          await fs.remove(listFilePath);
          resolve(outputPath);
        })
        .on('error', async (err: Error) => {
          console.error(`\n❌ Error concatenating videos: ${err.message}`);
          // Clean up list file
          await fs.remove(listFilePath);
          reject(err);
        })
        .save(outputPath);
    });

  } catch (error) {
    console.error('❌ Error in concatenateVideos:', (error as Error).message);
    throw error;
  }
}

/**
 * Merge video with audio narration
 * @param videoPath - Path to video file
 * @param audioPath - Path to audio file
 * @param outputPath - Path for merged output
 * @returns Path to final video
 */
export function mergeVideoWithAudio(videoPath: string, audioPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`🎵 Merging video with audio narration...`);

    ffmpeg(videoPath)
      .input(audioPath)
      .outputOptions([
        '-c:v copy',
        '-c:a aac',
        '-map 0:v:0',
        '-map 1:a:0',
        '-shortest',
        '-preset fast'
      ])
      .on('start', (cmd: string) => {
        console.log(`   FFmpeg command: ${cmd}`);
      })
      .on('progress', (progress: FFmpegProgress) => {
        if (progress.percent) {
          process.stdout.write(`\r   Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`\n✅ Video and audio merged: ${path.basename(outputPath)}`);
        resolve(outputPath);
      })
      .on('error', (err: Error) => {
        console.error(`\n❌ Error merging video and audio: ${err.message}`);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Create a complete video from assets
 * @param assets - Object containing video and audio file paths
 * @param niche - The niche/topic name
 * @returns Path to final video
 */
export async function createVideo(assets: Assets, niche: string): Promise<string> {
  try {
    console.log(`🎥 Creating video for niche: ${niche}...`);

    const outputDir = path.join(process.cwd(), 'output');
    await fs.ensureDir(outputDir);

    const timestamp = Date.now();
    const tempDir = path.join(outputDir, `temp-${timestamp}`);
    await fs.ensureDir(tempDir);

    // Step 1: Process all videos to 9:16 format
    console.log(`\n📐 Step 1: Processing videos to 9:16 format...`);
    const processedVideos: string[] = [];
    
    for (let i = 0; i < assets.videos.length; i++) {
      const videoPath = assets.videos[i];
      const processedPath = path.join(tempDir, `processed-${i}.mp4`);
      
      try {
        await scaleAndCropVideo(videoPath, processedPath);
        processedVideos.push(processedPath);
      } catch (error) {
        console.warn(`⚠️  Warning: Could not process video ${videoPath}: ${(error as Error).message}`);
      }
    }

    if (processedVideos.length === 0) {
      throw new Error('No videos were successfully processed');
    }

    // Step 2: Get audio duration to determine video length
    console.log(`\n⏱️  Step 2: Determining target video duration...`);
    const audioFile = assets.audio[0] || assets.audio;
    const audioDuration = await getAudioDuration(audioFile as string);
    console.log(`   Audio duration: ${audioDuration.toFixed(2)} seconds`);

    // Step 3: Concatenate videos
    console.log(`\n🔗 Step 3: Concatenating videos...`);
    const concatenatedPath = path.join(tempDir, 'concatenated.mp4');
    await concatenateVideos(processedVideos, concatenatedPath, audioDuration);

    // Step 4: Merge with audio
    console.log(`\n🎶 Step 4: Adding audio narration...`);
    const finalPath = path.join(outputDir, `${niche.replace(/\s+/g, '-')}-${timestamp}.mp4`);
    await mergeVideoWithAudio(concatenatedPath, audioFile as string, finalPath);

    // Clean up temporary files
    console.log(`\n🧹 Cleaning up temporary files...`);
    await fs.remove(tempDir);

    console.log(`\n✅ Video created successfully: ${finalPath}`);
    return finalPath;

  } catch (error) {
    console.error('❌ Error creating video:', (error as Error).message);
    throw error;
  }
}

/**
 * Check if FFmpeg is installed and accessible
 * @returns True if FFmpeg is available
 */
export function checkFFmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err: Error | null) => {
      if (err) {
        console.error('❌ FFmpeg not found. Please install FFmpeg and add it to your PATH.');
        resolve(false);
      } else {
        console.log('✅ FFmpeg is available');
        resolve(true);
      }
    });
  });
}

// Hardcoded Pixabay royalty-free music URLs (fallback)
const DEFAULT_MUSIC_URLS = [
  'https://cdn.pixabay.com/download/audio/2022/03/10/audio_d1718ab41b.mp3', // Upbeat background music
  'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3', // Corporate upbeat
  'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3', // Inspiring
];

/**
 * Download music file from URL
 * @param url - URL of the music file
 * @param outputPath - Path to save the music file
 * @returns Path to downloaded music file
 */
async function downloadMusic(url: string, outputPath: string): Promise<string> {
  try {
    console.log(`🎵 Downloading music from: ${url}`);
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 30000 // 30 second timeout
    });

    await fs.ensureDir(path.dirname(outputPath));
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise<string>((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ Music downloaded to: ${outputPath}`);
        resolve(outputPath);
      });
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('❌ Error downloading music:', (error as Error).message);
    throw error;
  }
}

/**
 * Get background music file (check user folder first, then download from defaults)
 * @param tempDir - Temporary directory for downloads
 * @returns Path to music file
 */
async function getBackgroundMusic(tempDir: string): Promise<string> {
  try {
    // Check for user-provided music in music/ folder
    const musicDir = path.join(process.cwd(), 'music');
    
    if (await fs.pathExists(musicDir)) {
      const files = await fs.readdir(musicDir);
      const mp3File = files.find(f => f.toLowerCase().endsWith('.mp3'));
      
      if (mp3File) {
        const musicPath = path.join(musicDir, mp3File);
        console.log(`🎵 Using user-provided music: ${mp3File}`);
        return musicPath;
      }
    }

    // Try to download from default URLs
    console.log('🎵 No user music found, attempting to download default track...');
    
    try {
      const musicUrl = DEFAULT_MUSIC_URLS[0]; // Use first default track
      const musicPath = path.join(tempDir, 'background-music.mp3');
      await downloadMusic(musicUrl, musicPath);
      return musicPath;
    } catch (downloadError) {
      // Fallback: Generate synthetic background music for testing
      console.warn(`⚠️  Music download unavailable: ${(downloadError as Error).message}`);
      console.log('   Generating synthetic background music for testing...');
      
      const musicPath = path.join(tempDir, 'background-music.mp3');
      await fs.ensureDir(path.dirname(musicPath));
      
      // Generate 60 seconds of silent audio as placeholder
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input('anullsrc=channel_layout=stereo:sample_rate=44100')
          .inputOptions(['-f lavfi', '-t 60'])
          .outputOptions(['-c:a libmp3lame', '-b:a 128k'])
          .on('end', () => {
            console.log(`✅ Synthetic music saved to: ${musicPath}`);
            resolve();
          })
          .on('error', (err: Error) => {
            reject(err);
          })
          .save(musicPath);
      });
      
      return musicPath;
    }
  } catch (error) {
    console.error('❌ Error getting background music:', (error as Error).message);
    throw error;
  }
}

/**
 * Generate TTS audio from text
 * For production, uses Google TTS API. For testing without network, generates silence.
 * @param text - Text to convert to speech
 * @param outputPath - Path to save audio file
 * @returns Path to audio file
 */
async function generateTTSAudio(text: string, outputPath: string): Promise<string> {
  try {
    console.log(`🗣️  Generating TTS audio...`);

    // Try to use Google TTS API
    try {
      // Google TTS has a 200 character limit, so we need to split long text
      const MAX_LENGTH = 200;
      const chunks: string[] = [];
      
      if (text.length <= MAX_LENGTH) {
        chunks.push(text);
      } else {
        // Split by sentences to respect natural breaks
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        let currentChunk = '';
        
        for (const sentence of sentences) {
          if ((currentChunk + sentence).length <= MAX_LENGTH) {
            currentChunk += sentence;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
          }
        }
        
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
      }

      console.log(`   Split into ${chunks.length} TTS chunk(s)`);

      // Generate audio for each chunk
      const chunkPaths: string[] = [];
      const tempDir = path.dirname(outputPath);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`   Generating chunk ${i + 1}/${chunks.length}...`);
        
        const audioUrl = await googleTTS.getAudioUrl(chunk, {
          lang: 'en',
          slow: false,
          host: 'https://translate.google.com',
        });

        const chunkPath = path.join(tempDir, `tts-chunk-${i}.mp3`);
        
        const response = await axios({
          method: 'GET',
          url: audioUrl,
          responseType: 'stream',
          timeout: 30000
        });

        await fs.ensureDir(path.dirname(chunkPath));
        const writer = fs.createWriteStream(chunkPath);
        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
          writer.on('finish', () => resolve());
          writer.on('error', reject);
        });
        
        chunkPaths.push(chunkPath);
      }

      // If only one chunk, just rename it
      if (chunkPaths.length === 1) {
        await fs.move(chunkPaths[0], outputPath, { overwrite: true });
        console.log(`✅ TTS audio saved to: ${outputPath}`);
        return outputPath;
      }

      // Concatenate all chunks into one audio file using FFmpeg
      console.log(`   Concatenating ${chunkPaths.length} audio chunks...`);
      const concatListPath = path.join(tempDir, 'tts-concat-list.txt');
      const concatContent = chunkPaths.map(p => `file '${path.resolve(p)}'`).join('\n');
      await fs.writeFile(concatListPath, concatContent);

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(concatListPath)
          .inputOptions(['-f concat', '-safe 0'])
          .outputOptions(['-c copy'])
          .on('end', async () => {
            // Clean up chunk files
            for (const chunkPath of chunkPaths) {
              await fs.remove(chunkPath);
            }
            await fs.remove(concatListPath);
            console.log(`✅ TTS audio saved to: ${outputPath}`);
            resolve();
          })
          .on('error', (err: Error) => {
            reject(err);
          })
          .save(outputPath);
      });

      return outputPath;
    } catch (ttsError) {
      // Fallback: Generate synthetic audio for testing (when network is unavailable)
      console.warn(`⚠️  TTS API unavailable: ${(ttsError as Error).message}`);
      console.log('   Generating synthetic audio for testing...');
      
      // Estimate duration based on speech rate (~150 words per minute, ~3 chars per word)
      const estimatedDuration = Math.max(10, Math.min(45, text.length / 450 * 60));
      
      await fs.ensureDir(path.dirname(outputPath));
      
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input('anullsrc=channel_layout=stereo:sample_rate=44100')
          .inputOptions(['-f lavfi', `-t ${estimatedDuration}`])
          .outputOptions(['-c:a libmp3lame', '-b:a 128k'])
          .on('end', () => {
            console.log(`✅ Synthetic audio saved to: ${outputPath} (${estimatedDuration.toFixed(1)}s)`);
            resolve();
          })
          .on('error', (err: Error) => {
            reject(err);
          })
          .save(outputPath);
      });
      
      return outputPath;
    }
  } catch (error) {
    console.error('❌ Error generating TTS:', (error as Error).message);
    throw error;
  }
}

/**
 * Split script into sentences for text overlay timing
 * @param script - Full script text
 * @returns Array of sentences
 */
function splitScriptIntoSentences(script: string): string[] {
  // Split by periods, exclamation marks, and question marks
  const sentences = script
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return sentences;
}

/**
 * Create a complete faceless short-form video with TTS, music, and text overlays
 * @param params - Video creation parameters
 * @returns Path to final video
 */
export async function createShort(params: CreateShortParams): Promise<string> {
  const { script, caption, hashtags, assetPaths, outputPath } = params;
  
  let tempDir = '';
  let ttsAudioPath = '';
  let musicPath = '';
  
  try {
    console.log('\n🎬 Creating Short Video...');
    console.log('═══════════════════════════════════════════════════\n');

    // Validate inputs
    if (!script || script.trim().length === 0) {
      throw new Error('Script cannot be empty');
    }
    
    if (!assetPaths || assetPaths.length === 0) {
      throw new Error('At least one asset path is required');
    }

    // Check if asset files exist
    for (const assetPath of assetPaths) {
      if (!await fs.pathExists(assetPath)) {
        throw new Error(`Asset file not found: ${assetPath}`);
      }
    }

    // Extract niche from output path or use default
    const pathParts = outputPath.split('/');
    const niche = pathParts[pathParts.length - 1] || 'short';
    
    // Create timestamp: YYYYMMDD_HHmmss
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .split('.')[0];

    // Setup directories
    const outputDir = path.dirname(outputPath) || path.join(process.cwd(), 'output');
    await fs.ensureDir(outputDir);
    
    tempDir = path.join(outputDir, `temp-${timestamp}`);
    await fs.ensureDir(tempDir);

    // Step 1: Generate TTS audio
    console.log('🗣️  Step 1: Generating Text-to-Speech audio...');
    ttsAudioPath = path.join(tempDir, 'tts-narration.mp3');
    await generateTTSAudio(script, ttsAudioPath);

    // Get TTS audio duration
    const ttsDuration = await getAudioDuration(ttsAudioPath);
    console.log(`   TTS Duration: ${ttsDuration.toFixed(2)} seconds`);

    // Step 2: Get background music
    console.log('\n🎵 Step 2: Getting background music...');
    musicPath = await getBackgroundMusic(tempDir);

    // Step 3: Process video assets
    console.log('\n📐 Step 3: Processing video assets...');
    const processedVideos: string[] = [];
    
    for (let i = 0; i < assetPaths.length; i++) {
      const assetPath = assetPaths[i];
      const ext = path.extname(assetPath).toLowerCase();
      
      // Check if it's an image or video
      const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
      const processedPath = path.join(tempDir, `processed-${i}.mp4`);
      
      if (isImage) {
        // Convert image to video (5 seconds duration with simple zoom)
        console.log(`   Converting image to video: ${path.basename(assetPath)}`);
        await new Promise<void>((resolve, reject) => {
          ffmpeg(assetPath)
            .inputOptions(['-loop 1', '-t 5'])
            .videoFilters([
              'scale=1080:1920:force_original_aspect_ratio=increase',
              'crop=1080:1920'
            ])
            .outputOptions(['-r 30', '-pix_fmt yuv420p', '-preset ultrafast', '-crf 28'])
            .on('end', () => {
              console.log(`   ✅ Image processed: ${path.basename(processedPath)}`);
              resolve();
            })
            .on('error', (err: Error) => {
              console.error(`   ❌ Error processing image: ${err.message}`);
              reject(err);
            })
            .save(processedPath);
        });
      } else {
        // Process video with simple scale and crop
        console.log(`   Processing video: ${path.basename(assetPath)}`);
        await new Promise<void>((resolve, reject) => {
          ffmpeg(assetPath)
            .videoFilters([
              'scale=1080:1920:force_original_aspect_ratio=increase',
              'crop=1080:1920'
            ])
            .outputOptions(['-r 30', '-an', '-pix_fmt yuv420p', '-preset ultrafast', '-crf 28'])
            .on('end', () => {
              console.log(`   ✅ Video processed: ${path.basename(processedPath)}`);
              resolve();
            })
            .on('error', (err: Error) => {
              console.error(`   ❌ Error processing video: ${err.message}`);
              reject(err);
            })
            .save(processedPath);
        });
      }
      
      processedVideos.push(processedPath);
    }

    // Step 4: Concatenate and loop videos to match TTS duration
    console.log('\n🔗 Step 4: Concatenating videos...');
    const concatListPath = path.join(tempDir, 'concat-list.txt');
    
    // Calculate how many times we need to loop the videos
    let totalVideoDuration = 0;
    for (const video of processedVideos) {
      const duration = await getVideoDuration(video);
      totalVideoDuration += duration;
    }
    
    // Create concat list with loops if needed
    const loops = Math.ceil(ttsDuration / totalVideoDuration);
    const concatLines: string[] = [];
    
    for (let i = 0; i < loops; i++) {
      for (const video of processedVideos) {
        concatLines.push(`file '${path.resolve(video)}'`);
      }
    }
    
    await fs.writeFile(concatListPath, concatLines.join('\n'));

    const concatenatedPath = path.join(tempDir, 'concatenated.mp4');
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy', '-t', ttsDuration.toString()])
        .on('end', () => {
          console.log('   ✅ Videos concatenated');
          resolve();
        })
        .on('error', (err: Error) => {
          console.error(`   ❌ Error concatenating: ${err.message}`);
          reject(err);
        })
        .save(concatenatedPath);
    });

    // Step 5: Add text overlays
    console.log('\n📝 Step 5: Adding text overlays...');
    const sentences = splitScriptIntoSentences(script);
    const timePerSentence = ttsDuration / (sentences.length + 2); // +2 for intro and outro
    
    // Build drawtext filters for each sentence
    const textFilters: string[] = [];
    
    // Intro text (first 2-3 seconds)
    textFilters.push(
      `drawtext=text='FACELESS VIDEO':fontsize=80:fontcolor=white:bordercolor=black:borderw=3:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,0,${Math.min(2.5, timePerSentence)})'`
    );
    
    // Script sentences
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].replace(/'/g, "'\\\\\\''"); // Escape single quotes for FFmpeg
      const startTime = timePerSentence * (i + 1);
      const endTime = timePerSentence * (i + 2);
      
      textFilters.push(
        `drawtext=text='${sentence}':fontsize=72:fontcolor=white:bordercolor=black:borderw=3:x=(w-text_w)/2:y=h-200:enable='between(t,${startTime},${endTime})'`
      );
    }
    
    // Outro text (last 2-3 seconds)
    const outroStart = ttsDuration - Math.min(2.5, timePerSentence);
    textFilters.push(
      `drawtext=text='FOLLOW FOR MORE':fontsize=80:fontcolor=white:bordercolor=black:borderw=3:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${outroStart},${ttsDuration})'`
    );

    const videoWithTextPath = path.join(tempDir, 'video-with-text.mp4');
    await new Promise<void>((resolve, reject) => {
      ffmpeg(concatenatedPath)
        .videoFilters(textFilters)
        .outputOptions(['-c:v libx264', '-preset fast', '-crf 23', '-pix_fmt yuv420p'])
        .on('end', () => {
          console.log('   ✅ Text overlays added');
          resolve();
        })
        .on('error', (err: Error) => {
          console.error(`   ❌ Error adding text: ${err.message}`);
          reject(err);
        })
        .save(videoWithTextPath);
    });

    // Step 6: Mix audio (TTS + background music)
    console.log('\n🎶 Step 6: Mixing audio tracks...');
    const finalVideoPath = path.join(outputDir, `${niche}_${timestamp}.mp4`);
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoWithTextPath)
        .input(ttsAudioPath)
        .input(musicPath)
        .complexFilter([
          '[1:a]volume=1.0[tts]',           // TTS at full volume (0dB)
          '[2:a]volume=0.18[music]',        // Music at -15dB (0.18 = ~-15dB)
          '[music]atrim=0:' + ttsDuration + '[music_trimmed]', // Trim music to TTS duration
          '[tts][music_trimmed]amix=inputs=2:duration=first[aout]' // Mix both tracks
        ])
        .outputOptions([
          '-map 0:v',       // Video from first input
          '-map [aout]',    // Mixed audio
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-c:a aac',
          '-b:a 192k',
          '-ar 44100',
          '-shortest'
        ])
        .on('start', (cmd: string) => {
          console.log(`   FFmpeg command: ${cmd}`);
        })
        .on('progress', (progress: FFmpegProgress) => {
          if (progress.percent) {
            process.stdout.write(`\r   Progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log('\n   ✅ Audio mixed successfully');
          resolve();
        })
        .on('error', (err: Error) => {
          console.error(`\n   ❌ Error mixing audio: ${err.message}`);
          reject(err);
        })
        .save(finalVideoPath);
    });

    // Step 7: Save caption and hashtags
    console.log('\n💾 Step 7: Saving caption and hashtags...');
    const captionPath = path.join(outputDir, `${niche}_${timestamp}_caption.txt`);
    const hashtagsPath = path.join(outputDir, `${niche}_${timestamp}_hashtags.txt`);
    
    await fs.writeFile(captionPath, caption);
    await fs.writeFile(hashtagsPath, hashtags);
    
    console.log(`   ✅ Caption saved: ${captionPath}`);
    console.log(`   ✅ Hashtags saved: ${hashtagsPath}`);

    // Step 8: Clean up temporary files
    console.log('\n🧹 Step 8: Cleaning up...');
    await fs.remove(tempDir);
    console.log('   ✅ Temporary files removed');

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ Video created successfully!');
    console.log(`   Video: ${finalVideoPath}`);
    console.log(`   Caption: ${captionPath}`);
    console.log(`   Hashtags: ${hashtagsPath}`);
    console.log('═══════════════════════════════════════════════════\n');

    return finalVideoPath;

  } catch (error) {
    console.error('\n❌ Error creating short video:', (error as Error).message);
    
    // Clean up on error
    if (tempDir && await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
    
    throw error;
  }
}
