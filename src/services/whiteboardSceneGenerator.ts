/**
 * Whiteboard Scene Generator - VideoScribe-Class
 * Converts AI-generated content into true stroke-based whiteboard animations
 * 
 * Key principle: VideoScribe never "writes text" - it replays pen strokes
 */

import type { WhiteboardScene, DrawingAction } from '@/types/whiteboard';
import { textToPathSegments } from '@/utils/textToPath';
import { generateCirclePath, generateArrowPath } from '@/utils/textToPath';

const generateId = () => Math.random().toString(36).substring(2, 15);

/**
 * Semantic teaching action (non-visual intent)
 */
export type SemanticAction =
  | { kind: 'introduce_concept'; concept: string; position?: { x: number; y: number }; isExplicitVisual?: boolean; metadata?: any }
  | { kind: 'explain_relation'; from: string; to: string; fromPos?: { x: number; y: number }; toPos?: { x: number; y: number } }
  | { kind: 'emphasize'; target: string; method: 'circle' | 'underline' | 'highlight' }
  | { kind: 'pause_for_thinking'; duration: number }
  | { kind: 'transition'; to: string };

/**
 * Timeline slot calculator
 */
class Timeline {
  private currentTime: number = 0;
  private cameraBusyUntil: number = 0;

  nextAvailableSlot(options: {
    duration: number;
    needsCamera?: boolean;
    narrationPause?: boolean;
  }): number {
    const { duration, needsCamera = false, narrationPause = false } = options;

    // Camera moves need to finish before next action
    let slotStart = needsCamera ? Math.max(this.currentTime, this.cameraBusyUntil) : this.currentTime;

    // Narration pauses add breathing room
    if (narrationPause) {
      slotStart += 0.3;
    }

    // Reserve this slot
    // Reserve this slot
    // Add small buffer (0.1s) to ensure strict sequential playback without rounding overlap
    const safeDuration = isNaN(duration) || !isFinite(duration) ? 0.5 : Math.max(0.1, duration);
    const slotEnd = slotStart + safeDuration + 0.1;
    this.currentTime = slotEnd;

    if (needsCamera) {
      this.cameraBusyUntil = slotEnd;
    }

    return slotStart;
  }

  reset() {
    this.currentTime = 0;
    this.cameraBusyUntil = 0;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }
}

/**
 * Text Stroke Compiler
 * Converts text → SVG paths → individual strokes with timing
 */
class TextStrokeCompiler {
  /**
   * Compile text into stroke sequence
   */
  static compile(
    text: string,
    position: { x: number; y: number },
    fontSize: number,
    speed: 'slow' | 'medium' | 'fast' = 'medium'
  ): Array<{ path: string; duration: number; pressure?: number }> {
    const scale = fontSize / 30;
    const segments = textToPathSegments(text, position, scale);

    // Speed determines stroke duration
    const durationPerChar = {
      slow: 0.15,
      medium: 0.1,
      fast: 0.06,
    }[speed];

    // Convert path segments to strokes with timing
    const strokes: Array<{ path: string; duration: number; pressure?: number }> = [];

    for (const segment of segments) {
      // Estimate stroke duration based on path length
      const estimatedLength = segment.length;
      const duration = Math.max(0.1, Math.min(estimatedLength * durationPerChar / 100, 0.5));

      strokes.push({
        path: segment.d,
        duration,
        pressure: 1.0, // Can vary for artistic effect
      });
    }

    return strokes;
  }
}

/**
 * VideoScribe-Class Whiteboard Scene Generator
 */
