/**
 * Proper Video Generator
 * Generates real video files using Canvas + MediaRecorder with proper frame rendering
 */
import type { VideoSlides, Slide } from '@/types/slides';

export class ProperVideoGenerator {
  private static readonly FPS = 30;
  private static readonly WIDTH = 1920;
  private static readonly HEIGHT = 1080;

  /**
   * Generate real video from slides
   */
  static async generateVideo(slides: VideoSlides): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = this.WIDTH;
        canvas.height = this.HEIGHT;
        const ctx = canvas.getContext('2d', { 
          alpha: false,
          desynchronized: true, // Better performance
          willReadFrequently: false
        });
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Find best video codec
        const mimeType = this.getBestMimeType();
        console.log('Using MIME type:', mimeType);

        // Create stream from canvas
        const stream = canvas.captureStream(this.FPS);
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: mimeType,
          videoBitsPerSecond: 8000000, // 8 Mbps for high quality
        });

        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
            console.log('Chunk received:', event.data.size, 'bytes');
          }
        };

        mediaRecorder.onstop = () => {
          console.log('Recording stopped, total chunks:', chunks.length);
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          console.log('Video URL created:', url);
          resolve(url);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.onerror = (event) => {
          console.error('MediaRecorder error:', event);
          reject(new Error('MediaRecorder error'));
        };

        // Start recording with timeslice for better reliability
        mediaRecorder.start(200); // Get data every 200ms

        // Render all frames
        this.renderAllFrames(ctx, slides, () => {
          // Wait a bit to ensure last frame is captured
          setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              console.log('Stopping recording...');
              mediaRecorder.stop();
            }
          }, 1000);
        });
      } catch (error) {
        console.error('Video generation error:', error);
        reject(error);
      }
    });
  }

  /**
   * Get best supported MIME type
   */
  private static getBestMimeType(): string {
    const codecs = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
      'video/x-matroska;codecs=avc1',
    ];

    for (const codec of codecs) {
      if (MediaRecorder.isTypeSupported(codec)) {
        return codec;
      }
    }

    return 'video/webm'; // Universal fallback
  }

  /**
   * Render all frames to canvas stream
   */
  private static async renderAllFrames(
    ctx: CanvasRenderingContext2D,
    slides: VideoSlides,
    onComplete: () => void
  ) {
    const totalFrames = Math.ceil(slides.metadata.totalDuration * this.FPS);
    const frameTime = 1000 / this.FPS;

    console.log(`Rendering ${totalFrames} frames at ${this.FPS} FPS`);

    // Pre-load all images first
    const imagePromises: Promise<void>[] = [];
    slides.slides.forEach(slide => {
      slide.content.forEach(content => {
        if (content.type === 'image' && content.imageUrl) {
          imagePromises.push(
            this.loadImage(content.imageUrl).catch(() => {
              // Ignore image load errors
            })
          );
        }
      });
    });
    await Promise.all(imagePromises);

    // Render frames synchronously for MediaRecorder
    let currentFrame = 0;
    const startTime = performance.now();

    const renderNextFrame = () => {
      if (currentFrame >= totalFrames) {
        console.log('All frames rendered');
        onComplete();
        return;
      }

      const elapsedTime = (currentFrame * frameTime) / 1000;
      
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

      // Render the frame synchronously
      this.renderFrameSync(ctx, currentSlide, slideElapsed * 1000);

      currentFrame++;

      // Calculate next frame time and schedule
      const nextFrameTime = (currentFrame * frameTime);
      const now = performance.now() - startTime;
      const delay = Math.max(0, nextFrameTime - now);

      if (delay > 0) {
        setTimeout(renderNextFrame, delay);
      } else {
        // If behind schedule, render immediately but log warning
        if (currentFrame % 30 === 0) {
          console.warn(`Rendering behind schedule by ${now - nextFrameTime}ms`);
        }
        requestAnimationFrame(renderNextFrame);
      }
    };

    // Start rendering immediately
    renderNextFrame();
  }

  /**
   * Render a single frame (synchronous version for MediaRecorder)
   */
  private static renderFrameSync(
    ctx: CanvasRenderingContext2D,
    slide: Slide,
    elapsedTime: number
  ): void {
    // Clear and draw background (whiteboard style - white by default)
    if (slide.background?.gradient) {
      const gradient = ctx.createLinearGradient(0, 0, this.WIDTH, this.HEIGHT);
      slide.background.gradient.forEach((color, index) => {
        gradient.addColorStop(index / (slide.background.gradient!.length - 1), color);
      });
      ctx.fillStyle = gradient;
    } else {
      // White background for whiteboard style, or use specified color
      ctx.fillStyle = slide.background?.color || '#ffffff';
    }
    ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

    // Draw all content items synchronously
    for (let i = 0; i < slide.content.length; i++) {
      const content = slide.content[i];
      this.drawContentSync(ctx, content, elapsedTime, i);
    }
  }

  /**
   * Draw a content item on the canvas (synchronous version)
   */
  private static drawContentSync(
    ctx: CanvasRenderingContext2D,
    content: any,
    currentTime: number,
    index: number
  ): void {
    const style = content.style || {};
    
    // Handle images (use cached images only)
    if (content.type === 'image' && content.imageUrl) {
      const img = this.imageCache.get(content.imageUrl);
      if (img && img.complete) {
        const imgX = this.parsePosition(style.x, this.WIDTH, this.WIDTH * 0.5);
        const imgY = this.parsePosition(style.y, this.HEIGHT, this.HEIGHT * 0.5);
        const imgWidth = this.parseSize(style.width, this.WIDTH, this.WIDTH * 0.4);
        const imgHeight = this.parseSize(style.height, this.HEIGHT, imgWidth);
        
        const animProgress = this.getAnimationProgress(content.animation, currentTime);
        ctx.globalAlpha = animProgress;
        
        ctx.drawImage(
          img,
          imgX - imgWidth / 2,
          imgY - imgHeight / 2,
          imgWidth,
          imgHeight
        );
        ctx.globalAlpha = 1;
      }
      return;
    }

    // Handle icons (whiteboard style - darker colors)
    if (content.type === 'icon' && content.iconName) {
      const iconX = this.parsePosition(style.x, this.WIDTH, this.WIDTH * 0.2 + index * this.WIDTH * 0.15);
      const iconY = this.parsePosition(style.y, this.HEIGHT, this.HEIGHT * 0.3);
      const iconSize = typeof style.width === 'number' ? style.width : this.WIDTH * 0.1;
      // Use dark color for whiteboard, or specified color
      const iconColor = style.color || '#1a1a1a';
      
      const animProgress = this.getAnimationProgress(content.animation, currentTime);
      ctx.globalAlpha = animProgress;
      this.drawIcon(ctx, content.iconName, iconX, iconY, iconSize, iconColor);
      ctx.globalAlpha = 1;
      return;
    }

    // Text content (whiteboard style - dark text on white background)
    const fontSize = parseFloat(style.fontSize?.replace('rem', '') || '1.5') * 60;
    const fontWeight = style.fontWeight || 'normal';
    // Default to dark text for whiteboard style, or use specified color
    const color = style.color || (content.type === 'heading' ? '#1a1a1a' : '#333333');
    const textAlign = style.textAlign || 'center';

    ctx.fillStyle = color;
    ctx.font = `${fontWeight} ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.textAlign = textAlign as CanvasTextAlign;
    ctx.textBaseline = 'top';

    // Calculate position
    const padding = this.WIDTH * 0.1;
    let x = this.WIDTH / 2;
    if (textAlign === 'left') x = padding;
    if (textAlign === 'right') x = this.WIDTH - padding;

    let y = this.HEIGHT * 0.15;
    if (content.type === 'heading') {
      y = this.HEIGHT * 0.12;
    } else if (content.type === 'text' || content.type === 'bullet') {
      y = this.HEIGHT * 0.25 + (index * fontSize * 1.8);
    }

    // Apply animation
    const animation = content.animation;
    let drawProgress = 1;
    
    if (animation) {
      drawProgress = this.getAnimationProgress(animation, currentTime);
      
      if (animation.type === 'slide') {
        y += (1 - drawProgress) * 50;
      }
      
      ctx.globalAlpha = drawProgress;
    }

    // Draw text with wrapping
    const maxWidth = this.WIDTH - (padding * 2);
    const lineHeight = fontSize * 1.3;
    const text = content.type === 'bullet' ? `• ${content.content}` : content.content;

    if (animation?.type === 'draw') {
      // Typewriter effect
      const charsToShow = Math.floor(text.length * drawProgress);
      const partialText = text.substring(0, charsToShow);
      this.wrapAndDrawText(ctx, partialText, x, y, maxWidth, lineHeight, textAlign);
    } else if (content.type === 'code') {
      // Code block (whiteboard style - light gray background)
      this.drawCodeBlock(ctx, content.content, x, y, maxWidth, fontSize, color);
    } else {
      this.wrapAndDrawText(ctx, text, x, y, maxWidth, lineHeight, textAlign);
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Parse position value (percentage string or number)
   */
  private static parsePosition(value: any, max: number, defaultValue: number): number {
    if (value === undefined) return defaultValue;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const percent = parseFloat(value.replace('%', ''));
      if (!isNaN(percent)) return (percent / 100) * max;
    }
    return defaultValue;
  }

  /**
   * Parse size value
   */
  private static parseSize(value: any, max: number, defaultValue: number): number {
    return this.parsePosition(value, max, defaultValue);
  }

  /**
   * Get animation progress (0-1)
   */
  private static getAnimationProgress(animation: any, currentTime: number): number {
    if (!animation) return 1;
    
    const delay = animation.delay || 0;
    const duration = animation.duration || 1000;
    const animTime = currentTime - delay;
    
    if (animTime < 0) return 0;
    return Math.min(animTime / duration, 1);
  }

  /**
   * Wrap and draw text
   */
  private static wrapAndDrawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    textAlign: string
  ) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && line !== '') {
        // Draw current line
        this.drawTextLine(ctx, line.trim(), x, currentY, textAlign);
        line = word + ' ';
        currentY += lineHeight;
        
        // Prevent overflow
        if (currentY > this.HEIGHT * 0.9) break;
      } else {
        line = testLine;
      }
    }
    
    // Draw last line
    if (line.trim() && currentY <= this.HEIGHT * 0.9) {
      this.drawTextLine(ctx, line.trim(), x, currentY, textAlign);
    }
  }

  /**
   * Draw a single text line with alignment
   */
  private static drawTextLine(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    textAlign: string
  ) {
    if (textAlign === 'center') {
      const metrics = ctx.measureText(text);
      ctx.fillText(text, x - metrics.width / 2, y);
    } else if (textAlign === 'right') {
      const metrics = ctx.measureText(text);
      ctx.fillText(text, x - metrics.width, y);
    } else {
      ctx.fillText(text, x, y);
    }
  }

  /**
   * Draw code block
   */
  private static drawCodeBlock(
    ctx: CanvasRenderingContext2D,
    code: string,
    centerX: number,
    y: number,
    maxWidth: number,
    fontSize: number,
    color: string
  ) {
    const lines = code.split('\n').slice(0, 15); // Limit lines
    const padding = 40;
    const lineHeight = fontSize * 1.1;
    const codeWidth = Math.min(maxWidth * 0.9, this.WIDTH * 0.8);
      const codeHeight = Math.min(lines.length * lineHeight + padding * 2, this.HEIGHT * 0.6);
      const codeX = centerX;
      const codeY = Math.min(y, this.HEIGHT * 0.4);

      // Background (light gray for whiteboard style)
      ctx.fillStyle = '#f5f5f5';
      ctx.strokeStyle = '#d0d0d0';
      ctx.lineWidth = 2;
      ctx.fillRect(codeX - codeWidth / 2, codeY, codeWidth, codeHeight);
      ctx.strokeRect(codeX - codeWidth / 2, codeY, codeWidth, codeHeight);

    // Code text
    ctx.fillStyle = color;
    ctx.font = `${fontSize * 0.65}px 'Courier New', monospace`;
    ctx.textAlign = 'left';
    
    lines.forEach((line, i) => {
      const maxLineWidth = codeWidth - padding * 2;
      let displayLine = line;
      const metrics = ctx.measureText(line);
      
      if (metrics.width > maxLineWidth) {
        while (ctx.measureText(displayLine + '...').width > maxLineWidth && displayLine.length > 0) {
          displayLine = displayLine.slice(0, -1);
        }
        displayLine += '...';
      }
      
      ctx.fillText(
        displayLine,
        codeX - codeWidth / 2 + padding,
        codeY + padding + (i * lineHeight)
      );
    });
  }

  /**
   * Load image with caching
   */
  private static imageCache = new Map<string, HTMLImageElement>();
  
  private static async loadImage(url: string): Promise<HTMLImageElement> {
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)!;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.imageCache.set(url, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * Draw icon (simplified icon drawing)
   */
  private static drawIcon(
    ctx: CanvasRenderingContext2D,
    iconName: string,
    x: number,
    y: number,
    size: number,
    color: string
  ) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.1;

    // Simple icon shapes
    switch (iconName.toLowerCase()) {
      case 'lightbulb':
        ctx.beginPath();
        ctx.arc(x, y - size * 0.2, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'code':
        ctx.beginPath();
        ctx.moveTo(x - size * 0.3, y - size * 0.2);
        ctx.lineTo(x - size * 0.4, y);
        ctx.lineTo(x - size * 0.3, y + size * 0.2);
        ctx.moveTo(x + size * 0.3, y - size * 0.2);
        ctx.lineTo(x + size * 0.4, y);
        ctx.lineTo(x + size * 0.3, y + size * 0.2);
        ctx.stroke();
        break;
      default:
        ctx.beginPath();
        ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
  }
}

