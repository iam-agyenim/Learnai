import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SlideVideoPlayer } from './SlideVideoPlayer';

interface VideoPlayerProps {
  videoUrl?: string;
  title?: string;
  isGenerating?: boolean;
}

export function VideoPlayer({ videoUrl, title, isGenerating }: VideoPlayerProps) {
  // Check if this is a slides:// URL
  const isSlideVideo = videoUrl?.startsWith('slides://');
  const slidesId = isSlideVideo ? videoUrl.replace('slides://', '') : null;

  // If it's a slide video, use the SlideVideoPlayer
  if (isSlideVideo && slidesId) {
    return <SlideVideoPlayer slidesId={slidesId} title={title} />;
  }

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = async () => {
    if (videoRef.current) {
      try {
        if (!document.fullscreenElement) {
          await videoRef.current.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (error) {
        console.error('Fullscreen error:', error);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setProgress((video.currentTime / video.duration) * 100 || 0);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoUrl]);

  if (isGenerating) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-card border border-border">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-muted border-t-foreground animate-spin" />
          <div className="text-center">
            <p className="text-sm text-foreground">Generating video...</p>
            <p className="text-xs text-muted-foreground mt-1">Creating whiteboard animation...</p>
          </div>
        </div>
      </div>
    );
  }

  // If no videoUrl and not generating, show placeholder
  if (!videoUrl) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-card border border-border">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Play className="w-6 h-6 text-foreground ml-0.5" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{title || "Video Lesson"}</p>
            <p className="text-xs text-muted-foreground mt-1">Video will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-card border border-border group">
      <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-muted/5">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            muted={isMuted}
            playsInline
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Play className="w-6 h-6 text-foreground ml-0.5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{title || "Video Lesson"}</p>
                <p className="text-xs text-muted-foreground">Video will appear here</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      )}>
        {!videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-foreground/90 flex items-center justify-center hover:scale-105 transition-transform">
              <Play className="w-5 h-5 text-background ml-0.5" />
            </div>
          </div>
        )}

        {videoUrl && (
          <>
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
                  style={{ width: `${progress}%` }}
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
                    {formatTime((progress / 100) * duration)} / {formatTime(duration)}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFullscreen}>
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
