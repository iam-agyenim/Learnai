/**
 * Whiteboard Animation Engine
 * VideoScribe-style drawing engine with stroke-by-stroke animation
 */

import type { DrawingAction, WhiteboardScene, Position, PathPoint, ActionAnimationState } from '@/types/whiteboard';
import { textToPathSegments, generateCirclePath, generateArrowPath } from '@/utils/textToPath';

export class WhiteboardEngine {
  /**
   * Convert text to SVG path using handwritten letter paths
   */
  static textToSVGPath(text: string, x: number, y: number, fontSize: number): string {
    const scale = fontSize / 30; // Normalize to base font size of 30
    const segments = textToPathSegments(text, { x, y }, scale);
    // Combine all path segments into a single path string
    return segments.map(seg => seg.d).join(' ');
  }

  /**
   * Get path segments for text (for progressive drawing)
   */
  static async getTextPathSegments(text: string, x: number, y: number, fontSize: number) {
    const scale = fontSize / 30;
    return textToPathSegments(text, { x, y }, scale);
  }

  private static pathCache = new Map<string, PathPoint[]>();

  /**
   * Calculate path points for hand movement along a path
   */
  static calculatePathPoints(pathString: string, duration: number, fps: number = 30): PathPoint[] {
    const cacheKey = `${pathString}_${duration}_${fps}`;
    const cached = this.pathCache.get(cacheKey);
    if (cached) return cached;

    try {
      // Create an SVG path element to measure (off-screen, not in DOM)
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '0');
      svg.setAttribute('height', '0');
      svg.style.position = 'absolute';
      svg.style.visibility = 'hidden';
      svg.style.pointerEvents = 'none';

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathString);
      svg.appendChild(path);

      // Temporarily add to body for measurement
      if (document.body) {
        document.body.appendChild(svg);
      } else {
        // If body doesn't exist, create a temporary container
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.visibility = 'hidden';
        container.appendChild(svg);
        document.documentElement.appendChild(container);
      }

      const pathLength = path.getTotalLength();
      const points: PathPoint[] = [];
      const frameDuration = 1 / fps;
      const totalFrames = Math.ceil(duration * fps);

      for (let frame = 0; frame <= totalFrames; frame++) {
        const progress = frame / totalFrames;
        const length = pathLength * progress;
        const point = path.getPointAtLength(length);

        points.push({
          x: point.x,
          y: point.y,
          progress,
          time: frame * frameDuration,
        });
      }

      // Clean up
      if (svg.parentNode) {
        svg.parentNode.removeChild(svg);
      }
      if (svg.parentElement) {
        svg.parentElement.remove();
      }

