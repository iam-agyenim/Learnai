import { useState, useRef, useEffect } from 'react';
import { Send, Plus, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSubmit, isLoading, placeholder }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSubmit(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 pt-2">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className={cn(
            "relative flex items-end gap-2 rounded-2xl border bg-card p-2",
            message ? "border-muted-foreground/30" : "border-border"
          )}>
            {/* Attachment button */}
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 shrink-0 rounded-full"
            >
              <Plus className="w-5 h-5 text-muted-foreground" />
            </Button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || "Ask anything"}
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground py-2 max-h-[200px] text-[15px]"
            />

            {/* Voice input */}
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 shrink-0 rounded-full"
            >
              <Mic className="w-5 h-5 text-muted-foreground" />
            </Button>

            {/* Submit button */}
            <Button
              type="submit"
              variant={message.trim() ? "default" : "ghost"}
              size="icon"
              disabled={!message.trim() || isLoading}
              className={cn(
                "h-9 w-9 shrink-0 rounded-full",
                !message.trim() && "text-muted-foreground"
              )}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-2">
          LearnAI generates personalized lessons. Results may vary.
        </p>
      </div>
    </div>
  );
}
