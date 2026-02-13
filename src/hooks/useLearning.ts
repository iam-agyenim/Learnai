import { useState, useCallback } from 'react';
import type { Message, LearningSession, SyllabusItem, UserProgress, ActionButton, VideoLesson } from '@/types/learning';
import { OpenAIService } from '@/services/openai';

const generateId = () => Math.random().toString(36).substring(2, 15);

const defaultActions: ActionButton[] = [
  { id: '1', label: 'Continue to next lesson', action: 'continue', icon: 'continue' },
  { id: '2', label: 'Go deeper', action: 'deeper', icon: 'deeper' },
  { id: '3', label: 'Give me an exercise', action: 'exercise', icon: 'exercise' },
  { id: '4', label: 'Turn into a project', action: 'project', icon: 'project' },
  { id: '5', label: 'Explain more simply', action: 'simple', icon: 'simple' },
];

export function useLearning() {
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [currentSession, setCurrentSession] = useState<LearningSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userProgress, setUserProgress] = useState<UserProgress>({
    credits: 50,
    totalLessons: 0,
    completedLessons: 0,
    streak: 3,
    isPro: false,
  });

  const generateSyllabus = async (topic: string): Promise<SyllabusItem[]> => {
    try {
      return await OpenAIService.generateSyllabus(topic);
    } catch (error) {
      console.error('Error generating syllabus:', error);
      // Fallback
      return [
        { id: generateId(), title: `Introduction to ${topic}`, completed: false, current: true },
        { id: generateId(), title: `${topic} Fundamentals`, completed: false, current: false },
      ];
    }
  };

  const generateAIResponse = async (userMessage: string, isFirstMessage: boolean, topic?: string): Promise<string> => {
    try {
      return await OpenAIService.generateAIResponse(userMessage, isFirstMessage, topic);
    } catch (error) {
      console.error('Error generating AI response:', error);
      if (isFirstMessage) {
        const extractedTopic = topic || userMessage.replace(/teach me|i want to learn|help me understand|explain/gi, '').trim();
        return `Great choice! I'm excited to help you learn ${extractedTopic}. 🎯 I'm generating your first interactive video lesson now to get you started.`;
      }
      return `Building on what we've covered, let's dive deeper into this concept. Here's your next interactive video lesson to continue your learning journey.`;
    }
  };

  const sendMessage = useCallback(async (content: string) => {
    const isFirstMessage = messages.length === 0;

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Add placeholder assistant message for immediate feedback
    const placeholderId = generateId();
    const placeholderMessage: Message = {
      id: placeholderId,
      role: 'assistant',
      content: '...',
      timestamp: new Date(),
      isGenerating: true,
      loadingStage: 'thinking',
    };
    setMessages(prev => [...prev, placeholderMessage]);

    // Extract topic from user message
    const topic = content.replace(/teach me|i want to learn|help me understand|explain/gi, '').trim() || content;

    // Generate syllabus for first message
    let newSyllabus: SyllabusItem[] = [];
    if (isFirstMessage) {
      // Update to generating_syllabus stage
      setMessages(prev => prev.map(msg =>
        msg.id === placeholderId
          ? { ...msg, loadingStage: 'generating_syllabus' as const }
          : msg
      ));

      newSyllabus = await generateSyllabus(topic);
      setSyllabus(newSyllabus);
      setUserProgress(prev => ({ ...prev, totalLessons: newSyllabus.length }));
    } else {
      // Use existing syllabus
      newSyllabus = syllabus;
    }

    // Determine current lesson from syllabus
    const currentLesson = newSyllabus.find(item => item.current) || newSyllabus.find(item => !item.completed) || newSyllabus[0];
    const lessonTitle = currentLesson?.title || topic;

    // Determine difficulty based on user progress (simplified for now)
    const difficulty = 'beginner'; // Could be adaptive based on user history

    // Update to creating_video stage
    setMessages(prev => prev.map(msg =>
      msg.id === placeholderId
        ? { ...msg, loadingStage: 'creating_video' as const }
        : msg
    ));

    // Generate slides and export to MP4 video using OpenAI
    // Pass the specific lesson title so AI teaches according to syllabus
    let videoUrl: string | undefined;
    let slides: any = null;

    try {
      const { SlideGeneratorService } = await import('@/services/slideGenerator');
      const { VideoExporterService } = await import('@/services/videoExporter');

      // Generate slides for the specific lesson from syllabus
      const videoContent = await OpenAIService.generateVideoContent(topic, difficulty, lessonTitle);
      slides = SlideGeneratorService.generateSlidesFromAI(videoContent, topic);

      // Export slides to MP4 video (will return slides:// URL as fallback)
      videoUrl = await VideoExporterService.generateVideoUrl(slides);
      console.log('Video URL generated:', videoUrl);
    } catch (error) {
      console.error('Error generating video:', error);
      // Ensure we still have a fallback URL
      if (!videoUrl && slides) {
        const videoId = slides.id;
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(`video_slides_${videoId}`, JSON.stringify(slides));
            videoUrl = `slides://${videoId}`;
            console.log('Created fallback slides:// URL:', videoUrl);
          } catch (storageError) {
            console.error('Error storing slides for fallback:', storageError);
          }
        }
      } else if (!videoUrl) {
        // If slides generation failed completely, create a minimal fallback
        console.warn('Video generation failed completely, creating minimal fallback');
        const fallbackId = generateId();
        if (typeof window !== 'undefined') {
          try {
            const minimalSlides = {
              id: fallbackId,
              title: `Introduction to ${topic}`,
              topic,
              slides: [{
                id: generateId(),
                type: 'content',
                duration: 5,
                content: [{
                  type: 'text',
                  content: `Welcome to ${topic}!`,
                  style: { fontSize: '2rem', color: '#1a1a1a' }
                }],
                background: { color: '#ffffff' },
                voiceScript: `Welcome to ${topic}!`
              }],
              metadata: {
                totalDuration: 5,
                aspectRatio: '16:9',
                resolution: { width: 1920, height: 1080 }
              }
            };
            sessionStorage.setItem(`video_slides_${fallbackId}`, JSON.stringify(minimalSlides));
            videoUrl = `slides://${fallbackId}`;
            console.log('Created minimal fallback slides:// URL:', videoUrl);
          } catch (storageError) {
            console.error('Error creating minimal fallback:', storageError);
          }
        }
      }
    }

    // Generate AI response
    const aiResponseContent = await generateAIResponse(content, isFirstMessage, topic);

    // Add AI response with MP4 video URL
    // Always include videoUrl (even if undefined) so the video player shows
    const aiMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: aiResponseContent,
      videoUrl: videoUrl, // MP4 video URL from slide generation (may be undefined)
      videoLesson: undefined, // No longer using interactive lessons
      syllabus: isFirstMessage ? newSyllabus : undefined,
      actions: defaultActions,
      timestamp: new Date(),
      loadingStage: 'complete',
    };

    console.log('Created AI message:', {
      id: aiMessage.id,
      hasVideoUrl: !!aiMessage.videoUrl,
      videoUrl: aiMessage.videoUrl,
      hasContent: !!aiMessage.content,
      contentLength: aiMessage.content?.length
    });

    // Replace placeholder with real message
    setMessages(prev => prev.map(msg => msg.id === placeholderId ? aiMessage : msg));
    setIsLoading(false);

    // Update credits
    setUserProgress(prev => ({ ...prev, credits: prev.credits - 1 }));

    // Create/update session
    if (isFirstMessage) {
      const newSession: LearningSession = {
        id: generateId(),
        topic: topic.slice(0, 50),
        messages: [userMessage, aiMessage],
        syllabus: newSyllabus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
    }
  }, [messages, syllabus]);

  const handleAction = useCallback(async (action: string) => {
    const actionMessages: Record<string, string> = {
      'continue': "Let's continue to the next lesson",
      'deeper': "Go deeper into this topic",
      'exercise': "Give me a practical exercise",
      'project': "Turn this into a project",
      'simple': "Explain this more simply",
      'quiz': "Quiz me on what I've learned",
      'example': "Give me another example",
    };

    // Handle deeper explanation
    if (action === 'deeper' && currentSession) {
      const topic = currentSession.topic;
      setIsLoading(true);

      try {
        const deeperExplanation = await OpenAIService.generateDeeperExplanation(topic, 'beginner');
        const explanationMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: deeperExplanation,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, explanationMessage]);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error('Error generating deeper explanation:', error);
      }
    }

    // Handle example request
    if (action === 'example' && currentSession) {
      const topic = currentSession.topic;
      setIsLoading(true);

      try {
        const example = await OpenAIService.generateExample(topic);
        const exampleMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: example,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, exampleMessage]);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error('Error generating example:', error);
      }
    }

    // Handle exercise request
    if (action === 'exercise' && currentSession) {
      const topic = currentSession.topic;
      setIsLoading(true);

      try {
        const exercise = await OpenAIService.generatePracticeExercise(topic);
        const exerciseMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: `**${exercise.exercise}**\n\n${exercise.instructions}${exercise.expectedOutcome ? `\n\n**Expected Outcome:** ${exercise.expectedOutcome}` : ''}${exercise.hint ? `\n\n💡 **Hint:** ${exercise.hint}` : ''}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, exerciseMessage]);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error('Error generating exercise:', error);
      }
    }

    // Handle project request
    if (action === 'project' && currentSession) {
      const topic = currentSession.topic;
      setIsLoading(true);

      try {
        const completedLessons = syllabus.filter(s => s.completed).map(s => s.title);
        const project = await OpenAIService.generateCourseProject(topic, completedLessons);
        const projectMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: `**${project.project}**\n\n${project.description}\n\n**Skills Applied:**\n${project.skillsApplied.map(s => `- ${s}`).join('\n')}\n\n**Success Criteria:**\n${project.successCriteria.map(c => `- ${c}`).join('\n')}\n\n**Instructions:**\n${project.instructions}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, projectMessage]);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error('Error generating project:', error);
      }
    }

    // For simple/explanations, generate a simpler video using adaptive explanation
    if (action === 'simple' && currentSession) {
      const topic = currentSession.topic;
      setIsLoading(true);

      try {
        const { SlideGeneratorService } = await import('@/services/slideGenerator');
        const { VideoExporterService } = await import('@/services/videoExporter');

        // Get simpler explanation from OpenAI
        const simplerExplanation = await OpenAIService.generateSimplerExplanation(topic);

        // Generate simpler slides using OpenAI with simpler explanation context
        const videoContent = await OpenAIService.generateVideoContent(
          `Simple explanation of ${topic}`,
          'beginner'
        );
        const slides = SlideGeneratorService.generateSlidesFromAI(videoContent, `Simple explanation of ${topic}`);

        // Export to video
        const videoUrl = await VideoExporterService.generateVideoUrl(slides);

        const explanationMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: simplerExplanation,
          videoUrl: videoUrl,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, explanationMessage]);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error('Error generating simpler explanation:', error);
      }
    }

    sendMessage(actionMessages[action] || action);
  }, [sendMessage, currentSession, syllabus]);

  const startNewSession = useCallback(() => {
    setMessages([]);
    setSyllabus([]);
    setCurrentSession(null);
  }, []);

  const selectSession = useCallback((session: LearningSession) => {
    setCurrentSession(session);
    setMessages(session.messages);
    setSyllabus(session.syllabus);
  }, []);

  const selectSyllabusItem = useCallback((item: SyllabusItem) => {
    // Update syllabus to mark this item as current
    setSyllabus(prev => prev.map(s => ({
      ...s,
      current: s.id === item.id,
      completed: s.current ? true : s.completed,
    })));

    // Send message to generate video for this specific lesson
    sendMessage(`Teach me: ${item.title}`);
  }, [sendMessage]);

  return {
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
  };
}