      this.pathCache.set(cacheKey, points);
      return points;
    } catch (error) {
      console.warn('Error calculating path points, using fallback:', error);
      // Fallback: return empty array or simple points
      return [];
    }
  }

  /**
   * Calculate hand position for an action at a given time
   * Returns the position where the hand should be to follow the drawing path
   * Also returns angle for hand rotation
   */
  static getHandPosition(action: DrawingAction, currentTime: number, sceneStartTime: number): { position: Position; angle?: number } | null {
    const actionStartTime = sceneStartTime + action.startTime;
    const actionEndTime = actionStartTime + action.duration;

    // Check if action is active
    if (currentTime < actionStartTime || currentTime > actionEndTime) {
      return null;
    }

    // Calculate progress within this action
    const actionProgress = Math.min(1, Math.max(0, (currentTime - actionStartTime) / action.duration));

    // For text actions with stroke sequences, follow the actual stroke path
    if (action.type === 'write' && action.text && action.position) {
      const strokes = (action.metadata as any)?.strokes;

      if (strokes && Array.isArray(strokes) && strokes.length > 0) {
        // Calculate which stroke we're on and position within it
        let currentTime = 0;
        const totalDuration = strokes.reduce((sum: number, s: any) => sum + (s.duration || 0.1), 0);
        const currentDrawTime = totalDuration * actionProgress;

        for (const stroke of strokes) {
          const strokeStart = currentTime;
          const strokeEnd = currentTime + (stroke.duration || 0.1);

          if (currentDrawTime >= strokeStart && currentDrawTime <= strokeEnd) {
            // We're drawing this stroke
            const strokeProgress = (currentDrawTime - strokeStart) / (stroke.duration || 0.1);

            // Get position along this stroke path
            try {
              const pathPoints = this.calculatePathPoints(stroke.path, stroke.duration || 0.1);
              if (pathPoints.length > 0) {
                const pointIndex = Math.min(
                  pathPoints.length - 1,
                  Math.floor(strokeProgress * (pathPoints.length - 1))
                );
                const point = pathPoints[pointIndex];

                // Calculate angle from previous point for hand rotation
                let angle = 0;
                if (pointIndex > 0) {
                  const prevPoint = pathPoints[pointIndex - 1];
                  angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x);
                } else if (pathPoints.length > 1) {
                  const nextPoint = pathPoints[1];
                  angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
                }

                return { position: { x: point.x, y: point.y }, angle: 0 }; // Force 0 angle for text strokes to avoid rotational jitter
              }
            } catch (error) {
              console.warn('Error calculating stroke path points:', error);
            }
          }

          currentTime = strokeEnd;
        }
      }

      // Fallback: estimate position based on character progress
      const charsToShow = Math.floor(action.text.length * actionProgress);
      const charWidth = (action.fontSize || 48) * 0.6;
      const textWidth = charsToShow * charWidth;

      return {
        position: {
          x: action.position.x + textWidth,
          y: action.position.y + (action.fontSize || 48) / 2
        },
        angle: 0
      };
    }

    // For path-based actions (arrows, circles, etc.), follow the path precisely
    if (action.path) {
      try {
        const pathPoints = this.calculatePathPoints(action.path, action.duration);

        if (pathPoints.length > 0) {
          // Find the point at this progress
          const pointIndex = Math.min(
            pathPoints.length - 1,
            Math.floor(actionProgress * (pathPoints.length - 1))
          );
          const point = pathPoints[pointIndex];

          // Calculate angle from previous point for hand rotation
          let angle = 0;
          if (pointIndex > 0) {
            const prevPoint = pathPoints[pointIndex - 1];
            angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x);
          } else if (pathPoints.length > 1) {
            const nextPoint = pathPoints[1];
            angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
          }

          return { position: { x: point.x, y: point.y }, angle };
        }
      } catch (error) {
        console.warn('Error calculating path points:', error);
      }
    }

    // For arrows, use start/end positions
    if (action.type === 'arrow' && action.start && action.end) {
      const dx = action.end.x - action.start.x;
      const dy = action.end.y - action.start.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const currentDistance = distance * actionProgress;

      const angle = Math.atan2(dy, dx);
      const position = {
        x: action.start.x + Math.cos(angle) * currentDistance,
        y: action.start.y + Math.sin(angle) * currentDistance
      };

      return { position, angle };
    }

    // For images, move diagonally to match wipe effect
    if (action.type === 'image' && action.position) {
      // Assuming standard size if not in metadata, or use a heuristic
      const width = action.metadata?.width || 400;
      const height = action.metadata?.height || 300;

      const startX = action.position.x - width / 2;
      const startY = action.position.y - height / 2;

      // Diagonal movement (wipe moves from top-left to bottom-right)
      const p = actionProgress;
      const blobX = startX + width * p;
      const blobY = startY + height * p;

      return {
        position: { x: blobX, y: blobY },
        angle: Math.PI / 4 // 45 degrees
      };
    }

    // Fallback: use position if no path
    if (action.position) {
      return { position: action.position, angle: 0 };
    }

    return null;
  }

  /**
   * Get stroke dash properties for animated drawing
   */
  static getStrokeDashProperties(pathLength: number, progress: number): { dasharray: string; dashoffset: number } {
    const dasharray = pathLength;
    const dashoffset = pathLength * (1 - progress);

    return { dasharray: dasharray.toString(), dashoffset };
  }

  /**
   * Calculate action animation state at a given time
   */
  static getActionState(
    action: DrawingAction,
    currentTime: number,
    sceneStartTime: number
  ): ActionAnimationState {
    const actionStartTime = sceneStartTime + action.startTime;
    const actionEndTime = actionStartTime + action.duration;

    let currentProgress = 0;
    let isComplete = false;

    if (currentTime < actionStartTime) {
      // Action hasn't started
      currentProgress = 0;
    } else if (currentTime >= actionEndTime) {
      // Action is complete
      currentProgress = 1;
      isComplete = true;
    } else {
      // Action is in progress
      currentProgress = (currentTime - actionStartTime) / action.duration;
    }

    // Calculate path points for hand movement
    const pathPoints = action.path
      ? this.calculatePathPoints(action.path, action.duration)
      : [];

    // Get hand position and angle
    let handPosition: Position | undefined;
    let handAngle: number | undefined;

    if (action.handVisible !== false) {
      const handData = this.getHandPosition(action, currentTime, sceneStartTime);
      if (handData) {
        handPosition = handData.position;
        handAngle = handData.angle;
      }
    }

    return {
      action,
      currentProgress,
      pathPoints,
      isComplete,
      handPosition,
      handAngle,
    } as ActionAnimationState;
  }

  /**
   * Get all active actions at a given time
   */
  static getActiveActions(
    scene: WhiteboardScene,
    currentTime: number,
    sceneStartTime: number
  ): ActionAnimationState[] {
    return scene.actions
      .map(action => this.getActionState(action, currentTime, sceneStartTime))
      .filter(state => state.currentProgress > 0 && !state.isComplete || state.isComplete && currentTime < sceneStartTime + scene.totalDuration);
  }

  /**
   * Generate path for a circle (using Bezier approximation for smoother drawing)
   */
  static generateCirclePath(centerX: number, centerY: number, radius: number): string {
    return generateCirclePath(centerX, centerY, radius);
  }

  /**
   * Generate path for an arrow (with optional curve)
   */
  static async generateArrowPath(start: Position, end: Position, curve: number = 0): Promise<{ linePath: string; headPath: string }> {
    return generateArrowPath(start, end, curve);
  }

  /**
   * Generate complete arrow path string (for compatibility)
   */
  static async generateArrowPathString(start: Position, end: Position, curve: number = 0): Promise<string> {
    const { linePath, headPath } = await this.generateArrowPath(start, end, curve);
    return `${linePath} ${headPath}`;
  }

  /**
   * Generate path for a box/rectangle
   */
  static generateBoxPath(x: number, y: number, width: number, height: number): string {
    return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
  }
}

