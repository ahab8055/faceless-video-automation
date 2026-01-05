#!/usr/bin/env node

import * as fs from 'fs-extra';
import * as path from 'path';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import * as dotenv from 'dotenv';
import { Script, ViralScript } from './types';

dotenv.config();

/**
 * Generate a video script for a specific niche using Google Gemini AI
 * @param niche - The niche/topic for the video
 * @returns The parsed script object
 */
export async function generateScript(niche: string): Promise<Script> {
  try {
    console.log(`🤖 Generating script for niche: ${niche}...`);

    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY not found in environment variables');
    }

    // Initialize Gemini AI model (using Gemini 1.5 Flash for free tier)
    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-flash',
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.9,
    });

    // Create prompt for script generation
    const prompt = `Create an engaging 60-second short-form video script about ${niche}.

The script should be formatted EXACTLY as follows:

HOOK:
[Write a powerful 5-second hook that grabs attention immediately]

CONTENT:
[Write the main content in 3-4 short, punchy sentences that deliver value. Make it engaging and easy to understand.]

CTA:
[Write a clear call-to-action that encourages viewers to like, comment, or follow]

SEARCH_TERMS:
[Provide 5-7 comma-separated search terms for finding relevant stock footage, e.g., "motivation, success, business, entrepreneur, lifestyle"]

Keep the language conversational and dynamic. Make every word count for maximum impact in 60 seconds.`;

    // Generate script using AI
    const response = await model.invoke(prompt);
    const scriptText = response.content as string;

    // Parse the script into sections
    const parsed = parseScript(scriptText);
    parsed.niche = niche;
    parsed.generatedAt = new Date().toISOString();

    // Save script to file
    const scriptId = Date.now();
    const scriptPath = path.join(process.cwd(), 'scripts', `${niche.replace(/\s+/g, '-')}-${scriptId}.json`);
    
    await fs.ensureDir(path.join(process.cwd(), 'scripts'));
    await fs.writeJson(scriptPath, parsed, { spaces: 2 });

    console.log(`✅ Script generated and saved to: ${scriptPath}`);
    return parsed;

  } catch (error) {
    console.error('❌ Error generating script:', (error as Error).message);
    throw error;
  }
}

/**
 * Generate a viral video script for a specific niche using Google Gemini AI (Gemini 1.5 Flash)
 * Returns script, caption, and hashtags format suitable for social media
 * @param niche - The niche/topic for the video
 * @returns Object with script, caption, and hashtags
 */
export async function generateViralScript(niche: string): Promise<ViralScript> {
  try {
    console.log(`🤖 Generating viral script for niche: ${niche}...`);

    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY not found in environment variables');
    }

    // Validate niche input
    if (!niche || niche.trim().length === 0) {
      throw new Error('Niche parameter cannot be empty');
    }

    // Initialize Gemini 1.5 Flash model (free tier)
    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-flash',
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.9,
    });

    // Create prompt for viral script generation
    const prompt = `Create a viral 30-second faceless Short script about ${niche}. 

Include:
- Strong 3-second hook to grab attention immediately
- 3 mind-blowing facts that will keep viewers engaged
- Cliffhanger CTA (call-to-action) to encourage engagement

Also output:
- A short Instagram/TikTok caption (under 150 characters)
- 10 trending hashtags relevant to the niche

Format your response EXACTLY as follows:

SCRIPT:
[Write the complete 30-second script here with the hook, 3 facts, and CTA]

CAPTION:
[Write a short caption under 150 characters]

HASHTAGS:
[Write 10 hashtags separated by spaces, e.g., #niche1 #niche2 #niche3]`;

    // Generate script using AI
    console.log('⏳ Calling Gemini 1.5 Flash API...');
    const response = await model.invoke(prompt);
    const scriptText = response.content as string;

    // Parse the response into structured format
    const viralScript = parseViralScript(scriptText);

    // Save script to file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // YYYY-MM-DDTHH-MM-SS format
    const scriptPath = path.join(process.cwd(), 'scripts', `${timestamp}.txt`);
    
    await fs.ensureDir(path.join(process.cwd(), 'scripts'));
    
    // Format the content for the text file
    const fileContent = `NICHE: ${niche}
GENERATED AT: ${new Date().toISOString()}

SCRIPT:
${viralScript.script}

CAPTION:
${viralScript.caption}

HASHTAGS:
${viralScript.hashtags}
`;
    
    await fs.writeFile(scriptPath, fileContent, 'utf-8');

    console.log(`✅ Script generated and saved to: ${scriptPath}`);
    return viralScript;

  } catch (error) {
    console.error('❌ Error generating viral script:', (error as Error).message);
    throw error;
  }
}