export class WhiteboardSceneGenerator {
  /**
   * Convert AI-generated slides to true VideoScribe-style whiteboard scenes
   * Uses stroke-based animation, not slide-based content
   */
  static convertSlidesToWhiteboardScenes(
    slides: Array<{
      id?: string;
      type: string;
      duration: number;
      content: Array<any>;
      background?: any;
      voiceScript: string;
    }>,
    topic: string
  ): WhiteboardScene[] {
    const scenes: WhiteboardScene[] = [];
    const timeline = new Timeline();

    for (const slide of slides) {
      timeline.reset();

      const scene: WhiteboardScene = {
        id: slide.id || generateId(),
        background: 'whiteboard',
        actions: [],
        narration: slide.voiceScript,
        totalDuration: slide.duration,
      };

      const contentItems = slide.content || [];

      // If no content, create semantic teaching action
      if (contentItems.length === 0) {
        const defaultText = slide.voiceScript?.substring(0, 50) || `Concept ${scenes.length + 1}`;
        const semanticAction: SemanticAction = {
          kind: 'introduce_concept',
          concept: defaultText,
          position: { x: 960, y: 540 },
        };

        const actions = this.semanticToStrokes(semanticAction, timeline);
        scene.actions.push(...actions);
      } else {
        // Convert content items to semantic actions first
        for (const contentItem of contentItems) {
          const semanticActions = this.contentItemToSemantic(contentItem);

          for (const semantic of semanticActions) {
            const actions = this.semanticToStrokes(semantic, timeline);
            scene.actions.push(...actions);
          }
        }
      }

      // Ensure we have at least one action
      if (scene.actions.length === 0) {
        const defaultAction = this.createStrokeSequenceAction(
          'Loading...',
          { x: 960, y: 540 },
          48,
          timeline
        );
        scene.actions.push(defaultAction);
      }

      // Calculate total duration from actions
      if (scene.actions.length > 0) {
        const lastAction = scene.actions[scene.actions.length - 1];
        const actionEndTime = (lastAction.startTime || 0) + ((lastAction as any).duration || 0);
        const safeTotalDuration = isNaN(actionEndTime) || !isFinite(actionEndTime) ? (slide.duration || 5) : Math.max(actionEndTime, slide.duration || 5);
        scene.totalDuration = Math.max(0.5, safeTotalDuration);
      }

      scenes.push(scene);
    }

    return scenes;
  }

  /**
   * Convert semantic teaching action to stroke-based drawing actions
   * This is the core VideoScribe logic
   */
  private static semanticToStrokes(
    semantic: SemanticAction,
    timeline: Timeline
  ): DrawingAction[] {
    const actions: DrawingAction[] = [];

    switch (semantic.kind) {
      case 'introduce_concept':
        let visualPos = semantic.position || { x: 960, y: 540 };
        const textPos = { ...visualPos };

        // If we have a visual, draw it first (to the left or above?), then write text
        let shouldWriteText = !semantic.isExplicitVisual;

        // Also check if text is an image placeholder and suppress it
        if (semantic.concept.startsWith('[IMAGE:')) {
          shouldWriteText = false;

          // Extract the real image URL and create action
          const imageUrl = semantic.concept.replace('[IMAGE: ', '').replace(']', '');

          const imageAction = this.createImageAction(
            imageUrl,
            visualPos,
            timeline.nextAvailableSlot({ duration: 2.0 }),
            { ...semantic.metadata }
          );

          actions.push(imageAction);
        }

        // Write text as stroke sequence ONLY if needed
        if (shouldWriteText) {
          const strokeSeq = this.createStrokeSequenceAction(
            semantic.concept,
            textPos, // Adjusted position
            48,
            timeline
          );
          actions.push(strokeSeq);
        }

        // Add pause for thinking (if text was written)
        let pauseStart = timeline.getCurrentTime();
        if (shouldWriteText) {
          // We can't access strokeSeq here easily because of scoping, 
          // but we know it ended at the current timeline time.
          pauseStart = timeline.getCurrentTime();
        }

        const pauseAction: DrawingAction = {
          id: generateId(),
          type: 'pause',
          startTime: pauseStart,
          duration: 0.5,
          handVisible: false,
        };
        actions.push(pauseAction);
        timeline.nextAvailableSlot({ duration: 0.5 });
        break;

      case 'explain_relation':
        // Draw arrow between concepts
        const fromPos = semantic.fromPos || { x: 500, y: 400 };
        const toPos = semantic.toPos || { x: 1420, y: 400 };

        // First, write "from" concept
        const fromStroke = this.createStrokeSequenceAction(
          semantic.from,
          fromPos,
          36,
          timeline
        );
        actions.push(fromStroke);

        // Camera pan (if needed)
        if (Math.abs(toPos.x - fromPos.x) > 400) {
          const cameraAction = this.createCameraAction(
            fromPos,
            toPos,
            timeline.nextAvailableSlot({ duration: 1.2, needsCamera: true })
          );
          actions.push(cameraAction);
        }

        // Draw arrow
        const arrowStrokes = this.createArrowStrokes(
          fromPos,
          toPos,
          timeline.nextAvailableSlot({ duration: 1.5 })
        );
        actions.push(arrowStrokes);

        // Write "to" concept
        const toStroke = this.createStrokeSequenceAction(
          semantic.to,
          toPos,
          36,
          timeline
        );
        actions.push(toStroke);
        break;

      case 'emphasize':
        // Add emphasis stroke (circle, underline, etc.)
        const emphasizeAction = this.createEmphasisAction(
          semantic.target,
          semantic.method,
          timeline.nextAvailableSlot({ duration: 1.0 })
        );
        actions.push(emphasizeAction);
        break;

      case 'pause_for_thinking':
        const pause: DrawingAction = {
          id: generateId(),
          type: 'pause',
          startTime: timeline.nextAvailableSlot({ duration: semantic.duration }),
          duration: semantic.duration,
          handVisible: false,
        };
        actions.push(pause);
        break;
    }

    return actions;
  }

