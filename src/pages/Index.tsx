import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { useLearning } from '@/hooks/useLearning';

const Index = () => {
  const {
    messages,
    sessions,
    currentSession,
    syllabus,
    isLoading,
    userProgress,
    sendMessage,
    handleAction,
    startNewSession,
    selectSession,
    selectSyllabusItem,
  } = useLearning();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        sessions={sessions}
        currentSession={currentSession}
        syllabus={syllabus}
        userProgress={userProgress}
        onNewSession={startNewSession}
        onSelectSession={selectSession}
        onSelectSyllabusItem={selectSyllabusItem}
      />
      <ChatArea
        messages={messages}
        onSendMessage={sendMessage}
        onAction={handleAction}
        isLoading={isLoading}
        onSelectSyllabusItem={selectSyllabusItem}
      />
    </div>
  );
};

export default Index;