/**
 * Parse the generated viral script text into structured format
 * @param scriptText - The raw script text from AI
 * @returns Parsed viral script object
 */
export function parseViralScript(scriptText: string): ViralScript {
  const result: ViralScript = {
    script: '',
    caption: '',
    hashtags: ''
  };

  try {
    // Extract SCRIPT section
    const scriptMatch = scriptText.match(/SCRIPT:\s*\n([\s\S]*?)(?=\n\s*CAPTION:|$)/i);
    if (scriptMatch) {
      result.script = scriptMatch[1].trim();
    }

    // Extract CAPTION section
    const captionMatch = scriptText.match(/CAPTION:\s*\n([\s\S]*?)(?=\n\s*HASHTAGS:|$)/i);
    if (captionMatch) {
      result.caption = captionMatch[1].trim();
      // Ensure caption is under 150 characters
      if (result.caption.length > 150) {
        result.caption = result.caption.substring(0, 147) + '...';
      }
    }

    // Extract HASHTAGS section
    const hashtagsMatch = scriptText.match(/HASHTAGS:\s*\n([\s\S]*?)$/i);
    if (hashtagsMatch) {
      result.hashtags = hashtagsMatch[1].trim();
    }

    // Fallback: if parsing failed, use the entire text as script
    if (!result.script) {
      result.script = scriptText;
      result.caption = scriptText.substring(0, 147) + '...';
      result.hashtags = '#viral #shorts';
    }

  } catch (error) {
    console.error('⚠️  Warning: Error parsing viral script:', (error as Error).message);
    // Provide fallback values
    result.script = scriptText;
    result.caption = scriptText.substring(0, Math.min(150, scriptText.length));
    result.hashtags = '#viral #shorts';
  }

  return result;
}

/**
 * Parse the generated script text into structured sections
 * @param scriptText - The raw script text from AI
 * @returns Parsed script object with sections
 */
export function parseScript(scriptText: string): Script {
  const sections: Script = {
    hook: '',
    content: '',
    cta: '',
    searchTerms: [],
    fullText: scriptText,
    narration: ''
  };

  try {
    // Extract HOOK section
    const hookMatch = scriptText.match(/HOOK:\s*\n([\s\S]*?)(?=\n\s*CONTENT:|$)/i);
    if (hookMatch) {
      sections.hook = hookMatch[1].trim();
    }

    // Extract CONTENT section
    const contentMatch = scriptText.match(/CONTENT:\s*\n([\s\S]*?)(?=\n\s*CTA:|$)/i);
    if (contentMatch) {
      sections.content = contentMatch[1].trim();
    }

    // Extract CTA section
    const ctaMatch = scriptText.match(/CTA:\s*\n([\s\S]*?)(?=\n\s*SEARCH_TERMS:|$)/i);
    if (ctaMatch) {
      sections.cta = ctaMatch[1].trim();
    }

    // Extract SEARCH_TERMS section
    const searchMatch = scriptText.match(/SEARCH_TERMS:\s*\n([\s\S]*?)$/i);
    if (searchMatch) {
      const terms = searchMatch[1].trim().split(',').map(term => term.trim()).filter(term => term.length > 0);
      sections.searchTerms = terms;
    }

    // Build narration text (hook + content + cta)
    sections.narration = [sections.hook, sections.content, sections.cta]
      .filter(s => s.length > 0)
      .join(' ');

  } catch (error) {
    console.error('⚠️  Warning: Error parsing script sections:', (error as Error).message);
    sections.narration = scriptText;
  }

  return sections;
}

/**
 * Load a saved script from file
 * @param scriptPath - Path to the script file
 * @returns The script object
 */
export async function loadScript(scriptPath: string): Promise<Script> {
  try {
    const script = await fs.readJson(scriptPath) as Script;
    console.log(`📖 Loaded script from: ${scriptPath}`);
    return script;
  } catch (error) {
    console.error('❌ Error loading script:', (error as Error).message);
    throw error;
  }
}

/**
 * List all saved scripts
 * @returns Array of script file paths
 */
export async function listScripts(): Promise<string[]> {
  try {
    const scriptsDir = path.join(process.cwd(), 'scripts');
    await fs.ensureDir(scriptsDir);
    
    const files = await fs.readdir(scriptsDir);
    const scriptFiles = files.filter(f => f.endsWith('.json'));
    
    console.log(`📚 Found ${scriptFiles.length} saved script(s)`);
    return scriptFiles.map(f => path.join(scriptsDir, f));
  } catch (error) {
    console.error('❌ Error listing scripts:', (error as Error).message);
    throw error;
  }
}
