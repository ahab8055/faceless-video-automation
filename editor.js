#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

/**
 * Get video duration in seconds
 * @param {string} videoPath - Path to video file
 * @returns {Promise<number>} Duration in seconds
 */
function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
}

/**
 * Get audio duration in seconds
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<number>} Duration in seconds
 */
function getAudioDuration(audioPath) {
  return getVideoDuration(audioPath); // ffprobe works for audio too
}

/**
 * Scale and crop a video to 9:16 aspect ratio (1080x1920)
 * @param {string} inputPath - Path to input video
 * @param {string} outputPath - Path for output video
 * @returns {Promise<string>} Path to processed video
 */
function scaleAndCropVideo(inputPath, outputPath) {
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
      .on('start', (cmd) => {
        console.log(`   FFmpeg command: ${cmd}`);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          process.stdout.write(`\r   Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`\n✅ Video processed: ${path.basename(outputPath)}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`\n❌ Error processing video: ${err.message}`);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Concatenate multiple videos into one
 * @param {Array<string>} videoPaths - Array of video file paths
 * @param {string} outputPath - Path for concatenated output
 * @param {number} targetDuration - Target duration in seconds (optional)
 * @returns {Promise<string>} Path to concatenated video
 */
async function concatenateVideos(videoPaths, outputPath, targetDuration = null) {
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

    return new Promise((resolve, reject) => {
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
        .on('start', (cmd) => {
          console.log(`   FFmpeg command: ${cmd}`);
        })
        .on('progress', (progress) => {
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
        .on('error', async (err) => {
          console.error(`\n❌ Error concatenating videos: ${err.message}`);
          // Clean up list file
          await fs.remove(listFilePath);
          reject(err);
        })
        .save(outputPath);
    });

  } catch (error) {
    console.error('❌ Error in concatenateVideos:', error.message);
    throw error;
  }
}

/**
 * Merge video with audio narration
 * @param {string} videoPath - Path to video file
 * @param {string} audioPath - Path to audio file
 * @param {string} outputPath - Path for merged output
 * @returns {Promise<string>} Path to final video
 */
function mergeVideoWithAudio(videoPath, audioPath, outputPath) {
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
      .on('start', (cmd) => {
        console.log(`   FFmpeg command: ${cmd}`);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          process.stdout.write(`\r   Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`\n✅ Video and audio merged: ${path.basename(outputPath)}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`\n❌ Error merging video and audio: ${err.message}`);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Create a complete video from assets
 * @param {Object} assets - Object containing video and audio file paths
 * @param {string} niche - The niche/topic name
 * @returns {Promise<string>} Path to final video
 */
async function createVideo(assets, niche) {
  try {
    console.log(`🎥 Creating video for niche: ${niche}...`);

    const outputDir = path.join(process.cwd(), 'output');
    await fs.ensureDir(outputDir);

    const timestamp = Date.now();
    const tempDir = path.join(outputDir, `temp-${timestamp}`);
    await fs.ensureDir(tempDir);

    // Step 1: Process all videos to 9:16 format
    console.log(`\n📐 Step 1: Processing videos to 9:16 format...`);
    const processedVideos = [];
    
    for (let i = 0; i < assets.videos.length; i++) {
      const videoPath = assets.videos[i];
      const processedPath = path.join(tempDir, `processed-${i}.mp4`);
      
      try {
        await scaleAndCropVideo(videoPath, processedPath);
        processedVideos.push(processedPath);
      } catch (error) {
        console.warn(`⚠️  Warning: Could not process video ${videoPath}: ${error.message}`);
      }
    }

    if (processedVideos.length === 0) {
      throw new Error('No videos were successfully processed');
    }

    // Step 2: Get audio duration to determine video length
    console.log(`\n⏱️  Step 2: Determining target video duration...`);
    const audioDuration = await getAudioDuration(assets.audio);
    console.log(`   Audio duration: ${audioDuration.toFixed(2)} seconds`);

    // Step 3: Concatenate videos
    console.log(`\n🔗 Step 3: Concatenating videos...`);
    const concatenatedPath = path.join(tempDir, 'concatenated.mp4');
    await concatenateVideos(processedVideos, concatenatedPath, audioDuration);

    // Step 4: Merge with audio
    console.log(`\n🎶 Step 4: Adding audio narration...`);
    const finalPath = path.join(outputDir, `${niche.replace(/\s+/g, '-')}-${timestamp}.mp4`);
    await mergeVideoWithAudio(concatenatedPath, assets.audio, finalPath);

    // Clean up temporary files
    console.log(`\n🧹 Cleaning up temporary files...`);
    await fs.remove(tempDir);

    console.log(`\n✅ Video created successfully: ${finalPath}`);
    return finalPath;

  } catch (error) {
    console.error('❌ Error creating video:', error.message);
    throw error;
  }
}

/**
 * Check if FFmpeg is installed and accessible
 * @returns {Promise<boolean>} True if FFmpeg is available
 */
function checkFFmpeg() {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
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

module.exports = {
  getVideoDuration,
  getAudioDuration,
  scaleAndCropVideo,
  concatenateVideos,
  mergeVideoWithAudio,
  createVideo,
  checkFFmpeg
};