  /**
   * Create stroke sequence action (VideoScribe-style text drawing)
   */
  /**
   * Create stroke sequence action (VideoScribe-style text drawing)
   */
  private static createStrokeSequenceAction(
    text: string,
    position: { x: number; y: number },
    fontSize: number,
    timeline: Timeline, // Pass timeline instead of fixed time
    speed: 'slow' | 'medium' | 'fast' = 'medium'
  ): DrawingAction {
    const strokes = TextStrokeCompiler.compile(text, position, fontSize, speed);

    // Calculate exact duration
    const totalDuration = strokes.reduce((sum, stroke) => sum + stroke.duration, 0);

    // Reserve exact slot in timeline
    const startTime = timeline.nextAvailableSlot({ duration: totalDuration, narrationPause: true });

    // Choose professional color based on context (fontSize as proxy for heading)
    let color = '#1a1a1a'; // Default dark gray

    if (fontSize >= 48) {
      // Main Heading - Professional Navy/Dark Blue or accented Red
      color = '#2c3e50';
    } else if (fontSize >= 36) {
      // Subheading - Darker Gray
      color = '#34495e';
    } else {
      // Body Text - Dark Gray
      color = '#2c3e50';
    }

    // Override if user specifically wanted "professional red" for headings
    // User said: "for heading s, you can use red fonts or anything , like make it professional"
    if (fontSize >= 48) {
      color = '#8b2118'; // Professional brownish-red requested by user
    }

    return {
      id: generateId(),
      type: 'write', // Will be handled as stroke_sequence in renderer
      startTime,
      duration: totalDuration,
      text,
      fontSize,
      position,
      color: color,
      path: '', // Will be generated during rendering from strokes
      speed,
      handVisible: true,
      metadata: {
        strokeWidth: Math.max(2, fontSize * 0.05),
        strokes: strokes, // Store strokes in metadata
      } as any,
    };
  }

  /**
   * Create arrow drawing action with strokes
   */
  private static createArrowStrokes(
    from: { x: number; y: number },
    to: { x: number; y: number },
    startTime: number
  ): DrawingAction {
    const { linePath, headPath } = generateArrowPath(from, to, 0);

    // Split into strokes: line + arrowhead
    const lineDuration = 0.8;
    const headDuration = 0.7;

    return {
      id: generateId(),
      type: 'draw',
      startTime,
      duration: lineDuration + headDuration,
      path: `${linePath} ${headPath}`,
      start: from,
      end: to,
      color: '#1a1a1a',
      speed: 'medium',
      handVisible: true,
      metadata: {
        strokeWidth: 3,
        strokeSequence: [
          { path: linePath, duration: lineDuration },
          { path: headPath, duration: headDuration },
        ],
      } as any,
    };
  }

