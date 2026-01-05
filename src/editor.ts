#!/usr/bin/env node

import * as fs from 'fs-extra';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { FfprobeData } from 'fluent-ffmpeg';
import { Assets, FFmpegProgress } from './types';

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
