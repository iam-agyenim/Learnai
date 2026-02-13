/**
 * Real Video Generator using FFmpeg.wasm
 * Generates actual MP4 video files from slides with smooth animations
 */
import type { VideoSlides, Slide } from '@/types/slides';

interface FFmpeg {
  load: () => Promise<void>;
  writeFile: (name: string, data: Uint8Array) => Promise<void>;
  exec: (args: string[]) => Promise<void>;
  readFile: (name: string) => Promise<Uint8Array>;
  FS: (action: string, ...args: any[]) => any;
  exit: () => Promise<void>;
}

export class RealVideoGenerator {
  private static readonly FPS = 30;
  private static readonly WIDTH = 1920;
  private static readonly HEIGHT = 1080;
  private static ffmpegInstance: FFmpeg | null = null;
  private static isLoading = false;
  private static loadPromise: Promise<void> | null = null;

  /**
   * Load FFmpeg.wasm from CDN
   */
  private static async loadFFmpeg(): Promise<FFmpeg> {
    if (this.ffmpegInstance) {
      return this.ffmpegInstance;
    }

    if (this.loadPromise) {
      await this.loadPromise;
      return this.ffmpegInstance!;
    }

    this.isLoading = true;
    this.loadPromise = (async () => {
      try {
        // Dynamically import FFmpeg.wasm
        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

        const ffmpeg = new FFmpeg();
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

        // Load FFmpeg core
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        this.ffmpegInstance = ffmpeg as unknown as FFmpeg;
        this.isLoading = false;
      } catch (error) {
        console.error('Failed to load FFmpeg:', error);
        // Fallback: use MediaRecorder if FFmpeg fails
        this.isLoading = false;
        throw error;
      }
    })();

    await this.loadPromise;
    return this.ffmpegInstance!;
  }

  /**
   * Generate real MP4 video from slides
   */
  static async generateVideo(slides: VideoSlides): Promise<string> {
    try {
      // Try FFmpeg first
      return await this.generateVideoWithFFmpeg(slides);
    } catch (error) {
      console.warn('FFmpeg generation failed, falling back to MediaRecorder:', error);
      // Fallback to improved MediaRecorder
      return await this.generateVideoWithMediaRecorder(slides);
    }
  }

