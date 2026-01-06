#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as dotenv from 'dotenv';
import * as cron from 'node-cron';

import { generateScript, generateViralScript, loadScript } from './scripts';
import { downloadAllAssets, downloadAssets, extractKeywords } from './downloads';
import { createVideo, checkFFmpeg, createShort } from './editor';

dotenv.config();

// Constants
const VERTICAL_ASPECT_RATIO_THRESHOLD = 0.75; // Aspect ratio threshold for vertical format

/**
 * Helper Functions
 */

/**
 * Execute the complete batch pipeline for a single niche
 * @param niche - The niche/topic for the video
 * @returns Object with video path and metadata
 */
async function runBatchPipeline(niche: string): Promise<{ videoPath: string; caption: string; hashtags: string }> {
  try {
    console.log(`\n${'═'.repeat(51)}`);
    console.log(`🎬 PROCESSING: ${niche}`);
    console.log(`${'═'.repeat(51)}\n`);

    // Step 1: Generate viral script
    console.log('📝 Step 1/4: Generating viral script...');
    const viralScript = await generateViralScript(niche);

    // Step 2: Extract keywords from script
    console.log('🔑 Step 2/4: Extracting keywords...');
    const keywords = extractKeywords(viralScript.script);
    console.log(`   Keywords: ${keywords.join(', ')}`);

    // Step 3: Download assets using keywords
    console.log('📦 Step 3/4: Downloading assets...');
    const searchQuery = keywords.slice(0, 3).join(' ');
    const downloadResult = await downloadAssets(searchQuery, 8);

    // Step 4: Create unique timestamped folder in output/
    const timestamp = Date.now();
    const outputFolder = path.join(process.cwd(), 'output', `${niche.replace(/\s+/g, '-')}_${timestamp}`);
    await fs.ensureDir(outputFolder);

    // Step 5: Create the short video
    console.log('🎥 Step 4/4: Creating short video...');
    const assetPaths = downloadResult.assets.map(a => a.path);
    const videoPath = await createShort({
      script: viralScript.script,
      caption: viralScript.caption,
      hashtags: viralScript.hashtags,
      assetPaths,
      outputPath: outputFolder
    });

    return {
      videoPath,
      caption: viralScript.caption,
      hashtags: viralScript.hashtags
    };

  } catch (error) {
    console.error(`❌ Error in batch pipeline for ${niche}:`, (error as Error).message);
    throw error;
  }
}

/**
 * Recursively calculate the size of a folder in bytes
 * @param folderPath - Path to the folder
 * @returns Size in bytes
 */
async function getFolderSize(folderPath: string): Promise<number> {
  let totalSize = 0;

  try {
    const stats = await fs.stat(folderPath);
    
    if (!stats.isDirectory()) {
      return stats.size;
    }

    const files = await fs.readdir(folderPath);
    
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const fileStats = await fs.stat(filePath);
      
      if (fileStats.isDirectory()) {
        totalSize += await getFolderSize(filePath);
      } else {
        totalSize += fileStats.size;
      }
    }

    return totalSize;
  } catch (error) {
    console.error(`Error calculating folder size: ${(error as Error).message}`);
    return 0;
  }
}

/**
 * Format bytes to human-readable string
 * @param bytes - Number of bytes
 * @returns Formatted string (KB, MB, GB)
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

const program = new Command();

// Configure CLI
program
  .name('faceless-video')
  .description('CLI tool for automated faceless short-form video generation')
  .version('1.0.0');

/**
 * Generate command - Generate script only
 */
