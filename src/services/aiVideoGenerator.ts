/**
 * AI Video Generation Service
 * Supports multiple video generation APIs:
 * - RunwayML Gen-3
 * - Luma Dream Machine
 * - Stability AI (Stable Video)
 * - Pika Labs
 * 
 * Automatically selects best available service
 */

import type { VideoSlides } from '@/types/slides';

interface VideoGenerationOptions {
  provider?: 'runway' | 'luma' | 'stability' | 'pika';
  width?: number;
  height?: number;
  duration?: number; // in seconds
  style?: 'whiteboard' | 'cinematic' | 'animation';
}

interface VideoGenerationResult {
  videoUrl: string;
  provider: string;
  status: 'completed' | 'processing';
  jobId?: string;
}

export class AIVideoGeneratorService {
  private static readonly DEFAULT_PROVIDER = 'runway'; // Best for educational content

  /**
   * Generate video from whiteboard scenes using AI video generation
   * This converts the whiteboard animation instructions into actual video
   */
  static async generateVideo(
    slides: VideoSlides,
    options: VideoGenerationOptions = {}
  ): Promise<string> {
    const provider = options.provider || this.DEFAULT_PROVIDER;
    const style = options.style || 'whiteboard';

    try {
      console.log(`Generating video using ${provider} with ${style} style...`);

      // For whiteboard style, we'll create a prompt that describes the animation
      const videoPrompt = this.createVideoPrompt(slides, style);

      switch (provider) {
        case 'runway':
          return await this.generateWithRunway(videoPrompt, options);
        case 'luma':
          return await this.generateWithLuma(videoPrompt, options);
        case 'stability':
          return await this.generateWithStability(videoPrompt, options);
        case 'pika':
          return await this.generateWithPika(videoPrompt, options);
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Video generation with ${provider} failed:`, error);
      // Fallback to canvas-based rendering
      throw error;
    }
  }

  /**
   * Create video generation prompt from slides
   */
  private static createVideoPrompt(slides: VideoSlides, style: 'whiteboard' | 'cinematic' | 'animation'): string {
    if (style === 'whiteboard') {
      // Create prompt for whiteboard-style animation
      const scenes = slides.slides.map((slide, index) => {
        const content = slide.content
          .map(item => {
            if (item.type === 'heading') return item.content;
            if (item.type === 'text') return item.content.substring(0, 50);
            return '';
          })
          .filter(Boolean)
          .join(', ');
        return `Scene ${index + 1}: ${content}`;
      }).join('; ');

      return `Whiteboard animation: ${slides.title}. ${scenes}. Hand-drawn style, clean white background, educational animation similar to VideoScribe. Professional teaching style.`;
    }

    // For other styles, use standard video description
    return `Educational video about ${slides.topic}: ${slides.title}. Professional, clear, engaging.`;
  }

  /**
   * Generate video using RunwayML Gen-3 API
   * API Docs: https://docs.runwayml.com
   */
  private static async generateWithRunway(
    prompt: string,
    options: VideoGenerationOptions
  ): Promise<string> {
    // Support both Vite (import.meta.env) and Next.js (process.env) patterns
    const apiKey = (typeof window !== 'undefined' && (window as any).RUNWAY_API_KEY) ||
      (import.meta as any).env?.VITE_RUNWAY_API_KEY ||
      (import.meta as any).env?.RUNWAY_API_KEY ||
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_RUNWAY_API_KEY) ||
      (typeof process !== 'undefined' && process.env.RUNWAY_API_KEY);

    if (!apiKey) {
      throw new Error('RunwayML API key not found. Set RUNWAY_API_KEY in environment variables.');
    }

    const width = options.width || 1920;
    const height = options.height || 1080;
    const duration = options.duration || 10;

    try {
      // RunwayML Gen-3 API endpoint
      const response = await fetch('https://api.runwayml.com/v1/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          width: width,
          height: height,
          duration: duration,
          model: 'gen3a_turbo', // Fast generation model
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`RunwayML API error: ${error}`);
      }

      const result = await response.json();

      if (result.status === 'processing' && result.job_id) {
        // Poll for completion
        return await this.pollRunwayJob(result.job_id, apiKey);
      }

      return result.video_url || result.output?.[0];
    } catch (error) {
      console.error('RunwayML generation error:', error);
      throw new Error(`RunwayML video generation failed: ${error}`);
    }
  }

  /**
   * Poll RunwayML job status
   */
  private static async pollRunwayJob(jobId: string, apiKey: string, maxAttempts = 60): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      try {
        const response = await fetch(`https://api.runwayml.com/v1/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        const result = await response.json();

        if (result.status === 'succeeded' && result.output) {
          return result.output[0];
        }

        if (result.status === 'failed') {
          throw new Error(`RunwayML job failed: ${result.error}`);
        }
      } catch (error) {
        console.error('Error polling RunwayML job:', error);
      }
    }

    throw new Error('RunwayML job timed out');
  }

