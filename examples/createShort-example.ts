/**
 * Example usage of the createShort function
 * This demonstrates how to programmatically create faceless short-form videos
 */

import { createShort } from '../src/editor';

async function main() {
  try {
    // Example 1: Create a video about ocean facts
    console.log('Example 1: Ocean Facts Video\n');
    
    const oceanVideo = await createShort({
      script: "Welcome to our channel. Today we're discussing amazing facts. Did you know the ocean covers 71% of Earth? Stay tuned for more incredible content.",
      caption: "🌊 Amazing ocean facts you didn't know!",
      hashtags: "#facts #ocean #science #educational #viral",
      assetPaths: [
        "assets/ocean1.mp4",
        "assets/ocean2.jpg",
        "assets/ocean3.mp4"
      ],
      outputPath: "output/ocean"
    });
    
    console.log(`Ocean video created: ${oceanVideo}\n`);
    
    // Example 2: Create a motivational video
    console.log('Example 2: Motivational Video\n');
    
    const motivationalVideo = await createShort({
      script: "Success is not final. Failure is not fatal. It's the courage to continue that counts. Never give up on your dreams. Every expert was once a beginner.",
      caption: "💪 Daily motivation to keep you going!",
      hashtags: "#motivation #success #mindset #inspiration #goals #hustle #entrepreneur #grind #nevergiveup #dreams",
      assetPaths: [
        "assets/motivation1.mp4",
        "assets/motivation2.mp4",
        "assets/motivation3.jpg",
        "assets/motivation4.mp4"
      ],
      outputPath: "output/motivational"
    });
    
    console.log(`Motivational video created: ${motivationalVideo}\n`);
    
    // Example 3: Create a tech tips video
    console.log('Example 3: Tech Tips Video\n');
    
    const techVideo = await createShort({
      script: "Here's a quick tech tip. Did you know you can speed up your computer by clearing your cache? It takes just 30 seconds. First, open settings. Then clear browsing data. Your device will run faster instantly.",
      caption: "⚡ Speed up your computer in 30 seconds!",
      hashtags: "#techtips #technology #computer #tutorial #lifehack #productivity #tech #windows #apple #howto",
      assetPaths: [
        "assets/tech1.mp4",
        "assets/tech2.png",
        "assets/tech3.mp4"
      ],
      outputPath: "output/tech"
    });
    
    console.log(`Tech video created: ${techVideo}\n`);
    
    console.log('✅ All examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

// Run the examples
main();
