import type { VideoSlides, Slide } from '@/types/slides';

/**
 * Browser-based Video Generator
 * Generates MP4 videos using Canvas and MediaRecorder API
 */
export class BrowserVideoGenerator {
  private static readonly FPS = 30;
  private static readonly WIDTH = 1920;
  private static readonly HEIGHT = 1080;

  /**
   * Generate video from slides using Canvas and MediaRecorder
   */
  static async generateVideo(slides: VideoSlides): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = this.WIDTH;
        canvas.height = this.HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Create MediaRecorder
        const stream = canvas.captureStream(this.FPS);
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 2500000, // 2.5 Mbps
        });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          resolve(url);
        };

        mediaRecorder.onerror = (error) => {
          reject(error);
        };

        // Start recording
        mediaRecorder.start();

        // Render slides
        this.renderSlides(ctx, slides, () => {
          setTimeout(() => {
            mediaRecorder.stop();
            stream.getTracks().forEach(track => track.stop());
          }, 500);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private static async renderSlides(
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

      // Calculate current slide and time
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
      this.renderSlide(ctx, currentSlide, slideElapsed * 1000);

      currentFrame++;
      setTimeout(renderFrame, frameDuration);
    };

    renderFrame();
  }

  private static renderSlide(
    ctx: CanvasRenderingContext2D,
    slide: Slide,
    elapsedTime: number
  ) {
    // Clear canvas
    ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

    // Draw background
    if (slide.background?.gradient) {
      const gradient = ctx.createLinearGradient(0, 0, this.WIDTH, this.HEIGHT);
      slide.background.gradient.forEach((color, index) => {
        gradient.addColorStop(index / (slide.background.gradient!.length - 1), color);
      });
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = slide.background?.color || '#1a1a1a';
    }
    ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

    // Draw content
    slide.content.forEach((contentItem, index) => {
      this.drawContent(ctx, contentItem, elapsedTime * 1000, index);
    });
  }

  private static drawContent(
    ctx: CanvasRenderingContext2D,
    content: any,
    currentTime: number,
    index: number
  ) {
    const style = content.style || {};
    const fontSize = parseFloat(style.fontSize?.replace('rem', '') || '1') * 48; // Scale up for HD
    const fontWeight = style.fontWeight || 'normal';
    const color = style.color || '#ffffff';
    const textAlign = style.textAlign || 'left';

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
      y = this.HEIGHT * 0.3;
    } else if (content.type === 'text' || content.type === 'bullet') {
      y = this.HEIGHT * 0.5 + (index * fontSize * 1.5);
    }

    // Apply animation
    const animation = content.animation;
    if (animation) {
      const animProgress = Math.min(currentTime / (animation.duration || 1000), 1);
      const delay = animation.delay || 0;
      
      if (currentTime < delay) return;

      switch (animation.type) {
        case 'fade':
          ctx.globalAlpha = animProgress;
          break;
        case 'slide':
          y += (1 - animProgress) * 100;
          break;
        case 'zoom':
          ctx.scale(0.5 + animProgress * 0.5, 0.5 + animProgress * 0.5);
          break;
        case 'typewriter':
          const fullText = content.content;
          const charsToShow = Math.floor(fullText.length * animProgress);
          const text = fullText.substring(0, charsToShow);
          ctx.fillText(text, x, y);
          ctx.globalAlpha = 1;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          return;
      }
    }

    // Draw text
    if (content.type === 'bullet') {
      ctx.fillText(`• ${content.content}`, x, y);
    } else if (content.type === 'code') {
      // Draw code with background
      const lines = content.content.split('\n');
      const padding = 40;
      const lineHeight = fontSize * 1.4;
      const codeWidth = this.WIDTH * 0.8;
      const codeHeight = lines.length * lineHeight + padding * 2;

      // Background
      ctx.fillStyle = '#2d2d2d';
      ctx.fillRect(x - codeWidth / 2, y - codeHeight / 2, codeWidth, codeHeight);

      // Code text
      ctx.fillStyle = color;
      ctx.font = `${fontSize * 0.8}px 'Courier New', monospace`;
      lines.forEach((line, i) => {
        ctx.fillText(line, x - codeWidth / 2 + padding, y - codeHeight / 2 + padding + (i + 1) * lineHeight);
      });
    } else {
      ctx.fillText(content.content, x, y);
    }

    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

