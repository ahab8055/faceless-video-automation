/**
 * Type definitions for the faceless-video-automation project
 */

// Script-related types
export interface Script {
  hook: string;
  content: string;
  cta: string;
  searchTerms: string[];
  fullText: string;
  narration: string;
  niche?: string;
  generatedAt?: string;
}

// New script format for viral videos
export interface ViralScript {
  script: string;      // Full spoken text for the video
  caption: string;     // Short version for post description (under 150 chars)
  hashtags: string;    // 10 relevant hashtags
}

// Assets types
export interface Assets {
  videos: string[];
  audio: string[];
}

// Pexels API types
export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  image: string;
  video_files: PexelsVideoFile[];
  video_pictures: PexelsVideoPicture[];
}

export interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

export interface PexelsVideoPicture {
  id: number;
  picture: string;
  nr: number;
}

export interface PexelsSearchResponse {
  page: number;
  per_page: number;
  total_results: number;
  url: string;
  videos: PexelsVideo[];
}

// Pexels Photo API types
export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: PexelsPhotoSource;
  liked: boolean;
  alt: string;
}

export interface PexelsPhotoSource {
  original: string;
  large2x: string;
  large: string;
  medium: string;
  small: string;
  portrait: string;
  landscape: string;
  tiny: string;
}

export interface PexelsPhotoSearchResponse {
  page: number;
  per_page: number;
  total_results: number;
  photos: PexelsPhoto[];
}

// Asset metadata returned by downloadAssets
export interface AssetMetadata {
  id: number | string;
  type: 'video' | 'photo';
  path: string;
  url: string;
  width: number;
  height: number;
  aspectRatio: number;
  duration?: number; // Only for videos
  relevance?: number; // Relevance score
}

// Return type for downloadAssets function
export interface DownloadAssetsResult {
  assets: AssetMetadata[];
  timestamp: string;
  directory: string;
  query: string;
  extractedKeywords?: string[];
}

// FFmpeg types
export interface FFmpegMetadata {
  format?: {
    duration?: string;
    size?: string;
    bit_rate?: string;
  };
  streams?: Array<{
    codec_type?: string;
    duration?: string;
    width?: number;
    height?: number;
  }>;
}

export interface FFmpegProgress {
  frames?: number;
  currentFps?: number;
  currentKbps?: number;
  targetSize?: number;
  timemark?: string;
  percent?: number;
}

// Command options types
export interface GenerateCommandOptions {
  output?: string;
}

export interface RunCommandOptions {
  script: string;
  output?: string;
}

export interface BatchCommandOptions {
  count: number;
  output?: string;
}

// createShort function parameters
export interface CreateShortParams {
  script: string;
  caption: string;
  hashtags: string;
  assetPaths: string[];
  outputPath: string;
}

// Environment variables
export interface EnvironmentVariables {
  GOOGLE_API_KEY: string;
  PEXELS_API_KEY: string;
  MISTRAL_API_KEY: string;
}
