/**
 * Whiteboard Animation Engine Types
 * VideoScribe-style action-based drawing system
 */

export type DrawingActionType =
  | 'write'      // Hand-written text (stroke-by-stroke)
  | 'draw'       // Freehand drawing (path)
  | 'circle'     // Draw a circle
  | 'arrow'      // Draw an arrow
  | 'underline'  // Underline existing text
  | 'box'        // Draw a box/rectangle
  | 'highlight'  // Highlight existing content
  | 'erase'      // Erase content
  | 'image'      // Draw/reveal an image
  | 'pause';     // Pause (no drawing)

export type DrawingSpeed = 'slow' | 'medium' | 'fast';

export interface Position {
  x: number;
  y: number;
}

export interface DrawingAction {
  id: string;
  type: DrawingActionType;
  startTime: number; // When this action starts (seconds)
  duration: number;  // How long this action takes (seconds)

  // For write action
  text?: string;
  fontSize?: number;
  fontFamily?: string; // Should be handwritten-style
  position?: Position;
  color?: string;

  // For draw/circle/arrow/box actions
  path?: string; // SVG path string
  start?: Position;
  end?: Position;
  radius?: number; // For circle

  // For image action
  imageUrl?: string;

  // For underline/highlight
  targetId?: string; // ID of action to underline/highlight

  // For erase
  targetIds?: string[]; // IDs of actions to erase

  // Animation properties
  speed?: DrawingSpeed;

  // Hand properties
  handVisible?: boolean; // Show hand during this action

  // Post-draw animation effects
  animationEffect?: 'blink' | 'pulse' | 'wiggle' | 'none';

  // Optional caption for images/icons
  caption?: string;

  // Metadata
  metadata?: {
    strokeWidth?: number;
    opacity?: number;
    width?: number;
    height?: number;
    [key: string]: any; // Allow flexible metadata
  };
}

export interface WhiteboardScene {
  id: string;
  background: 'whiteboard' | 'blackboard' | 'paper';
  actions: DrawingAction[];
  narration?: string; // Voice script
  totalDuration: number; // Sum of all action durations
}

export interface WhiteboardLesson {
  id: string;
  title: string;
  topic: string;
  scenes: WhiteboardScene[];
  metadata: {
    totalDuration: number;
  };
}

/**
 * Path point for hand movement
 */
export interface PathPoint {
  x: number;
  y: number;
  progress: number; // 0-1 along the path
  time: number; // Time at this point
}

/**
 * Animation state for a single action
 */
export interface ActionAnimationState {
  action: DrawingAction;
  currentProgress: number; // 0-1
  pathPoints: PathPoint[]; // Calculated path points for hand movement
  isComplete: boolean;
  handPosition?: Position;
  handAngle?: number; // Angle in radians for hand rotation (0 = right, PI/2 = down)
}