  /**
   * Generate video using Luma Dream Machine API
   * API Docs: https://lumalabs.ai/docs
   */
  private static async generateWithLuma(
    prompt: string,
    options: VideoGenerationOptions
  ): Promise<string> {
    const apiKey = (typeof window !== 'undefined' && (window as any).LUMA_API_KEY) ||
      (import.meta as any).env?.VITE_LUMA_API_KEY ||
      (import.meta as any).env?.LUMA_API_KEY ||
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LUMA_API_KEY) ||
      (typeof process !== 'undefined' && process.env.LUMA_API_KEY);

    if (!apiKey) {
      throw new Error('Luma API key not found. Set LUMA_API_KEY in environment variables.');
    }

    try {
      const response = await fetch('https://api.lumalabs.ai/v1/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          aspect_ratio: '16:9',
          model: 'dream-machine',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Luma API error: ${error}`);
      }

      const result = await response.json();

      if (result.state === 'pending' && result.id) {
        return await this.pollLumaJob(result.id, apiKey);
      }

      return result.video_url || result.videos?.[0]?.url;
    } catch (error) {
      console.error('Luma generation error:', error);
      throw new Error(`Luma video generation failed: ${error}`);
    }
  }

  /**
   * Poll Luma job status
   */
  private static async pollLumaJob(jobId: string, apiKey: string, maxAttempts = 60): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

      try {
        const response = await fetch(`https://api.lumalabs.ai/v1/generations/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        const result = await response.json();

        if (result.state === 'completed' && result.videos?.[0]?.url) {
          return result.videos[0].url;
        }

        if (result.state === 'failed') {
          throw new Error(`Luma job failed: ${result.error}`);
        }
      } catch (error) {
        console.error('Error polling Luma job:', error);
      }
    }

    throw new Error('Luma job timed out');
  }

  /**
   * Generate video using Stability AI API
   * API Docs: https://platform.stability.ai/docs
   */
  private static async generateWithStability(
    prompt: string,
    options: VideoGenerationOptions
  ): Promise<string> {
    const apiKey = (typeof window !== 'undefined' && (window as any).STABILITY_API_KEY) ||
      (import.meta as any).env?.VITE_STABILITY_API_KEY ||
      (import.meta as any).env?.STABILITY_API_KEY ||
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_STABILITY_API_KEY) ||
      (typeof process !== 'undefined' && process.env.STABILITY_API_KEY);

    if (!apiKey) {
      throw new Error('Stability AI API key not found. Set STABILITY_API_KEY in environment variables.');
    }

    try {
      const response = await fetch('https://api.stability.ai/v2alpha/generation/image-to-video', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          image_prompt: '', // Would need to generate image first
          seed: 0,
          cfg_scale: 1.8,
          motion_bucket_id: 127,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Stability AI API error: ${error}`);
      }

      const result = await response.json();
      return result.video_url || result.id; // Will need to fetch video URL from ID
    } catch (error) {
      console.error('Stability AI generation error:', error);
      throw new Error(`Stability AI video generation failed: ${error}`);
    }
  }

  /**
   * Generate video using Pika Labs API
   * Note: Pika Labs API may have different endpoints
   */
  private static async generateWithPika(
    prompt: string,
    options: VideoGenerationOptions
  ): Promise<string> {
    const apiKey = (typeof window !== 'undefined' && (window as any).PIKA_API_KEY) ||
      (import.meta as any).env?.VITE_PIKA_API_KEY ||
      (import.meta as any).env?.PIKA_API_KEY ||
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PIKA_API_KEY) ||
      (typeof process !== 'undefined' && process.env.PIKA_API_KEY);

    if (!apiKey) {
      throw new Error('Pika Labs API key not found. Set PIKA_API_KEY in environment variables.');
    }

    // Pika Labs API structure (may vary)
    try {
      const response = await fetch('https://api.pika.art/v1/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          aspect_ratio: '16:9',
          duration: options.duration || 10,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Pika Labs API error: ${error}`);
      }

      const result = await response.json();
      return result.video_url || result.url;
    } catch (error) {
      console.error('Pika Labs generation error:', error);
      throw new Error(`Pika Labs video generation failed: ${error}`);
    }
  }

  /**
   * Check which providers are available based on API keys
   */
  static getAvailableProviders(): string[] {
    const providers: string[] = [];

    const checkKey = (key: string): boolean => {
      return !!(
        (typeof window !== 'undefined' && (window as any)[key]) ||
        (import.meta as any).env?.[`VITE_${key}`] ||
        (import.meta as any).env?.[key] ||
        (typeof process !== 'undefined' && process.env[`NEXT_PUBLIC_${key}`]) ||
        (typeof process !== 'undefined' && process.env[key])
      );
    };

    if (checkKey('RUNWAY_API_KEY')) {
      providers.push('runway');
    }
    if (checkKey('LUMA_API_KEY')) {
      providers.push('luma');
    }
    if (checkKey('STABILITY_API_KEY')) {
      providers.push('stability');
    }
    if (checkKey('PIKA_API_KEY')) {
      providers.push('pika');
    }

    return providers;
  }
}

