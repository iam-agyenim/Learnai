import { useRef, useEffect } from 'react';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import type { Message, SyllabusItem } from '@/types/learning';

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onAction: (action: string) => void;
  isLoading: boolean;
  onSelectSyllabusItem: (item: SyllabusItem) => void;
}

export function ChatArea({ messages, onSendMessage, onAction, isLoading, onSelectSyllabusItem }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <div className="divide-y divide-border/50">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                onAction={onAction}
                isGenerating={message.isGenerating || (isLoading && index === messages.length - 1 && message.role === 'assistant')}
                onVideoInteraction={(sceneId) => {
                  console.log('Scene completed:', sceneId);
                }}
                onExplainAgain={() => {
                  onAction('simple');
                }}
                onRequestExample={() => {
                  onAction('example');
                }}
                onSelectSyllabusItem={onSelectSyllabusItem}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <ChatInput
        onSubmit={onSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}