  /**
   * Create emphasis action (circle, underline, highlight)
   */
  private static createEmphasisAction(
    target: string,
    method: 'circle' | 'underline' | 'highlight',
    startTime: number
  ): DrawingAction {
    // Estimate target position (would be tracked in real system)
    const position = { x: 960, y: 540 };
    const radius = 100;

    if (method === 'circle') {
      const circlePath = generateCirclePath(position.x, position.y, radius);
      return {
        id: generateId(),
        type: 'circle',
        startTime,
        duration: 1.0,
        path: circlePath,
        position,
        radius,
        color: '#4a9eff',
        speed: 'medium',
        handVisible: true,
        metadata: {
          strokeWidth: 3,
        },
      };
    } else if (method === 'underline') {
      return {
        id: generateId(),
        type: 'underline',
        startTime,
        duration: 0.8,
        targetId: target,
        color: '#ff6b6b',
        speed: 'medium',
        handVisible: true,
        metadata: {
          strokeWidth: 4,
        },
      };
    } else {
      // highlight
      return {
        id: generateId(),
        type: 'highlight',
        startTime,
        duration: 0.5,
        targetId: target,
        color: '#ffeb3b',
        speed: 'fast',
        handVisible: false, // Highlight doesn't need hand
        metadata: {
          opacity: 0.3,
        },
      };
    }
  }

  /**
   * Create camera movement action
   */
  private static createCameraAction(
    from: { x: number; y: number },
    to: { x: number; y: number },
    startTime: number
  ): DrawingAction {
    return {
      id: generateId(),
      type: 'pause', // Camera moves during pause
      startTime,
      duration: 1.2,
      handVisible: false,
      metadata: {
        cameraMove: {
          from: { x: from.x / 1920, y: from.y / 1080, zoom: 1 },
          to: { x: to.x / 1920, y: to.y / 1080, zoom: 1 },
        },
      } as any,
    };
  }

  /**
   * Convert content item to semantic teaching actions
   */
  private static contentItemToSemantic(contentItem: any): SemanticAction[] {
    const semantics: SemanticAction[] = [];

    if (contentItem.type === 'heading' || contentItem.type === 'text' || contentItem.type === 'bullet') {
      const text = contentItem.type === 'bullet'
        ? `• ${contentItem.content}`
        : contentItem.content;

      const style = contentItem.style || {};
      const position = {
        x: this.parsePosition(style.x, 1920, 960),
        y: this.parsePosition(style.y, 1080, 540),
      };

      semantics.push({
        kind: 'introduce_concept',
        concept: text,
        position,
      });

      // Add pause after headings
      if (contentItem.type === 'heading') {
        semantics.push({
          kind: 'pause_for_thinking',
          duration: 0.8,
        });
      }
    } else if (contentItem.type === 'icon') {
      // Icons are visual concepts
      const style = contentItem.style || {};
      const position = {
        x: this.parsePosition(style.x, 1920, 960),
        y: this.parsePosition(style.y, 1080, 540),
      };

      semantics.push({
        kind: 'introduce_concept',
        concept: contentItem.iconName || 'icon',
        position,
        isExplicitVisual: true,
        metadata: { ...style, caption: contentItem.caption },
      });
    } else if (contentItem.type === 'image' && contentItem.imageUrl) {
      // Images are professional visual aids
      const style = contentItem.style || {};
      const position = {
        x: this.parsePosition(style.x, 1920, 960),
        y: this.parsePosition(style.y, 1080, 540),
      };

      // Store image metadata in the scene
      // Images will be rendered separately in the renderer
      semantics.push({
        kind: 'introduce_concept',
        concept: `[IMAGE: ${contentItem.imageUrl}]`,
        position,
        isExplicitVisual: true,
        metadata: { ...style, caption: contentItem.caption },
      });
    }

    return semantics;
  }

  /**
   * Create an image drawing action
   */
  private static createImageAction(
    imageUrl: string,
    position: { x: number; y: number },
    startTime: number,
    metadata: any = {}
  ): DrawingAction {
    return {
      id: generateId(),
      type: 'image',
      startTime,
      duration: 2.0, // Time to "draw" the image
      position,
      handVisible: true,
      metadata: {
        imageUrl: imageUrl, // Helper for renderer
        ...metadata
      } as any,
      // We also store it at top level for some renderers
      ...({ imageUrl } as any)
    };
  }

  /**
   * Parse position value (percentage string or number)
   */
  private static parsePosition(value: any, max: number, defaultValue: number): number {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) return defaultValue;
      return value;
    }
    if (typeof value === 'string') {
      const cleanValue = value.replace('%', '').trim();
      const percent = parseFloat(cleanValue);
      if (!isNaN(percent) && isFinite(percent)) return (percent / 100) * max;
    }
    return defaultValue;
  }
}
