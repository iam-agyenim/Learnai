import { useEffect, useRef } from 'react';
import type { Slide, SlideContent } from '@/types/slides';

interface SlideRendererProps {
  slide: Slide;
  width: number;
  height: number;
  currentTime: number;
}

export function SlideRenderer({ slide, width, height, currentTime }: SlideRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    if (slide.background?.gradient) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      slide.background.gradient.forEach((color, index) => {
        gradient.addColorStop(index / (slide.background.gradient!.length - 1), color);
      });
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = slide.background?.color || '#1a1a1a';
    }
    ctx.fillRect(0, 0, width, height);

    // Draw content
    slide.content.forEach((contentItem, index) => {
      drawContent(ctx, contentItem, width, height, currentTime, index);
    });
  }, [slide, width, height, currentTime]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'none' }} />;
}

function drawContent(
  ctx: CanvasRenderingContext2D,
  content: SlideContent,
  width: number,
  height: number,
  currentTime: number,
  index: number
) {
  const style = content.style || {};
  const fontSize = parseFloat(style.fontSize?.replace('rem', '') || '1') * 16;
  const fontWeight = style.fontWeight || 'normal';
  const color = style.color || '#ffffff';
  const textAlign = style.textAlign || 'left';

  ctx.fillStyle = color;
  ctx.font = `${fontWeight} ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.textAlign = textAlign as CanvasTextAlign;
  ctx.textBaseline = 'middle';

  // Calculate position
  let x = width / 2;
  if (textAlign === 'left') x = width * 0.1;
  if (textAlign === 'right') x = width * 0.9;

  let y = height / 2;
  if (content.type === 'heading') {
    y = height * 0.3;
  } else if (content.type === 'text' || content.type === 'bullet') {
    y = height * 0.5 + (index * fontSize * 1.5);
  }

  // Apply animation
  const animation = content.animation;
  if (animation) {
    const animProgress = Math.min(currentTime / (animation.duration || 1000), 1);
    const delay = (animation.delay || 0) / 1000;
    
    if (currentTime < delay) return;

    switch (animation.type) {
      case 'fade':
        ctx.globalAlpha = animProgress;
        break;
      case 'slide':
        y += (1 - animProgress) * 50;
        break;
      case 'zoom':
        ctx.scale(0.5 + animProgress * 0.5, 0.5 + animProgress * 0.5);
        break;
      case 'typewriter':
        // For typewriter, show partial text
        const fullText = content.content;
        const charsToShow = Math.floor(fullText.length * animProgress);
        const text = fullText.substring(0, charsToShow);
        ctx.fillText(text, x, y);
        return;
    }
  }

  // Draw text
  if (content.type === 'bullet') {
    ctx.fillText(`• ${content.content}`, x, y);
  } else if (content.type === 'code') {
    // Draw code with background
    const lines = content.content.split('\n');
    const padding = 20;
    const lineHeight = fontSize * 1.4;
    const codeWidth = width * 0.8;
    const codeHeight = lines.length * lineHeight + padding * 2;

    // Background
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(x - codeWidth / 2, y - codeHeight / 2, codeWidth, codeHeight);

    // Code text
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px 'Courier New', monospace`;
    lines.forEach((line, i) => {
      ctx.fillText(line, x - codeWidth / 2 + padding, y - codeHeight / 2 + padding + (i + 1) * lineHeight);
    });
  } else {
    ctx.fillText(content.content, x, y);
  }

  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
}


