/**
 * Slide-based video generation types
 * For programmatic slides → video (MP4 export)
 */

export type SlideType = 'title' | 'content' | 'bullet' | 'code' | 'diagram' | 'transition';

export interface SlideAnimation {
  type: 'fade' | 'slide' | 'zoom' | 'typewriter' | 'draw';
  duration?: number; // milliseconds
  delay?: number; // milliseconds
}

export interface SlideContent {
  type: 'text' | 'heading' | 'bullet' | 'code' | 'diagram' | 'image' | 'icon';
  content: string;
  style?: {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    width?: number | string;
    height?: number | string;
    x?: number | string; // Position X (percentage or pixels)
    y?: number | string; // Position Y (percentage or pixels)
  };
  animation?: SlideAnimation;
  // For images/icons
  imageUrl?: string;
  iconName?: string; // Icon identifier (e.g., 'lightbulb', 'code', 'book')
}

export interface Slide {
  id: string;
  type: SlideType;
  duration: number; // seconds
  content: SlideContent[];
  background?: {
    color?: string;
    gradient?: string[];
  };
  voiceScript?: string; // Text for TTS narration
  transition?: {
    type: 'fade' | 'slide' | 'dissolve';
    duration?: number;
  };
  metadata?: {
    whiteboardScene?: any; // WhiteboardScene for VideoScribe-style rendering
  };
}

export interface VideoSlides {
  id: string;
  title: string;
  topic: string;
  slides: Slide[];
  metadata: {
    totalDuration: number; // seconds
    aspectRatio: '16:9' | '4:3';
    resolution: {
      width: number;
      height: number;
    };
    whiteboardScenes?: any[]; // WhiteboardScene[] for VideoScribe-style rendering
  };
}

