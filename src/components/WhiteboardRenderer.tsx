/**
 * Whiteboard Renderer Component
 * Renders VideoScribe-style whiteboard animations with stroke-by-stroke drawing
 */

import { useEffect, useRef, useState } from 'react';
import type { WhiteboardScene, DrawingAction, ActionAnimationState } from '@/types/whiteboard';
import { WhiteboardEngine } from '@/services/whiteboardEngine';

interface WhiteboardRendererProps {
  scene: WhiteboardScene;
  currentTime: number;
  width: number;
  height: number;
  showHand?: boolean;
}

export function WhiteboardRenderer({
  scene,
  currentTime,
  width,
  height,
  showHand = true,
}: WhiteboardRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !svgRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svg = svgRef.current;
    svg.innerHTML = ''; // Clear previous content

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Render all actions up to current time
    scene.actions.forEach(action => {
      const actionState = WhiteboardEngine.getActionState(action, currentTime, 0);
      renderAction(ctx, svg, action, actionState, width, height, showHand);
    });
  }, [scene, currentTime, width, height, showHand]);

  return (
    <div className="relative" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width, height }}
      />
      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width, height }}
        viewBox={`0 0 ${width} ${height}`}
      />
    </div>
  );
}

/**
 * Render a single drawing action
 */
function renderAction(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  action: DrawingAction,
  state: ActionAnimationState,
  width: number,
  height: number,
  showHand: boolean
) {
  if (state.currentProgress <= 0) return;

  const progress = Math.min(state.currentProgress, 1);
  const color = action.color || '#1a1a1a';
  const strokeWidth = action.metadata?.strokeWidth || 3;

  switch (action.type) {
    case 'write':
      renderWriteAction(ctx, svg, action, progress, color, strokeWidth, showHand, state.handPosition);
      break;
    case 'draw':
      renderDrawAction(ctx, svg, action, progress, color, strokeWidth, showHand, state.handPosition);
      break;
    case 'circle':
      renderCircleAction(ctx, svg, action, progress, color, strokeWidth, showHand, state.handPosition);
      break;
    case 'arrow':
      renderArrowAction(ctx, svg, action, progress, color, strokeWidth, showHand, state.handPosition);
      break;
    case 'underline':
      renderUnderlineAction(ctx, svg, action, progress, color, strokeWidth, showHand, state.handPosition);
      break;
    case 'box':
      renderBoxAction(ctx, svg, action, progress, color, strokeWidth, showHand, state.handPosition);
      break;
    case 'highlight':
      renderHighlightAction(ctx, svg, action, progress, color, showHand, state.handPosition);
      break;
    case 'image':
      renderImageAction(ctx, svg, action, progress, showHand, state.handPosition);
      break;
    case 'pause':
      // Pause doesn't render anything, just waits
      break;
    case 'erase':
      // Erase would need to clear previous actions
      // For MVP, we'll skip erase
      break;
  }
}

/**
 * Render image action
 */