  /**
   * Generate video using FFmpeg.wasm (produces real MP4)
   */
  private static async generateVideoWithFFmpeg(slides: VideoSlides): Promise<string> {
    const ffmpeg = await this.loadFFmpeg();
    
    // Render all frames to canvas and collect as image data
    const frames: Uint8Array[] = [];
    const totalFrames = Math.ceil(slides.metadata.totalDuration * this.FPS);
    const frameDuration = 1000 / this.FPS;

    // Create offscreen canvas for rendering
    const canvas = new OffscreenCanvas(this.WIDTH, this.HEIGHT);
    const ctx = canvas.getContext('2d')!;

    // Render all frames
    for (let frame = 0; frame < totalFrames; frame++) {
      const elapsedTime = (frame * frameDuration) / 1000;
      
      // Find current slide
      let slideIndex = 0;
      let slideTime = 0;
      for (let i = 0; i < slides.slides.length; i++) {
        if (elapsedTime < slideTime + slides.slides[i].duration) {
          slideIndex = i;
          break;
        }
        slideTime += slides.slides[i].duration;
      }

      const currentSlide = slides.slides[slideIndex] || slides.slides[slides.slides.length - 1];
      const slideElapsed = elapsedTime - slideTime;

      // Render frame
      this.renderSlideFrame(ctx, currentSlide, slideElapsed * 1000);

      // Convert canvas to image data
      const imageData = ctx.getImageData(0, 0, this.WIDTH, this.HEIGHT);
      const pngData = await this.canvasToPNG(canvas);
      frames.push(new Uint8Array(pngData));
    }

    // Write frames as image files
    for (let i = 0; i < frames.length; i++) {
      await ffmpeg.writeFile(`frame${i.toString().padStart(6, '0')}.png`, frames[i]);
    }

    // Create FFmpeg command to encode video
    const outputFileName = `output_${slides.id}.mp4`;
    await ffmpeg.exec([
      '-framerate', String(this.FPS),
      '-i', 'frame%06d.png',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', '23',
      '-preset', 'medium',
      '-movflags', '+faststart',
      outputFileName
    ]);

    // Read the output video
    const videoData = await ffmpeg.readFile(outputFileName);
    
    // Clean up frames
    for (let i = 0; i < frames.length; i++) {
      try {
        ffmpeg.FS('unlink', `frame${i.toString().padStart(6, '0')}.png`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    try {
      ffmpeg.FS('unlink', outputFileName);
    } catch (e) {
      // Ignore
    }

    // Create blob URL
    const blob = new Blob([videoData.buffer], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  }

  /**
   * Generate video using MediaRecorder (fallback, produces WebM)
   */
  private static async generateVideoWithMediaRecorder(slides: VideoSlides): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = this.WIDTH;
        canvas.height = this.HEIGHT;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Create MediaRecorder with better settings
        const stream = canvas.captureStream(this.FPS);
        const options: MediaRecorderOptions = {
          mimeType: this.getSupportedMimeType(),
          videoBitsPerSecond: 5000000, // 5 Mbps for better quality
        };

        const mediaRecorder = new MediaRecorder(stream, options);
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: options.mimeType || 'video/webm' });
          const url = URL.createObjectURL(blob);
          resolve(url);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.onerror = (event) => {
          reject(new Error('MediaRecorder error'));
        };

        // Start recording
        mediaRecorder.start(100); // Collect data every 100ms

        // Render slides frame by frame
        this.renderSlidesToStream(ctx, slides, () => {
          setTimeout(() => {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
          }, 500);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get supported MIME type for MediaRecorder
   */
  private static getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm'; // Fallback
  }

  /**
   * Render slides to MediaRecorder stream
   */
  private static async renderSlidesToStream(
    ctx: CanvasRenderingContext2D,
    slides: VideoSlides,
    onComplete: () => void
  ) {
    const frameDuration = 1000 / this.FPS;
    const totalFrames = Math.ceil(slides.metadata.totalDuration * this.FPS);
    let currentFrame = 0;

    const renderFrame = () => {
      if (currentFrame >= totalFrames) {
        onComplete();
        return;
      }

      const elapsedTime = (currentFrame * frameDuration) / 1000;
      let slideIndex = 0;
      let slideTime = 0;

      for (let i = 0; i < slides.slides.length; i++) {
        if (elapsedTime < slideTime + slides.slides[i].duration) {
          slideIndex = i;
          break;
        }
        slideTime += slides.slides[i].duration;
      }

      const currentSlide = slides.slides[slideIndex] || slides.slides[slides.slides.length - 1];
      const slideElapsed = elapsedTime - slideTime;

      // Render slide
      this.renderSlideFrame(ctx, currentSlide, slideElapsed * 1000);

      currentFrame++;
      setTimeout(renderFrame, frameDuration);
    };

    renderFrame();
  }

  /**
   * Render a single slide frame
   */
  private static renderSlideFrame(
    ctx: CanvasRenderingContext2D,
    slide: Slide,
    elapsedTime: number
  ) {
    // Clear canvas
    ctx.fillStyle = slide.background?.color || '#1a1a1a';
    if (slide.background?.gradient) {
      const gradient = ctx.createLinearGradient(0, 0, this.WIDTH, this.HEIGHT);
      slide.background.gradient.forEach((color, index) => {
        gradient.addColorStop(index / (slide.background.gradient!.length - 1), color);
      });
      ctx.fillStyle = gradient;
    }
    ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

    // Draw content
    slide.content.forEach((contentItem, index) => {
      this.drawContentFrame(ctx, contentItem, elapsedTime, index);
    });
  }

  /**
   * Draw content item on frame
   */
  private static drawContentFrame(
    ctx: CanvasRenderingContext2D,
    content: any,
    currentTime: number,
    index: number
  ) {
    const style = content.style || {};
    const fontSize = parseFloat(style.fontSize?.replace('rem', '') || '1.5') * 60;
    const fontWeight = style.fontWeight || 'normal';
    const color = style.color || '#ffffff';
    const textAlign = style.textAlign || 'center';

    ctx.fillStyle = color;
    ctx.font = `${fontWeight} ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.textAlign = textAlign as CanvasTextAlign;
    ctx.textBaseline = 'middle';

    // Calculate position
    let x = this.WIDTH / 2;
    if (textAlign === 'left') x = this.WIDTH * 0.1;
    if (textAlign === 'right') x = this.WIDTH * 0.9;

    let y = this.HEIGHT / 2;
    if (content.type === 'heading') {
      y = this.HEIGHT * 0.2;
    } else if (content.type === 'text' || content.type === 'bullet') {
      y = this.HEIGHT * 0.4 + (index * fontSize * 1.8);
    }

    // Apply animation
    const animation = content.animation;
    if (animation) {
      const animDuration = animation.duration || 1000;
      const delay = animation.delay || 0;
      const animTime = currentTime - delay;
      
      if (animTime < 0) {
        ctx.globalAlpha = 0;
      } else {
        const progress = Math.min(animTime / animDuration, 1);

        switch (animation.type) {
          case 'fade':
            ctx.globalAlpha = progress;
            break;
          case 'slide':
            y += (1 - progress) * 100;
            ctx.globalAlpha = progress;
            break;
          case 'draw':
            // Typewriter effect
            const fullText = content.content;
            const charsToShow = Math.floor(fullText.length * progress);
            const text = fullText.substring(0, charsToShow);
            if (content.type === 'bullet') {
              ctx.fillText(`• ${text}`, x, y);
            } else {
              ctx.fillText(text, x, y);
            }
            ctx.globalAlpha = 1;
            return;
        }
      }
    } else {
      ctx.globalAlpha = 1;
    }

    // Draw content
    if (content.type === 'bullet') {
      ctx.fillText(`• ${content.content}`, x, y);
    } else if (content.type === 'code') {
      // Code block rendering
      const lines = content.content.split('\n').slice(0, 10); // Limit lines
      const padding = 60;
      const lineHeight = fontSize * 1.2;
      const codeWidth = this.WIDTH * 0.8;
      const codeHeight = Math.min(lines.length * lineHeight + padding * 2, this.HEIGHT * 0.6);

      // Background
      ctx.fillStyle = '#2d2d2d';
      ctx.fillRect(x - codeWidth / 2, y - codeHeight / 2, codeWidth, codeHeight);

      // Code text
      ctx.fillStyle = color;
      ctx.font = `${fontSize * 0.7}px 'Courier New', monospace`;
      ctx.textAlign = 'left';
      lines.forEach((line, i) => {
        const maxWidth = codeWidth - padding * 2;
        let displayLine = line;
        const metrics = ctx.measureText(line);
        if (metrics.width > maxWidth) {
          while (ctx.measureText(displayLine + '...').width > maxWidth && displayLine.length > 0) {
            displayLine = displayLine.slice(0, -1);
          }
          displayLine += '...';
        }
        ctx.fillText(
          displayLine,
          x - codeWidth / 2 + padding,
          y - codeHeight / 2 + padding + (i + 0.5) * lineHeight
        );
      });
    } else {
      ctx.fillText(content.content, x, y);
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Convert canvas to PNG blob
   */
  private static async canvasToPNG(canvas: OffscreenCanvas): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.convertToBlob({ type: 'image/png' })
        .then(blob => {
          blob.arrayBuffer()
            .then(buffer => resolve(new Blob([buffer])))
            .catch(reject);
        })
        .catch(reject);
    });
  }
}

