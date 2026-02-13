import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LoadingStage } from '@/types/learning';

interface LoadingStatesProps {
    stage: LoadingStage;
}

interface StageItem {
    id: LoadingStage;
    message: string;
    description: string;
}

const stages: StageItem[] = [
    {
        id: 'thinking',
        message: 'Analyzing your request...',
        description: 'Understanding what you want to learn',
    },
    {
        id: 'generating_syllabus',
        message: 'Designing curriculum logic...',
        description: 'Creating your personalized learning path',
    },
    {
        id: 'creating_video',
        message: 'Writing educational script...',
        description: 'Generating your interactive lesson',
    },
    {
        id: 'complete',
        message: 'Finalizing lesson illustrations...',
        description: 'Preparing your content',
    },
];

export function LoadingStates({ stage }: LoadingStatesProps) {
    const currentStageIndex = stages.findIndex(s => s.id === stage);

    return (
        <div className="w-full py-6 animate-fade-in">
            <div className="max-w-md mx-auto rounded-xl border border-border bg-card/50 backdrop-blur-sm p-6">
                {/* Header with current main stage */}
                <div className="mb-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <Loader2 className="w-4 h-4 animate-spin text-foreground" />
                        <h3 className="text-sm font-semibold text-foreground">
                            {stages[currentStageIndex]?.message || 'Processing...'}
                        </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {stages[currentStageIndex]?.description || 'Generating your personalized lesson...'}
                    </p>
                </div>

                {/* Stage list */}
                <div className="space-y-2">
                    {stages.map((stageItem, index) => {
                        const isComplete = index < currentStageIndex;
                        const isCurrent = index === currentStageIndex;
                        const isPending = index > currentStageIndex;

                        return (
                            <div
                                key={stageItem.id}
                                className={cn(
                                    "flex items-center gap-3 p-2 rounded-lg transition-all duration-300",
                                    isCurrent && "bg-accent/50"
                                )}
                            >
                                {/* Status Icon */}
                                <div className={cn(
                                    "w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                                    isComplete && "bg-foreground text-background",
                                    isCurrent && "bg-foreground/10",
                                    isPending && "bg-muted"
                                )}>
                                    {isComplete && <Check className="w-2.5 h-2.5" />}
                                    {isCurrent && <Loader2 className="w-2.5 h-2.5 animate-spin text-foreground" />}
                                    {isPending && <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />}
                                </div>

                                {/* Stage Text */}
                                <span className={cn(
                                    "text-xs transition-all duration-300",
                                    isComplete && "text-muted-foreground line-through",
                                    isCurrent && "text-foreground font-medium",
                                    isPending && "text-muted-foreground/50"
                                )}>
                                    {stageItem.message}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
