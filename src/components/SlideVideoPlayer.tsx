import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TTSService } from '@/services/ttsService';
import type { VideoSlides, Slide } from '@/types/slides';
import { renderWhiteboardSlide } from './whiteboardRenderUtils';

interface SlideVideoPlayerProps {
  slidesId: string;
  title?: string;
}

export function SlideVideoPlayer({ slidesId, title }: SlideVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [slides, setSlides] = useState<VideoSlides | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const currentVoiceRef = useRef<string | null>(null);

  // Load slides
  useEffect(() => {
    if (typeof window !== 'undefined' && slidesId) {
      const stored = sessionStorage.getItem(`video_slides_${slidesId}`);
      if (stored) {
        try {
          const parsedSlides = JSON.parse(stored);
          console.log('Loaded slides from sessionStorage:', parsedSlides);
          setSlides(parsedSlides);
        } catch (error) {
          console.error('Error loading slides:', error);
          // Show error message
          setSlides(null);
        }
      } else {
        console.warn('No slides found in sessionStorage for ID:', slidesId);
        // Try to find any slides in storage (fallback)
        const allKeys = Object.keys(sessionStorage);
        const slideKeys = allKeys.filter(key => key.startsWith('video_slides_'));
        if (slideKeys.length > 0) {
          const lastKey = slideKeys[slideKeys.length - 1];
          const stored = sessionStorage.getItem(lastKey);
          if (stored) {
            try {
              const parsedSlides = JSON.parse(stored);
              console.log('Using fallback slides from:', lastKey);
              setSlides(parsedSlides);
            } catch (error) {
              console.error('Error loading fallback slides:', error);
            }
          }
        }
      }
    }
  }, [slidesId]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !slides || !canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      if (!canvas || !ctx || !slides) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Ensure canvas has proper dimensions
      if (canvas.width === 0 || canvas.height === 0) {
        const container = canvas.parentElement;
        if (container) {
          const rect = container.getBoundingClientRect();
          canvas.width = rect.width || 1920;
          canvas.height = rect.height || 1080;
        } else {
          canvas.width = 1920;
          canvas.height = 1080;
        }
      }

      const now = Date.now();
      if (!startTimeRef.current) {
        startTimeRef.current = now - currentTime * 1000;
      }

      const elapsed = (now - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);

      // Find current slide
      let slideTime = 0;
      let slideIndex = 0;
      for (let i = 0; i < slides.slides.length; i++) {
        if (elapsed < slideTime + slides.slides[i].duration) {
          slideIndex = i;
          break;
        }
        slideTime += slides.slides[i].duration;
        slideIndex = i;
      }

      if (slideIndex !== currentSlideIndex) {
        setCurrentSlideIndex(slideIndex);
      }

      // Check if video is complete
      if (elapsed >= slides.metadata.totalDuration) {
        setIsPlaying(false);
        setCurrentTime(0);
        startTimeRef.current = 0;
        TTSService.stop(); // Stop narration when video ends
        currentVoiceRef.current = null;
        return;
      }

      const currentSlide = slides.slides[slideIndex];
      const slideElapsed = elapsed - slideTime;

      // Render slide (check if it has whiteboard scene data)
      try {
        const whiteboardScene = (currentSlide as any).metadata?.whiteboardScene;
        // Also check metadata.whiteboardScenes array from VideoSlides
        const slidesMetadata = (slides as any).metadata;
        const whiteboardScenes = slidesMetadata?.whiteboardScenes;
        const sceneFromArray = whiteboardScenes?.[slideIndex];

        const sceneToRender = whiteboardScene || sceneFromArray;

        if (sceneToRender && sceneToRender.actions && Array.isArray(sceneToRender.actions) && sceneToRender.actions.length > 0) {
          // Use whiteboard renderer for VideoScribe-style animation
          renderWhiteboardSlide(ctx, sceneToRender, slideElapsed, canvas.width, canvas.height);
        } else {
          // Fallback to regular slide rendering
          renderSlide(ctx, currentSlide, slideElapsed, canvas.width, canvas.height);
        }
      } catch (error) {
        console.error('Error in render logic:', error);
        // Always fallback to regular rendering on error
        try {
          renderSlide(ctx, currentSlide, slideElapsed, canvas.width, canvas.height);
        } catch (fallbackError) {
          console.error('Fallback render also failed:', fallbackError);
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, slides, currentTime, currentSlideIndex]);

  // Preload images when slides load
  useEffect(() => {
    if (!slides) return;

    // Preload all images from slides
    slides.slides.forEach(slide => {
      slide.content.forEach(content => {
        if (content.type === 'image' && content.imageUrl) {
          loadImage(content.imageUrl).catch(() => { });
        }
      });
    });
  }, [slides]);

  // Initial render and canvas setup
  useEffect(() => {
    if (!slides || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on container
    const updateCanvasSize = () => {
      const containerWidth = container.offsetWidth || window.innerWidth;
      const containerHeight = container.offsetHeight || window.innerHeight;
      const aspectRatio = 16 / 9;

      // Always maintain aspect ratio and fit within container
      let width = containerWidth;
      let height = containerWidth / aspectRatio;

      if (height > containerHeight) {
        height = containerHeight;
        width = containerHeight * aspectRatio;
      }

      // Internal resolution (HD)
      canvas.width = 1920;
      canvas.height = 1080;

      // Display size (fits container)
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = '100%';
      canvas.style.objectFit = 'contain';
      canvas.style.display = 'block';
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Render first slide
    if (slides.slides.length > 0) {
      const firstSlide = slides.slides[0];
      try {
        const whiteboardScene = (firstSlide as any).metadata?.whiteboardScene;
        const slidesMetadata = (slides as any).metadata;
        const whiteboardScenes = slidesMetadata?.whiteboardScenes;
        const sceneFromArray = whiteboardScenes?.[0];

        const sceneToRender = whiteboardScene || sceneFromArray;

        if (sceneToRender && sceneToRender.actions && Array.isArray(sceneToRender.actions) && sceneToRender.actions.length > 0) {
          renderWhiteboardSlide(ctx, sceneToRender, 0, 1920, 1080);
        } else {
          renderSlide(ctx, firstSlide, 0, 1920, 1080);
        }
      } catch (error) {
        console.error('Error rendering first slide:', error);
        renderSlide(ctx, firstSlide, 0, 1920, 1080);
      }
    }

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [slides, isFullscreen]);

  // Voice narration - speak narration text as scenes play
  useEffect(() => {
    if (!isPlaying || !slides || isMuted) {
      TTSService.stop();
      TTSService.stop();
      return;
    }

    // Ensure TTS is ready
    TTSService.init();

    // Find current slide and its narration
    let slideTime = 0;
    let currentSlide: Slide | null = null;
    let currentScene: any = null;
    let slideIndex = 0;

    for (let i = 0; i < slides.slides.length; i++) {
      const slide = slides.slides[i];
      if (currentTime >= slideTime && currentTime < slideTime + slide.duration) {
        currentSlide = slide;
        slideIndex = i;
        // Get whiteboard scene if available
        const whiteboardScene = (slide as any).metadata?.whiteboardScene;
        const slidesMetadata = (slides as any).metadata;
        const whiteboardScenes = slidesMetadata?.whiteboardScenes;
        const sceneFromArray = whiteboardScenes?.[i];
        currentScene = whiteboardScene || sceneFromArray;
        break;
      }
      slideTime += slide.duration;
    }

    if (!currentSlide) return;

    // Get narration text (from whiteboard scene or slide voiceScript)
    // Get narration text (from whiteboard scene or slide voiceScript)
    let narrationText = currentScene?.narration || currentSlide.voiceScript;

    // Fallback: If no script, read the text content on the slide
    if (!narrationText && currentSlide.content) {
      const textParts = currentSlide.content
        .filter(c => c.type === 'heading' || c.type === 'text' || c.type === 'bullet')
        .map(c => c.content);
      if (textParts.length > 0) {
        narrationText = textParts.join('. ');
      }
    }

    narrationText = narrationText || '';

    if (!narrationText) return;

    // Check if we've already spoken this narration
    const narrationKey = `${currentSlide.id}-${currentScene?.id || 'none'}-${slideIndex}`;
    if (currentVoiceRef.current === narrationKey) {
      // Already speaking this narration, don't restart
      return;
    }

    // Stop any current speech and start new narration
    TTSService.stop();
    currentVoiceRef.current = narrationKey;

    console.log(`[Narrator DEBUG] Start narration for slide ${slideIndex}`);
    console.log(`[Narrator DEBUG] Text length: ${narrationText.length}`);
    console.log(`[Narrator DEBUG] Text: "${narrationText.substring(0, 100)}..."`);
    console.log(`[Narrator DEBUG] Key: ${narrationKey}`);

    // Speak the narration
    TTSService.speak(narrationText, {
      rate: 0.9,
      pitch: 1,
      volume: 1,
      onEnd: () => {
        // currentVoiceRef.current = null; // Don't clear ref to avoid re-trigger
        console.log(`[Narrator DEBUG] Finished narration for slide ${slideIndex}`);
      },
      onError: (error) => {
        console.error(`[Narrator DEBUG] Error for slide ${slideIndex}:`, error);
        currentVoiceRef.current = null;
      },
    }).catch(e => {
      console.error(`[Narrator DEBUG] Exception starting speak:`, e);
      currentVoiceRef.current = null;
    });

    // Cleanup on unmount or when slide changes
    return () => {
      // Don't stop if we're just moving to next slide (let it continue)
      // Only stop if component unmounts or playing stops
    };
  }, [isPlaying, slides, currentSlideIndex, isMuted]);

  // Stop narration when paused or muted
  useEffect(() => {
    if (!isPlaying || isMuted) {
      TTSService.stop();
      currentVoiceRef.current = null;
    }
  }, [isPlaying, isMuted]);

  const handlePlayPause = () => {
    if (isPlaying) {
      // Pause
      TTSService.pause();
      startTimeRef.current = Date.now() - currentTime * 1000;
    } else {
      // Play
      TTSService.resume();
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now() - currentTime * 1000;
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (newMutedState) {
      // Mute: stop narration
      TTSService.stop();
      currentVoiceRef.current = null;
    } else {
      // Unmute: resume or restart narration for current slide
      if (isPlaying && slides) {
        // Trigger narration restart by clearing the ref
        currentVoiceRef.current = null;
      }
    }
  };

  const handleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          await (containerRef.current as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const totalDuration = slides?.metadata?.totalDuration || 0;
  const safeTotalDuration = isNaN(totalDuration) || !isFinite(totalDuration) ? 0 : totalDuration;

  if (!slides) {
    // Show loading state with more info
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-card border border-border">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white">
          <div className="w-8 h-8 rounded-full border-2 border-muted border-t-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading whiteboard video...</p>
          {slidesId && (
            <p className="text-xs text-muted-foreground/70">Slides ID: {slidesId}</p>
          )}
          <p className="text-xs text-muted-foreground/50 mt-2">
            {typeof window !== 'undefined'
              ? `Storage keys: ${Object.keys(sessionStorage).filter(k => k.startsWith('video_slides_')).length} found`
              : 'Checking storage...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-xl overflow-hidden bg-card border border-border group"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff'
      }}
    >
      <canvas
        ref={canvasRef}
        className="block"
        style={{
          background: '#ffffff',
          maxWidth: '100%',
          maxHeight: '100%',
          width: '100%',
          height: 'auto'
        }}
      />

      {/* Audio Debug / Unmute Overlay - CONSTANTLY VISIBLE if playing but silent */}
      {(isMuted || (isPlaying && !TTSService.isSpeaking())) && (
        <div className="absolute top-4 right-4 z-50 pointer-events-auto animate-pulse">
          <Button
            variant="destructive"
            size="sm"
            className="shadow-lg hover:scale-105 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              console.log('[AudioDebug] Manually triggering audio...');
              setIsMuted(false);
              TTSService.resume();
              // Force speak current line
              const currentSlide = slides?.slides[currentSlideIndex];
              const text = currentSlide?.voiceScript || "Audio system verified. Proceeding.";
              TTSService.speak(text);
            }}
          >
            <VolumeX className="w-4 h-4 mr-2" />
            Tap to Force Audio
          </Button>
        </div>
      )}

      {/* Controls overlay */},{/* Controls overlay */},{/* Controls overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      )}>
        <button
          onClick={handlePlayPause}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-12 h-12 rounded-full bg-foreground/90 flex items-center justify-center hover:scale-105 transition-transform">
            {isPlaying ? (
              <Pause className="w-5 h-5 text-background" />
            ) : (
              <Play className="w-5 h-5 text-background ml-0.5" />
            )}
          </div>
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
          <div className="h-1 bg-muted/50 rounded-full overflow-hidden cursor-pointer">
            <div
              className="h-full bg-foreground rounded-full transition-all"
              style={{ width: `${(currentTime / (safeTotalDuration || 1)) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePlayPause}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleMute}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <span className="text-xs text-muted-foreground ml-2">
                {formatTime(currentTime)} / {formatTime(safeTotalDuration)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderSlide(
  ctx: CanvasRenderingContext2D,
  slide: Slide,
  elapsedTime: number,
  width: number,
  height: number
) {
  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw background (whiteboard style - white by default)
  if (slide.background?.gradient) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    slide.background.gradient.forEach((color, index) => {
      gradient.addColorStop(index / (slide.background.gradient!.length - 1), color);
    });
    ctx.fillStyle = gradient;
  } else {
    // White background for whiteboard style, or use specified color
    ctx.fillStyle = slide.background?.color || '#ffffff';
  }
  ctx.fillRect(0, 0, width, height);

  // Draw content (fallback if whiteboard scene not available)
  if (slide.content && slide.content.length > 0) {
    slide.content.forEach((contentItem, index) => {
      drawContent(ctx, contentItem, elapsedTime, index, width, height);
    });
  } else {
    // If no content, draw a placeholder
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Loading content...', width / 2, height / 2);
  }
}

// Cache for loaded images
const imageCache = new Map<string, HTMLImageElement>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (imageCache.has(url)) {
      resolve(imageCache.get(url)!);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function drawIcon(ctx: CanvasRenderingContext2D, iconName: string, x: number, y: number, size: number, color: string) {
  // Simple icon drawing using canvas paths
  // In production, you'd use an icon library or SVG
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.1;

  switch (iconName.toLowerCase()) {
    case 'lightbulb':
      // Draw a lightbulb shape
      ctx.beginPath();
      ctx.arc(x, y - size * 0.2, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - size * 0.15, y + size * 0.15);
      ctx.lineTo(x - size * 0.1, y + size * 0.35);
      ctx.lineTo(x + size * 0.1, y + size * 0.35);
      ctx.lineTo(x + size * 0.15, y + size * 0.15);
      ctx.closePath();
      ctx.fill();
      break;
    case 'code':
      // Draw code brackets
      ctx.beginPath();
      ctx.moveTo(x - size * 0.3, y - size * 0.2);
      ctx.lineTo(x - size * 0.4, y);
      ctx.lineTo(x - size * 0.3, y + size * 0.2);
      ctx.moveTo(x + size * 0.3, y - size * 0.2);
      ctx.lineTo(x + size * 0.4, y);
      ctx.lineTo(x + size * 0.3, y + size * 0.2);
      ctx.stroke();
      break;
    case 'book':
      // Draw a book
      ctx.beginPath();
      ctx.rect(x - size * 0.35, y - size * 0.25, size * 0.7, size * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.25);
      ctx.lineTo(x, y + size * 0.25);
      ctx.stroke();
      break;
    case 'check':
      // Draw checkmark
      ctx.beginPath();
      ctx.moveTo(x - size * 0.25, y);
      ctx.lineTo(x - size * 0.05, y + size * 0.2);
      ctx.lineTo(x + size * 0.25, y - size * 0.2);
      ctx.lineWidth = size * 0.15;
      ctx.stroke();
      break;
    case 'arrow':
      // Draw right arrow
      ctx.beginPath();
      ctx.moveTo(x - size * 0.3, y);
      ctx.lineTo(x + size * 0.1, y);
      ctx.lineTo(x + size * 0.1, y - size * 0.15);
      ctx.lineTo(x + size * 0.3, y);
      ctx.lineTo(x + size * 0.1, y + size * 0.15);
      ctx.lineTo(x + size * 0.1, y);
      ctx.closePath();
      ctx.fill();
      break;
    case 'star':
      // Draw a star
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const radius = i % 2 === 0 ? size * 0.3 : size * 0.15;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    case 'gear':
      // Draw a gear/cog
      ctx.beginPath();
      const gearRadius = size * 0.25;
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const radius = i % 2 === 0 ? gearRadius * 1.2 : gearRadius * 0.8;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, gearRadius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a1a';
      ctx.fill();
      ctx.fillStyle = color;
      break;
    case 'rocket':
      // Draw a rocket
      ctx.beginPath();
      // Rocket body
      ctx.moveTo(x, y - size * 0.35);
      ctx.lineTo(x - size * 0.15, y + size * 0.2);
      ctx.lineTo(x, y + size * 0.3);
      ctx.lineTo(x + size * 0.15, y + size * 0.2);
      ctx.closePath();
      ctx.fill();
      // Rocket fins
      ctx.beginPath();
      ctx.moveTo(x - size * 0.15, y + size * 0.2);
      ctx.lineTo(x - size * 0.25, y + size * 0.35);
      ctx.lineTo(x - size * 0.1, y + size * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + size * 0.15, y + size * 0.2);
      ctx.lineTo(x + size * 0.25, y + size * 0.35);
      ctx.lineTo(x + size * 0.1, y + size * 0.25);
      ctx.closePath();
      ctx.fill();
      break;
    default:
      // Default: draw a circle
      ctx.beginPath();
      ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
  }

  ctx.restore();
}

function drawContent(
  ctx: CanvasRenderingContext2D,
  content: any,
  currentTime: number,
  index: number,
  width: number,
  height: number
) {
  const style = content.style || {};

  // Handle image content
  if (content.type === 'image' && content.imageUrl) {
    const imgX = typeof style.x === 'string'
      ? (parseFloat(style.x) / 100) * width
      : (style.x || width * 0.5);
    const imgY = typeof style.y === 'string'
      ? (parseFloat(style.y) / 100) * height
      : (style.y || height * 0.5);
    const imgWidth = typeof style.width === 'string'
      ? (parseFloat(style.width) / 100) * width
      : (style.width || width * 0.3);
    const imgHeight = typeof style.height === 'string'
      ? (parseFloat(style.height) / 100) * height
      : (style.height || imgWidth);

    const animProgress = content.animation
      ? Math.min((currentTime * 1000 - (content.animation.delay || 0)) / (content.animation.duration || 1000), 1)
      : 1;

    ctx.globalAlpha = animProgress;

    // Try to get cached image, otherwise draw placeholder
    const cachedImg = imageCache.get(content.imageUrl);
    if (cachedImg && cachedImg.complete) {
      ctx.drawImage(cachedImg, imgX - imgWidth / 2, imgY - imgHeight / 2, imgWidth, imgHeight);
    } else {
      // Fallback: draw placeholder rectangle (light gray for whiteboard)
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(imgX - imgWidth / 2, imgY - imgHeight / 2, imgWidth, imgHeight);
      ctx.strokeStyle = '#d0d0d0';
      ctx.lineWidth = 2;
      ctx.strokeRect(imgX - imgWidth / 2, imgY - imgHeight / 2, imgWidth, imgHeight);
      // Try to load image for next frame
      if (!imageCache.has(content.imageUrl)) {
        loadImage(content.imageUrl).catch(() => { });
      }
    }
    ctx.globalAlpha = 1;
    return;
  }

  // Handle icon content
  if (content.type === 'icon' && content.iconName) {
    const iconX = typeof style.x === 'string'
      ? (parseFloat(style.x) / 100) * width
      : (style.x || width * 0.2 + index * width * 0.15);
    const iconY = typeof style.y === 'string'
      ? (parseFloat(style.y) / 100) * height
      : (style.y || height * 0.3);
    const iconSize = typeof style.width === 'number' ? style.width : width * 0.08;
    // Use dark color for whiteboard style, or specified color
    const iconColor = style.color || '#1a1a1a';

    const animProgress = content.animation
      ? Math.min((currentTime * 1000 - (content.animation.delay || 0)) / (content.animation.duration || 1000), 1)
      : 1;
    ctx.globalAlpha = animProgress;
    drawIcon(ctx, content.iconName, iconX, iconY, iconSize, iconColor);
    ctx.globalAlpha = 1;
    return;
  }

  // Text content (whiteboard style - dark text on white background)
  const fontSize = parseFloat(style.fontSize?.replace('rem', '') || '1') * 48;
  const fontWeight = style.fontWeight || 'normal';
  // Default to dark text for whiteboard style, or use specified color
  const color = style.color || (content.type === 'heading' ? '#8b2118' : '#333333');
  const textAlign = style.textAlign || 'left';

  ctx.fillStyle = color;
  ctx.font = `${fontWeight} ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.textAlign = textAlign as CanvasTextAlign;
  ctx.textBaseline = 'top';

  // Calculate text area with proper padding and boundaries
  const padding = width * 0.1; // Increased padding for better containment
  const maxWidth = width - (padding * 2);
  const lineHeight = fontSize * 1.3; // Slightly tighter line height for better fit

  // Use explicit X position from style if provided, otherwise calculate
  let startX: number;
  if (style.x !== undefined) {
    startX = typeof style.x === 'string'
      ? (parseFloat(style.x) / 100) * width
      : (style.x as number);
  } else {
    startX = padding;
    if (textAlign === 'center') {
      startX = width / 2;
    } else if (textAlign === 'right') {
      startX = width - padding;
    }
  }

  // Use explicit Y position from style if provided, otherwise calculate
  let startY: number;
  if (style.y !== undefined) {
    startY = typeof style.y === 'string'
      ? (parseFloat(style.y) / 100) * height
      : (style.y as number);
  } else {
    // Calculate default Y position
    startY = height * 0.15; // Start higher
    if (content.type === 'heading') {
      startY = height * 0.12; // Higher for headings
    } else if (content.type === 'text' || content.type === 'bullet') {
      // Stack content items with proper spacing, accounting for padding
      const baseY = height * 0.25;
      const itemSpacing = lineHeight * 1.8; // Reduced spacing between items
      startY = baseY + (index * itemSpacing);

      // Ensure content doesn't exceed bottom boundary
      const maxY = height * 0.9; // Leave 10% margin at bottom
      if (startY > maxY) {
        startY = maxY;
      }
    }
  }

  // Apply animation
  const animation = content.animation;
  let currentY = startY;
  let drawProgress = 1;

  if (animation) {
    const animTime = currentTime * 1000;
    const delay = animation.delay || 0;

    if (animTime < delay) return;

    const animDuration = animation.duration || 1000;
    drawProgress = Math.min((animTime - delay) / animDuration, 1);

    switch (animation.type) {
      case 'fade':
        ctx.globalAlpha = drawProgress;
        break;
      case 'slide':
        currentY = startY + (1 - drawProgress) * 50;
        break;
      case 'draw':
        // VideoScribe-style drawing animation - text appears progressively
        ctx.globalAlpha = 1;
        break;
    }
  }

  // Calculate available height to constrain text
  const availableHeight = height - startY - (height * 0.1); // Leave 10% margin at bottom

  if (content.type === 'bullet') {
    const text = `• ${content.content}`;
    // Simple progressive reveal (no wrapping as per user's "perfect" request)
    const visibleChars = Math.floor(text.length * drawProgress);
    const visibleText = text.substring(0, visibleChars);
    ctx.fillText(visibleText, startX, currentY);
  } else if (content.type === 'heading' || content.type === 'text') {
    const text = content.content;
    const visibleChars = Math.floor(text.length * drawProgress);
    const visibleText = text.substring(0, visibleChars);
    ctx.fillText(visibleText, startX, currentY);
  } else if (content.type === 'code') {
    const lines = content.content.split('\n');
    const codePadding = 40;
    const codeLineHeight = fontSize * 1.2;
    const maxCodeHeight = height * 0.6; // Limit code block height
    const codeWidth = Math.min(width * 0.8, maxWidth);

    // Constrain number of visible lines
    const maxVisibleLines = Math.floor((maxCodeHeight - codePadding * 2) / codeLineHeight);
    const visibleLines = lines.slice(0, maxVisibleLines);
    const codeHeight = visibleLines.length * codeLineHeight + codePadding * 2;
    const codeX = width / 2;
    const codeY = Math.min(height * 0.5 - codeHeight / 2, height * 0.15); // Keep code block higher if too tall

    // Background (light gray for whiteboard style)
    ctx.fillStyle = '#f5f5f5';
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 2;
    ctx.fillRect(codeX - codeWidth / 2, codeY, codeWidth, codeHeight);
    ctx.strokeRect(codeX - codeWidth / 2, codeY, codeWidth, codeHeight);

    // Code text
    ctx.fillStyle = color;
    ctx.font = `${fontSize * 0.7}px 'Courier New', monospace`;
    ctx.textAlign = 'left';
    visibleLines.forEach((line, i) => {
      // Truncate long lines to fit width
      const maxLineWidth = codeWidth - codePadding * 2;
      let displayLine = line;
      const metrics = ctx.measureText(line);
      if (metrics.width > maxLineWidth) {
        // Truncate with ellipsis
        while (ctx.measureText(displayLine + '...').width > maxLineWidth && displayLine.length > 0) {
          displayLine = displayLine.slice(0, -1);
        }
        displayLine += '...';
      }

      if (animation?.type === 'draw') {
        const charsToShow = Math.floor(displayLine.length * drawProgress);
        ctx.fillText(displayLine.substring(0, charsToShow), codeX - codeWidth / 2 + codePadding, codeY + codePadding + (i * codeLineHeight));
      } else {
        ctx.fillText(displayLine, codeX - codeWidth / 2 + codePadding, codeY + codePadding + (i * codeLineHeight));
      }
    });
  } else {
    // Progressive reveal (no wrapping as per user's "perfect" request)
    const text = content.content;
    const visibleChars = Math.floor(text.length * drawProgress);
    const visibleText = text.substring(0, visibleChars);
    ctx.fillText(visibleText, startX, currentY);
  }

  ctx.globalAlpha = 1;
}



// Helper to format time as M:SS
function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

