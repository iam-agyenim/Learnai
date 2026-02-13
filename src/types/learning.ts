export type LoadingStage = 'thinking' | 'generating_syllabus' | 'creating_video' | 'complete';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  videoUrl?: string;
  videoLesson?: VideoLesson;
  syllabus?: SyllabusItem[];
  actions?: ActionButton[];
  timestamp: Date;
  isGenerating?: boolean;
  loadingStage?: LoadingStage;
}


export interface VideoLesson {
  id: string;
  slides: any[];
  metadata: any;
}

export interface SyllabusItem {
  id: string;
  title: string;
  completed: boolean;
  current: boolean;
  isSection?: boolean;
}

export interface ActionButton {
  id: string;
  label: string;
  action: string;
  icon?: string;
}

export interface LearningSession {
  id: string;
  topic: string;
  messages: Message[];
  syllabus: SyllabusItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProgress {
  credits: number;
  totalLessons: number;
  completedLessons: number;
  streak: number;
  isPro: boolean;
}
