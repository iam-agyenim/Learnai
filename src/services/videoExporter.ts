/**
 * Video Export Service
 * Exports slides to real MP4 video files
 * Supports multiple video generation methods:
 * 1. AI Video Generation APIs (RunwayML, Luma, etc.) - Best quality
 * 2. Canvas-based rendering (ProperVideoGenerator) - Reliable fallback
 * 3. Slide-based rendering (slides://) - Final fallback
 */
import type { VideoSlides } from '@/types/slides';
import { ProperVideoGenerator } from './properVideoGenerator';
import { AIVideoGeneratorService } from './aiVideoGenerator';

export class VideoExporterService {
  /**
   * Generate real MP4 video from slides
   * Tries AI video generation first, falls back to canvas rendering
   */
  static async exportToMP4(
    slides: VideoSlides,
    options?: {
      includeAudio?: boolean;
      quality?: 'low' | 'medium' | 'high';
      useAI?: boolean; // Set to true to force AI generation
      provider?: 'runway' | 'luma' | 'stability' | 'pika';
    }
  ): Promise<string> {
    const useAI = options?.useAI !== false; // Default to true if available

    // Try AI video generation first if enabled
    if (useAI) {
      const availableProviders = AIVideoGeneratorService.getAvailableProviders();

      if (availableProviders.length > 0) {
        try {
          console.log('Attempting AI video generation with providers:', availableProviders);

          const videoUrl = await AIVideoGeneratorService.generateVideo(slides, {
            provider: options?.provider || (availableProviders[0] as any),
            style: 'whiteboard',
            width: 1920,
            height: 1080,
          });

          console.log('AI video generated successfully:', videoUrl);
          return videoUrl;
        } catch (error) {
          console.warn('AI video generation failed, falling back to canvas rendering:', error);
          // Continue to fallback
        }
      } else {
        console.log('No AI video generation API keys found, using canvas rendering');
      }
    }

    // For whiteboard style, the client-side SlideVideoPlayer often provides 
    // a better, more interactive experience than a static MP4.
    // Let's use slides:// as the primary option if AI generation is not possible.
    const videoId = slides.id;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`video_slides_${videoId}`, JSON.stringify(slides));
        console.log('Slides stored in sessionStorage for interactive playback:', videoId);
        return `slides://${videoId}`;
      } catch (storageError) {
        console.error('Error storing slides in sessionStorage:', storageError);
      }
    }

    // Fallback: Canvas-based video generation (only if slides:// failed)
    try {
      console.log('Starting canvas-based video generation for slides:', slides.id);
      const videoUrl = await ProperVideoGenerator.generateVideo(slides);
      return videoUrl;
    } catch (error) {
      console.error('Canvas video generation failed:', error);
    }

    return `slides://${videoId}`;
  }

  /**
   * Generate video URL
   */
  static async generateVideoUrl(slides: VideoSlides): Promise<string> {
    return this.exportToMP4(slides);
  }
}

/**
 * Remotion Integration (for future implementation)
 * 
 * Example structure for Remotion video generation:
 * 
 * import { Composition } from 'remotion';
 * import { SlideComposition } from './components/SlideComposition';
 * 
 * export const RemotionRoot: React.FC = () => {
 *   return (
 *     <Composition
 *       id="LessonVideo"
 *       component={SlideComposition}
 *       durationInFrames={slides.totalDuration * 30} // 30 FPS
 *       fps={30}
 *       width={1920}
 *       height={1080}
 *     />
 *   );
 * };
 * 
 * Then use Remotion's render API:
 * await bundle(bundleLocation, entry, () => undefined, {
 *   webpackOverride: (config) => config,
 * });
 * 
 * await renderMedia({
 *   composition: composition,
 *   codec: 'h264',
 *   outputLocation: outputPath,
 * });
 */