function renderImageAction(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  action: DrawingAction,
  progress: number,
  showHand: boolean,
  handPosition?: { x: number; y: number } | null
) {
  if (!action.imageUrl || !action.position) return;

  // Use metadata size or defaults
  const width = action.metadata?.width || 200;
  const height = action.metadata?.height || width; // explicit height or square default

  const x = action.position.x - width / 2;
  const y = action.position.y - height / 2;

  const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', action.imageUrl);
  image.setAttribute('x', x.toString());
  image.setAttribute('y', y.toString());
  image.setAttribute('width', width.toString());
  image.setAttribute('height', height.toString());

  // Simple fade in for now
  image.setAttribute('opacity', progress.toString());

  // Apply post-draw animation if fully drawn
  if (progress >= 1 && action.animationEffect && action.animationEffect !== 'none') {
    // We'll use CSS classes for animations
    // Note: In a real app, these should be in a CSS file
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      @keyframes blink { 50% { opacity: 0.5; } }
      @keyframes pulse { 50% { transform: scale(1.1); transform-box: fill-box; transform-origin: center; } }
      .anim-blink { animation: blink 1s infinite; }
      .anim-pulse { animation: pulse 2s infinite; }
    `;
    // Only append style if not already there (simple check)
    if (!svg.querySelector('style')) {
      svg.appendChild(style);
    }

    image.classList.add(`anim-${action.animationEffect}`);
  }

  svg.appendChild(image);

  // Render caption if present
  if (action.caption && progress > 0.5) {
    const textInfo = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    // Center text below image
    textInfo.setAttribute('x', (x + width / 2).toString());
    textInfo.setAttribute('y', (y + height + 30).toString());
    textInfo.setAttribute('text-anchor', 'middle'); // Center alignment
    textInfo.setAttribute('font-family', '"Kalam", "Caveat", "Comic Sans MS", cursive');
    textInfo.setAttribute('font-size', '24');
    textInfo.setAttribute('fill', '#333');
    textInfo.textContent = action.caption;

    // Fade in caption
    const textProgress = Math.min(1, (progress - 0.5) * 2);
    textInfo.setAttribute('opacity', textProgress.toString());

    svg.appendChild(textInfo);
  }

  if (showHand && handPosition && progress < 1) {
    drawHand(ctx, svg, handPosition.x, handPosition.y);
  }
}

/**
 * Render text writing action (stroke-by-stroke)
 */
function renderWriteAction(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  action: DrawingAction,
  progress: number,
  color: string,
  strokeWidth: number,
  showHand: boolean,
  handPosition?: { x: number; y: number } | null
) {
  if (!action.path || !action.text) return;

  // Create SVG path for the text
  const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathElement.setAttribute('d', action.path);
  pathElement.setAttribute('fill', 'none');
  pathElement.setAttribute('stroke', color);
  pathElement.setAttribute('stroke-width', strokeWidth.toString());
  pathElement.setAttribute('stroke-linecap', 'round');
  pathElement.setAttribute('stroke-linejoin', 'round');

  // Calculate path length for stroke animation
  const pathLength = pathElement.getTotalLength();
  const { dasharray, dashoffset } = WhiteboardEngine.getStrokeDashProperties(pathLength, progress);

  pathElement.setAttribute('stroke-dasharray', dasharray);
  pathElement.setAttribute('stroke-dashoffset', dashoffset.toString());

  svg.appendChild(pathElement);

  // Draw hand if visible
  if (showHand && handPosition && progress < 1) {
    drawHand(ctx, svg, handPosition.x, handPosition.y);
  }
}

/**
 * Render drawing action (freehand path)
 */
function renderDrawAction(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  action: DrawingAction,
  progress: number,
  color: string,
  strokeWidth: number,
  showHand: boolean,
  handPosition?: { x: number; y: number } | null
) {
  if (!action.path) return;

  const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathElement.setAttribute('d', action.path);
  pathElement.setAttribute('fill', 'none');
  pathElement.setAttribute('stroke', color);
  pathElement.setAttribute('stroke-width', strokeWidth.toString());
  pathElement.setAttribute('stroke-linecap', 'round');
  pathElement.setAttribute('stroke-linejoin', 'round');

  const pathLength = pathElement.getTotalLength();
  const { dasharray, dashoffset } = WhiteboardEngine.getStrokeDashProperties(pathLength, progress);

  pathElement.setAttribute('stroke-dasharray', dasharray);
  pathElement.setAttribute('stroke-dashoffset', dashoffset.toString());

  svg.appendChild(pathElement);

  if (showHand && handPosition && progress < 1) {
    drawHand(ctx, svg, handPosition.x, handPosition.y);
  }
}

/**
 * Render circle action
 */
function renderCircleAction(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  action: DrawingAction,
  progress: number,
  color: string,
  strokeWidth: number,
  showHand: boolean,
  handPosition?: { x: number; y: number } | null
) {
  if (!action.path) return;

  const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathElement.setAttribute('d', action.path);
  pathElement.setAttribute('fill', 'none');
  pathElement.setAttribute('stroke', color);
  pathElement.setAttribute('stroke-width', strokeWidth.toString());
  pathElement.setAttribute('stroke-linecap', 'round');

  const pathLength = pathElement.getTotalLength();
  const { dasharray, dashoffset } = WhiteboardEngine.getStrokeDashProperties(pathLength, progress);

  pathElement.setAttribute('stroke-dasharray', dasharray);
  pathElement.setAttribute('stroke-dashoffset', dashoffset.toString());

  svg.appendChild(pathElement);

  if (showHand && handPosition && progress < 1) {
    drawHand(ctx, svg, handPosition.x, handPosition.y);
  }
}

/**
 * Render arrow action
 */
function renderArrowAction(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  action: DrawingAction,
  progress: number,
  color: string,
  strokeWidth: number,
  showHand: boolean,
  handPosition?: { x: number; y: number } | null
) {
  if (!action.path) return;

  const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathElement.setAttribute('d', action.path);
  pathElement.setAttribute('fill', 'none');
  pathElement.setAttribute('stroke', color);
  pathElement.setAttribute('stroke-width', strokeWidth.toString());
  pathElement.setAttribute('stroke-linecap', 'round');
  pathElement.setAttribute('stroke-linejoin', 'round');

  const pathLength = pathElement.getTotalLength();
  const { dasharray, dashoffset } = WhiteboardEngine.getStrokeDashProperties(pathLength, progress);

  pathElement.setAttribute('stroke-dasharray', dasharray);
  pathElement.setAttribute('stroke-dashoffset', dashoffset.toString());

  svg.appendChild(pathElement);

  if (showHand && handPosition && progress < 1) {
    drawHand(ctx, svg, handPosition.x, handPosition.y);
  }
}

/**
 * Render underline action
 */
function renderUnderlineAction(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  action: DrawingAction,
  progress: number,
  color: string,
  strokeWidth: number,
  showHand: boolean,
  handPosition?: { x: number; y: number } | null
) {
  // For underline, we need to find the target action and draw a line under it
  // Simplified version - draw a line at the action position
  if (!action.position) return;

  const lineY = action.position.y + 20;
  const lineLength = 200;
  const startX = action.position.x;
  const endX = startX + lineLength * progress;

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', startX.toString());
  line.setAttribute('y1', lineY.toString());
  line.setAttribute('x2', endX.toString());
  line.setAttribute('y2', lineY.toString());
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', strokeWidth.toString());
  line.setAttribute('stroke-linecap', 'round');

  svg.appendChild(line);

  if (showHand && handPosition && progress < 1) {
    drawHand(ctx, svg, handPosition.x, handPosition.y);
  }
}

/**
 * Render box action
 */
function renderBoxAction(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  action: DrawingAction,
  progress: number,
  color: string,
  strokeWidth: number,
  showHand: boolean,
  handPosition?: { x: number; y: number } | null
) {
  if (!action.path) return;

  const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathElement.setAttribute('d', action.path);
  pathElement.setAttribute('fill', 'none');
  pathElement.setAttribute('stroke', color);
  pathElement.setAttribute('stroke-width', strokeWidth.toString());
  pathElement.setAttribute('stroke-linecap', 'round');
  pathElement.setAttribute('stroke-linejoin', 'round');

  const pathLength = pathElement.getTotalLength();
  const { dasharray, dashoffset } = WhiteboardEngine.getStrokeDashProperties(pathLength, progress);

  pathElement.setAttribute('stroke-dasharray', dasharray);
  pathElement.setAttribute('stroke-dashoffset', dashoffset.toString());

  svg.appendChild(pathElement);

  if (showHand && handPosition && progress < 1) {
    drawHand(ctx, svg, handPosition.x, handPosition.y);
  }
}

/**
 * Render highlight action
 */
function renderHighlightAction(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  action: DrawingAction,
  progress: number,
  color: string,
  showHand: boolean,
  handPosition?: { x: number; y: number } | null
) {
  // Highlight is a filled rectangle with opacity
  if (!action.position) return;

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', (action.position.x - 50).toString());
  rect.setAttribute('y', (action.position.y - 20).toString());
  rect.setAttribute('width', (100 * progress).toString());
  rect.setAttribute('height', '40');
  rect.setAttribute('fill', color);
  rect.setAttribute('opacity', '0.3');

  svg.appendChild(rect);
}

/**
 * Draw hand icon at position
 */
function drawHand(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  x: number,
  y: number
) {
  // Draw a simple hand icon
  // In production, you'd use an actual hand image/SVG
  const handSize = 40;

  const handGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  handGroup.setAttribute('transform', `translate(${x}, ${y})`);

  // Simple hand shape (circle for palm, lines for fingers)
  const palm = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  palm.setAttribute('cx', '0');
  palm.setAttribute('cy', '0');
  palm.setAttribute('rx', (handSize / 2).toString());
  palm.setAttribute('ry', (handSize / 3).toString());
  palm.setAttribute('fill', '#fdbcb4');
  palm.setAttribute('stroke', '#333');
  palm.setAttribute('stroke-width', '2');

  handGroup.appendChild(palm);
  svg.appendChild(handGroup);
}

