import { useState } from 'react';
import {
  MessageSquare,
  Search,
  PanelLeftClose,
  PanelLeft,
  SquarePen,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LearningSession, SyllabusItem, UserProgress } from '@/types/learning';

interface SidebarProps {
  sessions: LearningSession[];
  currentSession: LearningSession | null;
  syllabus: SyllabusItem[];
  userProgress: UserProgress;
  onNewSession: () => void;
  onSelectSession: (session: LearningSession) => void;
  onSelectSyllabusItem: (item: SyllabusItem) => void;
}

export function Sidebar({
  sessions,
  currentSession,
  userProgress,
  onNewSession,
  onSelectSession,
  onSelectSyllabusItem,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <aside className="w-0 md:w-16 h-screen bg-sidebar flex flex-col items-center py-3 border-r border-sidebar-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(false)}
          className="mb-4 text-sidebar-foreground hover:text-foreground"
        >
          <PanelLeft className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewSession}
          className="text-sidebar-foreground hover:text-foreground"
        >
          <SquarePen className="w-5 h-5" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="w-64 h-screen bg-sidebar flex flex-col">
      {/* Header */}
      <div className="p-2 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(true)}
          className="text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
        >
          <PanelLeftClose className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewSession}
          className="text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
        >
          <SquarePen className="w-5 h-5" />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="px-2 mb-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent gap-3 h-10"
          onClick={onNewSession}
        >
          <MessageSquare className="w-4 h-4" />
          New chat
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent gap-3 h-10"
        >
          <Search className="w-4 h-4" />
          Search chats
        </Button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-2">
        {sessions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground px-2 py-2">Your chats</p>
            <div className="space-y-0.5">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session)}
                  className={cn(
                    "w-full px-2 py-2 rounded-lg text-left text-sm transition-colors",
                    currentSession?.id === session.id
                      ? "bg-sidebar-accent text-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <p className="truncate">{session.topic}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">User</p>
            <p className="text-xs text-muted-foreground">Free</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs h-7 border-border">
            Upgrade
          </Button>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
          <Zap className="w-3 h-3" />
          <span>{userProgress.credits} credits remaining</span>
        </div>
      </div>
    </aside>
  );
}
