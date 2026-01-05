#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as dotenv from 'dotenv';

import { generateScript, generateViralScript, loadScript } from './scripts';
import { downloadAllAssets } from './downloads';
import { createVideo, checkFFmpeg } from './editor';

dotenv.config();

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
      if (!process.env.GOOGLE_API_KEY) {
        console.error('❌ Error: GOOGLE_API_KEY not found in .env file');
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
      if (!process.env.GOOGLE_API_KEY || !process.env.PEXELS_API_KEY) {
        console.error('❌ Error: Required API keys not found in .env file');
        console.log('   Required: GOOGLE_API_KEY, PEXELS_API_KEY');
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
 * Batch command - Process multiple niches
 */
program
  .command('batch')
  .description('Batch process multiple niches and create videos')
  .argument('<niches>', 'Comma-separated list of niches (e.g., "fitness,cooking,travel")')
  .action(async (nichesArg: string) => {
    try {
      const niches = nichesArg.split(',').map(n => n.trim()).filter(n => n.length > 0);

      if (niches.length === 0) {
        console.error('❌ Error: No niches provided');
        process.exit(1);
      }

      console.log('═══════════════════════════════════════════════════');
      console.log('🎬 FACELESS VIDEO AUTOMATION - BATCH PROCESSING');
      console.log('═══════════════════════════════════════════════════\n');
      console.log(`📋 Processing ${niches.length} niche(s): ${niches.join(', ')}\n`);

      // Check environment variables
      if (!process.env.GOOGLE_API_KEY || !process.env.PEXELS_API_KEY) {
        console.error('❌ Error: Required API keys not found in .env file');
        console.log('   Required: GOOGLE_API_KEY, PEXELS_API_KEY');
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

      const results: {
        successful: Array<{ niche: string; videoPath: string }>;
        failed: Array<{ niche: string; error: string }>;
      } = {
        successful: [],
        failed: []
      };

      // Process each niche
      for (let i = 0; i < niches.length; i++) {
        const niche = niches[i];
        console.log(`\n${'═'.repeat(51)}`);
        console.log(`📹 PROCESSING ${i + 1}/${niches.length}: ${niche}`);
        console.log(`${'═'.repeat(51)}\n`);

        try {
          // Generate script
          console.log('📝 Generating script...');
          const script = await generateScript(niche);

          // Download assets
          console.log('📦 Downloading assets...');
          const assets = await downloadAllAssets(script, niche);

          // Create video
          console.log('🎥 Creating video...');
          const videoPath = await createVideo(assets, niche);

          results.successful.push({ niche, videoPath });
          console.log(`✅ Completed: ${niche}`);

          // Add delay between batches to respect rate limits
          if (i < niches.length - 1) {
            console.log('\n⏳ Waiting 5 seconds before next batch...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }

        } catch (error) {
          results.failed.push({ niche, error: (error as Error).message });
          console.error(`❌ Failed: ${niche} - ${(error as Error).message}`);
        }
      }

      // Print summary
      console.log('\n═══════════════════════════════════════════════════');
      console.log('📊 BATCH PROCESSING SUMMARY');
      console.log('═══════════════════════════════════════════════════\n');
      console.log(`✅ Successful: ${results.successful.length}/${niches.length}`);
      
      if (results.successful.length > 0) {
        console.log('\nSuccessful videos:');
        results.successful.forEach(({ niche, videoPath }) => {
          console.log(`   ✓ ${niche}: ${videoPath}`);
        });
      }

      if (results.failed.length > 0) {
        console.log(`\n❌ Failed: ${results.failed.length}/${niches.length}`);
        console.log('\nFailed niches:');
        results.failed.forEach(({ niche, error }) => {
          console.log(`   ✗ ${niche}: ${error}`);
        });
      }

      console.log('\n═══════════════════════════════════════════════════\n');

    } catch (error) {
      console.error('\n❌ Batch processing failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
}

// Parse command line arguments
program.parse(process.argv);