program
  .command('generate')
  .description('Generate a video script for a specific niche')
  .argument('<niche>', 'The niche/topic for the video (e.g., "motivational quotes")')
  .action(async (niche: string) => {
    try {
      console.log('═══════════════════════════════════════════════════');
      console.log('🎬 FACELESS VIDEO AUTOMATION - GENERATE SCRIPT');
      console.log('═══════════════════════════════════════════════════\n');

      // Check environment variables
      if (!process.env.MISTRAL_API_KEY) {
        console.error('❌ Error: MISTRAL_API_KEY not found in .env file');
        console.log('   Please create a .env file with your API keys.');
        console.log('   See .env.example for reference.\n');
        process.exit(1);
      }

      // Generate viral script
      const viralScript = await generateViralScript(niche);

      console.log('\n📝 Generated Content:');
      console.log('─────────────────────────────────────────────────');
      console.log('\n🎬 SCRIPT:');
      console.log(viralScript.script);
      console.log('\n📱 CAPTION:');
      console.log(viralScript.caption);
      console.log(`   (${viralScript.caption.length} characters)`);
      console.log('\n🏷️  HASHTAGS:');
      console.log(viralScript.hashtags);
      console.log('─────────────────────────────────────────────────');

      console.log('\n✅ Script generation complete!');
      console.log(`   Script saved to scripts/[timestamp].txt`);
      console.log(`   Use 'pnpm start run ${niche}' to create the full video.\n`);

    } catch (error) {
      console.error('\n❌ Script generation failed:', (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Run command - Generate script, download assets, and create video
 */
program
  .command('run')
  .description('Process and create a complete video for a specific niche')
  .argument('<niche>', 'The niche/topic for the video (e.g., "tech tips")')
  .action(async (niche: string) => {
    try {
      console.log('═══════════════════════════════════════════════════');
      console.log('🎬 FACELESS VIDEO AUTOMATION - FULL PIPELINE');
      console.log('═══════════════════════════════════════════════════\n');

      // Check environment variables
      if (!process.env.MISTRAL_API_KEY || !process.env.PEXELS_API_KEY) {
        console.error('❌ Error: Required API keys not found in .env file');
        console.log('   Required: MISTRAL_API_KEY, PEXELS_API_KEY');
        console.log('   Please create a .env file with your API keys.');
        console.log('   See .env.example for reference.\n');
        process.exit(1);
      }

      // Check FFmpeg
      const ffmpegAvailable = await checkFFmpeg();
      if (!ffmpegAvailable) {
        console.error('   Please install FFmpeg to continue.\n');
        process.exit(1);
      }

      // Step 1: Generate script
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📝 STEP 1/3: Generating Script');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      const script = await generateScript(niche);

      // Step 2: Download assets
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📦 STEP 2/3: Downloading Assets');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      const assets = await downloadAllAssets(script, niche);

      // Step 3: Create video
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎥 STEP 3/3: Creating Video');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      const videoPath = await createVideo(assets, niche);

      console.log('\n═══════════════════════════════════════════════════');
      console.log('✅ SUCCESS! Video created:');
      console.log(`   ${videoPath}`);
      console.log('═══════════════════════════════════════════════════\n');

    } catch (error) {
      console.error('\n❌ Video creation failed:', (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Download command - Download assets for a custom query
 */
program
  .command('download')
  .description('Download video/photo assets from Pexels for a custom query')
  .argument('[query]', 'Search query or text to extract keywords from (e.g., "ocean waves sunset")')
  .option('-c, --count <number>', 'Number of assets to download', '8')
  .action(async (query: string | undefined, options: { count: string }) => {
    try {
      console.log('═══════════════════════════════════════════════════');
      console.log('🎬 FACELESS VIDEO AUTOMATION - DOWNLOAD ASSETS');
      console.log('═══════════════════════════════════════════════════\n');

      // Check environment variables
      if (!process.env.PEXELS_API_KEY) {
        console.error('❌ Error: PEXELS_API_KEY not found in .env file');
        console.log('   Please create a .env file with your Pexels API key.');
        console.log('   See .env.example for reference.\n');
        process.exit(1);
      }

      // If no query provided, prompt for one
      if (!query) {
        console.error('❌ Error: No query provided');
        console.log('   Usage: pnpm start download "your search query"');
        console.log('   Example: pnpm start download "ocean waves sunset"\n');
        process.exit(1);
      }

      const count = parseInt(options.count, 10);
      if (isNaN(count) || count < 1 || count > 50) {
        console.error('❌ Error: Count must be a number between 1 and 50');
        process.exit(1);
      }

      // Download assets
      const result = await downloadAssets(query, count);

      // Display results
      console.log('═══════════════════════════════════════════════════');
      console.log('✅ DOWNLOAD COMPLETE!');
      console.log('═══════════════════════════════════════════════════\n');
      console.log(`📁 Directory: ${result.directory}`);
      console.log(`📊 Total Assets: ${result.assets.length}`);
      console.log(`   🎥 Videos: ${result.assets.filter(a => a.type === 'video').length}`);
      console.log(`   📷 Photos: ${result.assets.filter(a => a.type === 'photo').length}`);
      
      if (result.extractedKeywords && result.extractedKeywords.length > 0) {
        console.log(`\n🔑 Extracted Keywords: ${result.extractedKeywords.join(', ')}`);
      }
      
      console.log('\n📄 Asset Details:');
      result.assets.forEach((asset, index) => {
        const icon = asset.type === 'video' ? '🎥' : '📷';
        const duration = asset.duration ? ` (${asset.duration.toFixed(1)}s)` : '';
        const aspectRatioLabel = asset.aspectRatio < VERTICAL_ASPECT_RATIO_THRESHOLD ? '📱 Vertical' : '🖼️  Horizontal';
        console.log(`   ${index + 1}. ${icon} ${asset.type.toUpperCase()}${duration} - ${aspectRatioLabel}`);
        console.log(`      ${path.basename(asset.path)}`);
      });
      
      console.log('\n═══════════════════════════════════════════════════\n');

    } catch (error) {
      console.error('\n❌ Asset download failed:', (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Batch command - Main pipeline for single niche
 */
program
  .command('batch')
  .description('Process a single niche through the complete video generation pipeline')
  .argument('<niche>', 'The niche/topic for the video (e.g., "motivational quotes")')
  .action(async (niche: string) => {
    try {
      console.log('═══════════════════════════════════════════════════');
      console.log('🎬 FACELESS VIDEO AUTOMATION - BATCH PIPELINE');
      console.log('═══════════════════════════════════════════════════\n');

      // Check environment variables
      if (!process.env.MISTRAL_API_KEY || !process.env.PEXELS_API_KEY) {
        console.error('❌ Error: Required API keys not found in .env file');
        console.log('   Required: MISTRAL_API_KEY, PEXELS_API_KEY');
        console.log('   Please create a .env file with your API keys.');
        console.log('   See .env.example for reference.\n');
        process.exit(1);
      }

      // Check FFmpeg
      const ffmpegAvailable = await checkFFmpeg();
      if (!ffmpegAvailable) {
        console.error('   Please install FFmpeg to continue.\n');
        process.exit(1);
      }

      // Run the batch pipeline
      const result = await runBatchPipeline(niche);

      // Log output in the specified format
      console.log('\n═══════════════════════════════════════════════════');
      console.log('✅ SUCCESS!');
      console.log('═══════════════════════════════════════════════════');
      console.log(`Video ready: ${result.videoPath}`);
      console.log(`Caption: ${result.caption}`);
      console.log('═══════════════════════════════════════════════════\n');

    } catch (error) {
      console.error('\n❌ Batch pipeline failed:', (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Batch-multi command - Process multiple niches
 */
program
  .command('batch-multi')
  .description('Batch process multiple niches and create videos')
  .argument('[niches]', 'Comma-separated list of niches (e.g., "fitness,cooking,travel")')
  .option('-f, --file <path>', 'Path to niches file (one niche per line, # for comments)', 'niches.txt')
  .action(async (nichesArg: string | undefined, options: { file: string }) => {
    try {
      console.log('═══════════════════════════════════════════════════');
      console.log('🎬 FACELESS VIDEO AUTOMATION - BATCH MULTI');
      console.log('═══════════════════════════════════════════════════\n');

      // Check environment variables
      if (!process.env.MISTRAL_API_KEY || !process.env.PEXELS_API_KEY) {
        console.error('❌ Error: Required API keys not found in .env file');
        console.log('   Required: MISTRAL_API_KEY, PEXELS_API_KEY');
        console.log('   Please create a .env file with your API keys.');
        console.log('   See .env.example for reference.\n');
        process.exit(1);
      }

      // Check FFmpeg
      const ffmpegAvailable = await checkFFmpeg();
      if (!ffmpegAvailable) {
        console.error('   Please install FFmpeg to continue.\n');
        process.exit(1);
      }

      let niches: string[] = [];

      // Load niches from command argument or file
      if (nichesArg) {
        niches = nichesArg.split(',').map(n => n.trim()).filter(n => n.length > 0);
      } else {
        // Read from file
        const filePath = path.isAbsolute(options.file) 
          ? options.file 
          : path.join(process.cwd(), options.file);

        if (!await fs.pathExists(filePath)) {
          console.error(`❌ Error: Niches file not found: ${filePath}`);
          console.log('   Create a niches.txt file with one niche per line.');
          console.log('   Lines starting with # are treated as comments.\n');
          process.exit(1);
        }

        const fileContent = await fs.readFile(filePath, 'utf-8');
        niches = fileContent
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.startsWith('#'));
      }

      if (niches.length === 0) {
        console.error('❌ Error: No niches provided');
        console.log('   Provide niches as: batch-multi "niche1,niche2"');
        console.log('   Or use -f flag: batch-multi -f niches.txt\n');
        process.exit(1);
      }

      console.log(`📋 Processing ${niches.length} niche(s): ${niches.join(', ')}\n`);

      const results: {
        successful: Array<{ niche: string; videoPath: string; caption: string }>;
        failed: Array<{ niche: string; error: string }>;
      } = {
        successful: [],
        failed: []
      };

      // Process each niche sequentially
      for (let i = 0; i < niches.length; i++) {
        const niche = niches[i];
        console.log(`\n${'═'.repeat(51)}`);
        console.log(`📹 PROCESSING ${i + 1}/${niches.length}: ${niche}`);
        console.log(`${'═'.repeat(51)}\n`);

        try {
          const result = await runBatchPipeline(niche);
          results.successful.push({ 
            niche, 
            videoPath: result.videoPath,
            caption: result.caption
          });
          console.log(`✅ Completed: ${niche}`);

          // Add delay between batches to respect rate limits
          if (i < niches.length - 1) {
            console.log('\n⏳ Waiting 5 seconds before next batch...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }

        } catch (error) {
          results.failed.push({ niche, error: (error as Error).message });
          console.error(`❌ Failed: ${niche} - ${(error as Error).message}`);
          
          // Continue to next niche even on failure
          if (i < niches.length - 1) {
            console.log('\n⏳ Waiting 5 seconds before next batch...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }

      // Print summary report
      console.log('\n═══════════════════════════════════════════════════');
      console.log('📊 BATCH PROCESSING SUMMARY');
      console.log('═══════════════════════════════════════════════════\n');
      console.log(`✅ Successful: ${results.successful.length}/${niches.length}`);
      
      if (results.successful.length > 0) {
        console.log('\n✅ Successful videos:');
        results.successful.forEach(({ niche, videoPath, caption }) => {
          console.log(`\n   📹 ${niche}`);
          console.log(`      Video: ${videoPath}`);
          console.log(`      Caption: ${caption}`);
        });
      }

      if (results.failed.length > 0) {
        console.log(`\n\n❌ Failed: ${results.failed.length}/${niches.length}`);
        console.log('\nFailed niches:');
        results.failed.forEach(({ niche, error }) => {
          console.log(`   ✗ ${niche}: ${error}`);
        });
      }

      console.log('\n═══════════════════════════════════════════════════\n');

    } catch (error) {
      console.error('\n❌ Batch-multi processing failed:', (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Schedule command - Automated scheduled video generation
 */
program
  .command('schedule')
  .description('Schedule automated video generation using cron')
  .option('-s, --schedule <cron>', 'Cron expression (default: "0 8 * * *" - daily at 8 AM)', '0 8 * * *')
  .option('-c, --count <number>', 'Number of videos to generate per run', '5')
  .option('-f, --file <path>', 'Path to niches file', 'niches.txt')
  .action(async (options: { schedule: string; count: string; file: string }) => {
    try {
      console.log('═══════════════════════════════════════════════════');
      console.log('🎬 FACELESS VIDEO AUTOMATION - SCHEDULER');
      console.log('═══════════════════════════════════════════════════\n');

      // Check environment variables
      if (!process.env.MISTRAL_API_KEY || !process.env.PEXELS_API_KEY) {
        console.error('❌ Error: Required API keys not found in .env file');
        console.log('   Required: MISTRAL_API_KEY, PEXELS_API_KEY');
        console.log('   Please create a .env file with your API keys.');
        console.log('   See .env.example for reference.\n');
        process.exit(1);
      }

      // Check FFmpeg
      const ffmpegAvailable = await checkFFmpeg();
      if (!ffmpegAvailable) {
        console.error('   Please install FFmpeg to continue.\n');
        process.exit(1);
      }

      // Validate cron expression
      if (!cron.validate(options.schedule)) {
        console.error(`❌ Error: Invalid cron expression: "${options.schedule}"`);
        console.log('\nCron expression format: * * * * *');
        console.log('                        │ │ │ │ │');
        console.log('                        │ │ │ │ └─── Day of week (0-7)');
        console.log('                        │ │ │ └───── Month (1-12)');
        console.log('                        │ │ └─────── Day of month (1-31)');
        console.log('                        │ └───────── Hour (0-23)');
        console.log('                        └─────────── Minute (0-59)');
        console.log('\nExamples:');
        console.log('  "0 8 * * *"   - Every day at 8:00 AM');
        console.log('  "0 */6 * * *" - Every 6 hours');
        console.log('  "0 9 * * 1"   - Every Monday at 9:00 AM\n');
        process.exit(1);
      }

      // Parse count
      const count = parseInt(options.count, 10);
      if (isNaN(count) || count < 1 || count > 50) {
        console.error('❌ Error: Count must be a number between 1 and 50');
        process.exit(1);
      }

      // Check niches file
      const filePath = path.isAbsolute(options.file) 
        ? options.file 
        : path.join(process.cwd(), options.file);

      if (!await fs.pathExists(filePath)) {
        console.error(`❌ Error: Niches file not found: ${filePath}`);
        console.log('   Create a niches.txt file with one niche per line.\n');
        process.exit(1);
      }

      console.log('⚙️  Schedule Configuration:');
      console.log(`   Cron: ${options.schedule}`);
      console.log(`   Videos per run: ${count}`);
      console.log(`   Niches file: ${filePath}`);
      console.log('\n🚀 Scheduler started! Press Ctrl+C to stop.\n');

      // Schedule the task
      cron.schedule(options.schedule, async () => {
        const timestamp = new Date().toISOString();
        console.log(`\n${'═'.repeat(51)}`);
        console.log(`🕒 SCHEDULED RUN: ${timestamp}`);
        console.log(`${'═'.repeat(51)}\n`);

        try {
          // Read niches from file
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const allNiches = fileContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'));

          if (allNiches.length === 0) {
            console.error('❌ Error: No niches found in file');
            return;
          }

          // Randomly select 'count' niches
          const selectedNiches: string[] = [];
          const availableNiches = [...allNiches];
          
          for (let i = 0; i < Math.min(count, allNiches.length); i++) {
            const randomIndex = Math.floor(Math.random() * availableNiches.length);
            selectedNiches.push(availableNiches[randomIndex]);
            availableNiches.splice(randomIndex, 1);
          }

          console.log(`📋 Selected niches: ${selectedNiches.join(', ')}\n`);

          // Process each selected niche
          for (let i = 0; i < selectedNiches.length; i++) {
            const niche = selectedNiches[i];
            console.log(`\n📹 Processing ${i + 1}/${selectedNiches.length}: ${niche}`);

            try {
              const result = await runBatchPipeline(niche);
              console.log(`✅ Completed: ${niche}`);
              console.log(`   Video: ${result.videoPath}`);

              // Add delay between batches
              if (i < selectedNiches.length - 1) {
                console.log('\n⏳ Waiting 5 seconds before next batch...');
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            } catch (error) {
              console.error(`❌ Failed: ${niche} - ${(error as Error).message}`);
              
              // Continue to next niche
              if (i < selectedNiches.length - 1) {
                console.log('\n⏳ Waiting 5 seconds before next batch...');
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }

          console.log('\n✅ Scheduled run completed!\n');

        } catch (error) {
          console.error('❌ Scheduled run failed:', (error as Error).message);
        }
      });

      // Keep the process running
      process.on('SIGINT', () => {
        console.log('\n\n🛑 Scheduler stopped by user.\n');
        process.exit(0);
      });

    } catch (error) {
      console.error('\n❌ Schedule setup failed:', (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Cleanup command - Remove old assets and temporary files
 */
program
  .command('cleanup')
  .description('Clean up old assets and temporary files')
  .option('-d, --days <number>', 'Remove assets older than specified days', '7')
  .option('--dry-run', 'Preview what would be deleted without actually deleting', false)
  .action(async (options: { days: string; dryRun: boolean }) => {
    try {
      console.log('═══════════════════════════════════════════════════');
      console.log('🎬 FACELESS VIDEO AUTOMATION - CLEANUP');
      console.log('═══════════════════════════════════════════════════\n');

      // Parse days
      const days = parseInt(options.days, 10);
      if (isNaN(days) || days < 0) {
        console.error('❌ Error: Days must be a non-negative number');
        process.exit(1);
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffTime = cutoffDate.getTime();

      console.log(`🧹 Cleanup Configuration:`);
      console.log(`   Remove files older than: ${days} days (before ${cutoffDate.toISOString()})`);
      console.log(`   Mode: ${options.dryRun ? 'DRY RUN (preview only)' : 'DELETE'}\n`);

      let totalFoldersRemoved = 0;
      let totalSpaceFreed = 0;

      // Clean assets/ directory (timestamped folders)
      const assetsDir = path.join(process.cwd(), 'assets');
      if (await fs.pathExists(assetsDir)) {
        console.log('📁 Scanning assets/ directory...\n');
        const assetEntries = await fs.readdir(assetsDir);

        for (const entry of assetEntries) {
          const entryPath = path.join(assetsDir, entry);
          const stats = await fs.stat(entryPath);

          if (stats.isDirectory()) {
            // Check if folder name is a timestamp (YYYY-MM-DD format or similar)
            const timestampMatch = entry.match(/^\d{4}-\d{2}-\d{2}/);
            if (timestampMatch && stats.mtime.getTime() < cutoffTime) {
              const folderSize = await getFolderSize(entryPath);
              totalSpaceFreed += folderSize;
              totalFoldersRemoved++;

              console.log(`   ${options.dryRun ? '🔍 Would delete' : '🗑️  Deleting'}: ${entry}`);
              console.log(`      Size: ${formatBytes(folderSize)}`);
              console.log(`      Modified: ${stats.mtime.toISOString()}`);

              if (!options.dryRun) {
                await fs.remove(entryPath);
              }
            }
          }
        }
      }

      // Clean output/ directory (temp- folders)
      const outputDir = path.join(process.cwd(), 'output');
      if (await fs.pathExists(outputDir)) {
        console.log('\n📁 Scanning output/ directory...\n');
        const outputEntries = await fs.readdir(outputDir);

        for (const entry of outputEntries) {
          const entryPath = path.join(outputDir, entry);
          const stats = await fs.stat(entryPath);

          if (stats.isDirectory() && entry.startsWith('temp-')) {
            const folderSize = await getFolderSize(entryPath);
            totalSpaceFreed += folderSize;
            totalFoldersRemoved++;

            console.log(`   ${options.dryRun ? '🔍 Would delete' : '🗑️  Deleting'}: ${entry}`);
            console.log(`      Size: ${formatBytes(folderSize)}`);
            console.log(`      Modified: ${stats.mtime.toISOString()}`);

            if (!options.dryRun) {
              await fs.remove(entryPath);
            }
          }
        }
      }

      // Print summary
      console.log('\n═══════════════════════════════════════════════════');
      console.log('📊 CLEANUP SUMMARY');
      console.log('═══════════════════════════════════════════════════');
      console.log(`${options.dryRun ? '🔍 Would remove' : '🗑️  Removed'}: ${totalFoldersRemoved} folder(s)`);
      console.log(`💾 Space ${options.dryRun ? 'that would be' : ''} freed: ${formatBytes(totalSpaceFreed)}`);
      console.log('═══════════════════════════════════════════════════\n');

      if (options.dryRun && totalFoldersRemoved > 0) {
        console.log('💡 Run without --dry-run to actually delete these files.\n');
      }

    } catch (error) {
      console.error('\n❌ Cleanup failed:', (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Edit command - Create video from assets folder and script file
 */
program
  .command('edit')
  .description('Create a video from assets folder and script file')
  .argument('<assetsFolder>', 'Path to folder containing video/image assets')
  .argument('<scriptFile>', 'Path to text file containing the script')
  .action(async (assetsFolder: string, scriptFile: string) => {
    try {
      console.log('═══════════════════════════════════════════════════');
      console.log('🎬 FACELESS VIDEO AUTOMATION - EDIT VIDEO');
      console.log('═══════════════════════════════════════════════════\n');

      // Check FFmpeg
      const ffmpegAvailable = await checkFFmpeg();
      if (!ffmpegAvailable) {
        console.error('   Please install FFmpeg to continue.\n');
        process.exit(1);
      }

      // Check if assets folder exists
      if (!await fs.pathExists(assetsFolder)) {
        console.error(`❌ Error: Assets folder not found: ${assetsFolder}`);
        process.exit(1);
      }

      // Check if script file exists
      if (!await fs.pathExists(scriptFile)) {
        console.error(`❌ Error: Script file not found: ${scriptFile}`);
        process.exit(1);
      }

      // Read script from file
      console.log(`📖 Reading script from: ${scriptFile}`);
      const script = await fs.readFile(scriptFile, 'utf-8');
      
      if (!script || script.trim().length === 0) {
        console.error('❌ Error: Script file is empty');
        process.exit(1);
      }

      console.log(`   Script length: ${script.length} characters\n`);

      // Get all video and image files from assets folder
      console.log(`📁 Reading assets from: ${assetsFolder}`);
      const files = await fs.readdir(assetsFolder);
      const assetPaths = files
        .filter(f => {
          const ext = path.extname(f).toLowerCase();
          return ['.mp4', '.mov', '.avi', '.jpg', '.jpeg', '.png', '.webp'].includes(ext);
        })
        .map(f => path.join(assetsFolder, f));

      if (assetPaths.length === 0) {
        console.error('❌ Error: No video or image assets found in folder');
        console.log('   Supported formats: .mp4, .mov, .avi, .jpg, .jpeg, .png, .webp\n');
        process.exit(1);
      }

      console.log(`   Found ${assetPaths.length} asset(s):`);
      assetPaths.forEach((p, i) => {
        console.log(`   ${i + 1}. ${path.basename(p)}`);
      });
      console.log('');

      // Use default caption and hashtags for testing
      const timestamp = Date.now();
      const caption = '🎥 Amazing content created with faceless video automation!';
      const hashtags = '#shorts #viral #trending #faceless #automation #contentcreation #ai #video #socialmedia #youtube';
      const outputPath = path.join(process.cwd(), 'output', `test_${timestamp}`);

      // Create the short video
      const videoPath = await createShort({
        script,
        caption,
        hashtags,
        assetPaths,
        outputPath
      });

      console.log('═══════════════════════════════════════════════════');
      console.log('✅ SUCCESS! Video created:');
      console.log(`   ${videoPath}`);
      console.log('═══════════════════════════════════════════════════\n');

    } catch (error) {
      console.error('\n❌ Video editing failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
}

// Parse command line arguments
program.parse(process.argv);
