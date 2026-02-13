import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, SkipForward, HelpCircle, Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { VisualScene } from './VisualLayer';
import { TTSService } from '@/services/ttsService';
import type { VideoLesson, Scene, UserInteractionData } from '@/types/learning';
import { VideoEngineService } from '@/services/videoEngine';

interface InteractiveVideoPlayerProps {
  lesson: VideoLesson;
  onSceneComplete?: (sceneId: string) => void;
  onLessonComplete?: () => void;
  onInteraction?: (data: UserInteractionData) => void;
  onRequestExplainAgain?: () => void;
  onRequestExample?: () => void;
  isGenerating?: boolean;
}

export function InteractiveVideoPlayer({
  lesson,
  onSceneComplete,
  onLessonComplete,
  onInteraction,
  onRequestExplainAgain,
  onRequestExample,
  isGenerating = false,
}: InteractiveVideoPlayerProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showInteractionResult, setShowInteractionResult] = useState(false);
  const [interactionCorrect, setInteractionCorrect] = useState(false);
  const [sceneTime, setSceneTime] = useState(0);
  const [hasPaused, setHasPaused] = useState(false);
  const [hasReplayed, setHasReplayed] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSceneRef = useRef<Scene | null>(null);

  const currentScene = lesson.scenes[currentSceneIndex];
  currentSceneRef.current = currentScene;

  // Initialize TTS
  useEffect(() => {
    TTSService.init();
  }, []);

  // Scene progress tracking
  useEffect(() => {
    if (isPlaying && currentScene && !currentScene.interaction) {
      intervalRef.current = setInterval(() => {
        setSceneTime((prev) => {
          const newTime = prev + 0.1;
          const duration = currentScene.duration;
          const newProgress = Math.min((newTime / duration) * 100, 100);
          setProgress(newProgress);

          // Auto-advance when scene completes
          if (newTime >= duration) {
            handleSceneComplete();
            return 0;
          }

          return newTime;
        });
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentScene]);

  // Handle scene voice narration
  useEffect(() => {
    if (isPlaying && currentScene && !currentScene.interaction) {
      TTSService.speak(currentScene.voiceScript, {
        rate: 0.9,
        onEnd: () => {
          // Voice finished, but scene might still be playing
        },
      });
    }

    return () => {
      TTSService.stop();
    };
  }, [currentSceneIndex, isPlaying, currentScene]);

  // Reset state when scene changes
  useEffect(() => {
    setSceneTime(0);
    setProgress(0);
    setSelectedAnswer(null);
    setShowInteractionResult(false);
    setIsPlaying(false);
  }, [currentSceneIndex]);

  const handleSceneComplete = useCallback(() => {
    if (!currentScene) return;

    // Track interaction data
    if (onInteraction) {
      const interactionData: UserInteractionData = {
        sceneId: currentScene.id,
        timestamp: Date.now(),
        interactionType: currentScene.interaction?.type || 'click_to_continue',
        timeSpent: sceneTime,
        paused: hasPaused,
        replayed: hasReplayed,
      };
      onInteraction(interactionData);
    }

    if (onSceneComplete) {
      onSceneComplete(currentScene.id);
    }

    // Move to next scene
    if (currentSceneIndex < lesson.scenes.length - 1) {
      setCurrentSceneIndex((prev) => prev + 1);
    } else {
      // Lesson complete
      if (onLessonComplete) {
        onLessonComplete();
      }
    }
  }, [currentScene, currentSceneIndex, lesson.scenes.length, onSceneComplete, onLessonComplete, onInteraction, sceneTime, hasPaused, hasReplayed]);

  const handlePlayPause = () => {
    if (!currentScene) return;

    if (isPlaying) {
      TTSService.pause();
      setIsPlaying(false);
      setHasPaused(true);
    } else {
      if (currentScene.interaction) {
        // Interaction scenes don't auto-play
        return;
      }
      TTSService.resume();
      setIsPlaying(true);
    }
  };

  const handleReplayScene = () => {
    setHasReplayed(true);
    setSceneTime(0);
    setProgress(0);
    setSelectedAnswer(null);
    setShowInteractionResult(false);
    TTSService.stop();
    
    if (currentScene && !currentScene.interaction) {
      setIsPlaying(true);
    }
  };

  const handleNextScene = () => {
    handleSceneComplete();
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (!currentScene?.interaction) return;
    
    setSelectedAnswer(answerIndex);
    const isCorrect = currentScene.interaction.correctAnswer === answerIndex;
    setInteractionCorrect(isCorrect);
    setShowInteractionResult(true);

    // Track interaction
    if (onInteraction && currentScene.interaction) {
      const interactionData: UserInteractionData = {
        sceneId: currentScene.id,
        timestamp: Date.now(),
        interactionType: currentScene.interaction.type,
        userAnswer: answerIndex,
        wasCorrect: isCorrect,
        timeSpent: sceneTime,
        paused: hasPaused,
        replayed: hasReplayed,
      };
      onInteraction(interactionData);
    }

    // Auto-advance after showing result
    setTimeout(() => {
      if (isCorrect && currentScene.interaction?.onCorrect === 'next_scene') {
        handleNextScene();
      } else if (!isCorrect && currentScene.interaction?.onWrong === 'explain_again' && onRequestExplainAgain) {
        onRequestExplainAgain();
      } else {
        handleNextScene();
      }
    }, 2000);
  };

  const handleExplainAgain = () => {
    if (onRequestExplainAgain) {
      onRequestExplainAgain();
    }
  };

  const handleGetExample = () => {
    if (onRequestExample) {
      onRequestExample();
    }
  };

  if (isGenerating) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-card border border-border">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-muted border-t-foreground animate-spin" />
          <div className="text-center">
            <p className="text-sm text-foreground">Generating interactive video...</p>
            <p className="text-xs text-muted-foreground mt-1">Creating your personalized lesson</p>
          </div>
        </div>
      </div>
    );
  }

  const hasInteraction = !!currentScene?.interaction;
  const isInteractionScene = hasInteraction && currentScene.interaction?.type === 'check_understanding';

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-muted/20 via-background to-muted/10 border border-border group">
      {/* Visual Scene */}
      <div className="absolute inset-0">
        <VisualScene 
          layers={currentScene?.visuals || []} 
          isActive={true}
        />
      </div>

      {/* Interaction Overlay */}
      {isInteractionScene && currentScene.interaction && (
        <div className="absolute inset-0 bg-background/95 flex items-center justify-center z-10">
          <Card className="p-6 max-w-md w-full mx-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{currentScene.interaction.question}</h3>
              
              <div className="space-y-2">
                {currentScene.interaction.choices?.map((choice, index) => (
                  <Button
                    key={index}
                    variant={selectedAnswer === index ? "default" : "outline"}
                    className={cn(
                      "w-full justify-start",
                      showInteractionResult && index === currentScene.interaction?.correctAnswer && "bg-green-500 hover:bg-green-600",
                      showInteractionResult && selectedAnswer === index && index !== currentScene.interaction?.correctAnswer && "bg-red-500 hover:bg-red-600"
                    )}
                    onClick={() => !showInteractionResult && handleAnswerSelect(index)}
                    disabled={showInteractionResult}
                  >
                    {choice}
                  </Button>
                ))}
              </div>

              {showInteractionResult && (
                <div className={cn(
                  "p-3 rounded-lg text-sm text-center",
                  interactionCorrect ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-red-500/20 text-red-700 dark:text-red-400"
                )}>
                  {interactionCorrect ? "✓ Correct! Well done." : "✗ Not quite. Let's review this again."}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Click to continue overlay for non-interaction scenes */}
      {hasInteraction && currentScene.interaction?.type === 'click_to_continue' && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 cursor-pointer" onClick={handleNextScene}>
          <Card className="p-4">
            <p className="text-sm">Click to continue</p>
          </Card>
        </div>
      )}

      {/* Controls Overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        hasInteraction && "opacity-100"
      )}>
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
          {/* Progress Bar */}
          {!hasInteraction && (
            <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden cursor-pointer">
              <div 
                className="h-full bg-foreground rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {!hasInteraction && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9" 
                  onClick={handlePlayPause}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9" 
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9" 
                onClick={handleReplayScene}
                title="Replay scene"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>

              {!hasInteraction && currentSceneIndex < lesson.scenes.length - 1 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9" 
                  onClick={handleNextScene}
                  title="Next scene"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              )}

              <span className="text-xs text-muted-foreground ml-2">
                Scene {currentSceneIndex + 1} / {lesson.scenes.length}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs"
                onClick={handleExplainAgain}
              >
                <HelpCircle className="w-3 h-3 mr-1" />
                Explain Again
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs"
                onClick={handleGetExample}
              >
                <Zap className="w-3 h-3 mr-1" />
                Example
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Scene Indicator */}
      <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium">
        {currentScene?.type.charAt(0).toUpperCase() + currentScene?.type.slice(1)} Scene
      </div>
    </div>
  );
}


