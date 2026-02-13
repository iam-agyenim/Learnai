import { useState } from 'react';
import { User, Sparkles, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { InteractiveVideoPlayer } from '@/components/InteractiveVideoPlayer';
import { ActionButtons } from '@/components/ActionButtons';
import { LoadingStates } from '@/components/LoadingStates';
import { cn } from '@/lib/utils';
import type { Message, SyllabusItem } from '@/types/learning';

interface ChatMessageProps {
  message: Message;
  onAction: (action: string) => void;
  isGenerating?: boolean;
  onVideoInteraction?: (sceneId: string) => void;
  onExplainAgain?: () => void;
  onRequestExample?: () => void;
  onSelectSyllabusItem?: (item: SyllabusItem) => void;
}

export function ChatMessage({
  message,
  onAction,
  isGenerating,
  onVideoInteraction,
  onExplainAgain,
  onRequestExample,
  onSelectSyllabusItem,
}: ChatMessageProps) {
  const [syllabusExpanded, setSyllabusExpanded] = useState(true);
  const isUser = message.role === 'user';

  // Check if we need two-column layout (assistant message with syllabus)
  const needsTwoColumns = !isUser && message.syllabus && message.syllabus.length > 0;

  return (
    <div className={cn(
      "py-6 animate-fade-in",
      !isUser && "bg-card/30"
    )}>
      <div className={cn(
        "mx-auto px-4",
        needsTwoColumns ? "max-w-7xl" : "max-w-3xl"
      )}>
        {needsTwoColumns ? (
          // Two-column layout for assistant messages with syllabus
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* Left Column - Main Content (Bigger) */}
            <div className="col-span-8 space-y-4">
              <div className="flex gap-4">
                {/* Avatar */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm",
                  "bg-foreground text-background"
                )}>
                  <Sparkles className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-4 min-w-0 pt-0.5">
                  <p className="text-sm font-medium text-foreground">
                    LearnAI
                  </p>

                  <div className="text-foreground/90 leading-relaxed whitespace-pre-wrap text-[15px]">
                    {message.content}
                  </div>

                  {/* Loading States - Show before video */}
                  {isGenerating && message.loadingStage && message.loadingStage !== 'complete' && (
                    <div className="mt-4">
                      <LoadingStates stage={message.loadingStage} />
                    </div>
                  )}

                  {/* Video Player - MP4 from slides */}
                  {(message.videoUrl || (isGenerating && message.loadingStage === 'complete')) && (
                    <div className="mt-4 w-full" id="video-container">
                      <VideoPlayer
                        videoUrl={message.videoUrl}
                        title="Video Lesson"
                        isGenerating={isGenerating && !message.videoUrl}
                      />
                    </div>
                  )}

                  {/* Legacy Interactive Video Player (fallback) */}
                  {message.videoLesson && (
                    <div className="mt-4 w-full" id="video-container">
                      <InteractiveVideoPlayer
                        lesson={message.videoLesson}
                        isGenerating={isGenerating}
                        onSceneComplete={onVideoInteraction}
                        onInteraction={(data) => {
                          console.log('User interaction:', data);
                        }}
                        onRequestExplainAgain={onExplainAgain}
                        onRequestExample={onRequestExample}
                      />
                    </div>
                  )}

                  {/* Action buttons */}
                  {message.actions && message.actions.length > 0 && (
                    <ActionButtons actions={message.actions} onAction={onAction} />
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Syllabus (Smaller) */}
            <div className="col-span-4">
              <div className="ml-[10%]" style={{ paddingTop: '6.5rem' }}>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setSyllabusExpanded(!syllabusExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Learning Syllabus</span>
                      <span className="text-xs text-muted-foreground">
                        ({message.syllabus.length} lessons)
                      </span>
                    </div>
                    {syllabusExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {syllabusExpanded && (
                    <div className="px-4 pb-4 space-y-1 max-h-[600px] overflow-y-auto">
                      {message.syllabus.map((item, index) => (
                        <SyllabusItemRow
                          key={item.id}
                          item={item}
                          index={index}
                          allItems={message.syllabus}
                          onClick={() => {
                            // Only allow clicking on non-section items
                            if (!item.isSection) {
                              if (onSelectSyllabusItem) {
                                onSelectSyllabusItem(item);
                              } else if (onAction) {
                                // Fallback: send a message to learn this lesson
                                onAction(`Teach me: ${item.title}`);
                              }
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Single column layout for user messages or assistant messages without syllabus
          <div className="flex gap-4">
            {/* Avatar */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm",
              isUser ? "bg-accent" : "bg-foreground text-background"
            )}>
              {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-4 min-w-0 pt-0.5">
              <p className="text-sm font-medium text-foreground">
                {isUser ? 'You' : 'LearnAI'}
              </p>

              <div className="text-foreground/90 leading-relaxed whitespace-pre-wrap text-[15px]">
                {message.content}
              </div>

              {/* Loading States - Show before video */}
              {!isUser && isGenerating && message.loadingStage && message.loadingStage !== 'complete' && (
                <div className="mt-4">
                  <LoadingStates stage={message.loadingStage} />
                </div>
              )}

              {/* Video Player - MP4 from slides */}
              {!isUser && (message.videoUrl || (isGenerating && message.loadingStage === 'complete')) && (
                <div className="mt-4 w-full" id="video-container">
                  <VideoPlayer
                    videoUrl={message.videoUrl}
                    title="Video Lesson"
                    isGenerating={isGenerating && !message.videoUrl}
                  />
                </div>
              )}

              {/* Show placeholder if no video but should have one */}
              {!isUser && !message.videoUrl && !isGenerating && message.role === 'assistant' && (
                <div className="mt-4 w-full aspect-video rounded-xl overflow-hidden bg-card border border-border flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Video will appear here</p>
                    <p className="text-xs text-muted-foreground/70">Generating whiteboard animation...</p>
                  </div>
                </div>
              )}

              {/* Legacy Interactive Video Player (fallback) */}
              {!isUser && message.videoLesson && (
                <div className="mt-4 w-full">
                  <InteractiveVideoPlayer
                    lesson={message.videoLesson}
                    isGenerating={isGenerating}
                    onSceneComplete={onVideoInteraction}
                    onInteraction={(data) => {
                      console.log('User interaction:', data);
                    }}
                    onRequestExplainAgain={onExplainAgain}
                    onRequestExample={onRequestExample}
                  />
                </div>
              )}

              {/* Action buttons */}
              {!isUser && message.actions && message.actions.length > 0 && (
                <ActionButtons actions={message.actions} onAction={onAction} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SyllabusItemRow({
  item,
  index,
  onClick,
  allItems
}: {
  item: SyllabusItem;
  index: number;
  onClick?: () => void;
  allItems: SyllabusItem[];
}) {
  // If it's a section header, render it differently
  if (item.isSection) {
    return (
      <div className="mt-3 mb-2 pt-2 border-t border-border first:mt-0 first:pt-0 first:border-t-0">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
          {item.title}
        </span>
      </div>
    );
  }

  // Regular lesson item - calculate actual lesson number (excluding sections)
  const lessonNumber = allItems.slice(0, index).filter(i => !i.isSection).length + 1;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg transition-colors",
        item.current && "bg-accent",
        !item.isSection && "hover:bg-accent/50 cursor-pointer"
      )}
      onClick={onClick}
    >
      <span className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
        item.current
          ? "bg-foreground text-background"
          : item.completed
            ? "bg-muted text-muted-foreground"
            : "bg-muted text-foreground"
      )}>
        {item.completed ? '✓' : lessonNumber}
      </span>
      <span className={cn(
        "text-sm leading-relaxed flex-1",
        item.current ? "text-foreground font-medium" : "text-muted-foreground"
      )}>
        {item.title}
      </span>
    </div>
  );
}
