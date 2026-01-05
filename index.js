#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const { generateScript, loadScript } = require('./scripts');
const { downloadAllAssets } = require('./downloads');
const { createVideo, checkFFmpeg } = require('./editor');

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
  .action(async (niche) => {
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

      // Generate script
      const script = await generateScript(niche);

      console.log('\n📝 Script Preview:');
      console.log('─────────────────────────────────────────────────');
      console.log(`Hook: ${script.hook}`);
      console.log(`\nContent: ${script.content}`);
      console.log(`\nCTA: ${script.cta}`);
      console.log(`\nSearch Terms: ${script.searchTerms.join(', ')}`);
      console.log('─────────────────────────────────────────────────');

      console.log('\n✅ Script generation complete!');
      console.log(`   Use 'npm start run ${niche}' to create the full video.\n`);

    } catch (error) {
      console.error('\n❌ Script generation failed:', error.message);
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
  .action(async (niche) => {
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
      console.error('\n❌ Video creation failed:', error.message);
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
  .action(async (nichesArg) => {
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

      const results = {
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
          results.failed.push({ niche, error: error.message });
          console.error(`❌ Failed: ${niche} - ${error.message}`);
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
      console.error('\n❌ Batch processing failed:', error.message);
      process.exit(1);
    }
  });

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
}

// Parse command line arguments
program.parse(process.argv);
