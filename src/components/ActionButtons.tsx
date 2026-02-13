import { 
  ArrowRight, 
  Brain, 
  Code, 
  FileQuestion, 
  Lightbulb, 
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ActionButton } from '@/types/learning';

interface ActionButtonsProps {
  actions: ActionButton[];
  onAction: (action: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  'continue': <ArrowRight className="w-4 h-4" />,
  'deeper': <Brain className="w-4 h-4" />,
  'exercise': <Code className="w-4 h-4" />,
  'project': <Rocket className="w-4 h-4" />,
  'simple': <Lightbulb className="w-4 h-4" />,
  'quiz': <FileQuestion className="w-4 h-4" />,
};

export function ActionButtons({ actions, onAction }: ActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {actions.map((action) => (
        <Button
          key={action.id}
          variant="action"
          size="sm"
          onClick={() => onAction(action.action)}
        >
          {iconMap[action.icon || 'continue'] || <ArrowRight className="w-4 h-4" />}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
