/**
 * Whiteboard Rendering Utilities
 * Canvas-based rendering for VideoScribe-style whiteboard animations
 */

import type { WhiteboardScene, DrawingAction, ActionAnimationState, Position } from '@/types/whiteboard';
import { WhiteboardEngine } from '@/services/whiteboardEngine';

// Cache for hand image
let handImage: HTMLImageElement | null = null;
let handImageLoaded = false;

/**
 * Load hand image for drawing
 */
function loadHandImage(): Promise<void> {
  return new Promise((resolve) => {
    if (handImageLoaded && handImage) {
      resolve();
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/hand_v2.png'; // Use cropped v2 hand
    img.onload = () => {
      handImage = img;
      handImageLoaded = true;
      resolve();
    };
    img.onerror = () => {
      handImageLoaded = true;
      resolve();
    };
  });
}

/**
 * Render a whiteboard scene on canvas
 */
export function renderWhiteboardSlide(
  ctx: CanvasRenderingContext2D,
  scene: WhiteboardScene,
  elapsedTime: number,
  width: number,
  height: number
) {
  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Load hand image if not already loaded
  loadHandImage();

  // Render all actions up to current time
  if (!scene.actions || scene.actions.length === 0) {
    // If no actions, draw a placeholder message
    console.warn('Whiteboard scene has no actions:', scene);
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No content to display', width / 2, height / 2);
    return;
  }

  // Calculate total time for logging only occasionally to avoid spam
  // console.log('Rendering whiteboard scene:', scene.id, 'with', scene.actions.length, 'actions at time', elapsedTime);

  // Render images first (background layer)
  renderImagesOnCanvas(ctx, scene, elapsedTime, width, height);

  // Track the currently active action for hand positioning
  let activeAction: DrawingAction | null = null;
  let activeActionState: ActionAnimationState | null = null;

  scene.actions.forEach(action => {
    try {
      const actionState = WhiteboardEngine.getActionState(action, elapsedTime, 0);

      // Check if this action is currently active (being drawn)
      // Note: We check if progress is > 0 and slightly <= 1 to keep hand at end for a moment
      if (actionState.currentProgress > 0 && actionState.currentProgress <= 1.0) {
        activeAction = action;
        activeActionState = actionState;
      }

      if (actionState.currentProgress > 0) {
        renderActionOnCanvas(ctx, action, actionState, width, height);
      }
    } catch (error) {
      console.error('Error rendering action:', error, action);
    }
  });

  // Draw hand for the currently active action
  if (activeAction && activeActionState && (activeAction as any).handVisible !== false) {
    // Determine hand position based on action type
    let handPos = activeActionState.handPosition;

    // If no specific hand position (e.g. for text fallback), estimate it
    if (!handPos && activeActionState.currentProgress < 1) {
      if ((activeAction as any).type === 'write' && (activeAction as any).position && (activeAction as any).text) {
        // Accurately calculate cursor position for clean font
        ctx.save();
        const isHeading = ((activeAction as any).fontSize || 48) >= 36;
        const fontWeight = isHeading ? 'bold' : 'normal';
        ctx.font = `${fontWeight} ${(activeAction as any).fontSize || 48}px "Comic Neue", "Comic Sans MS", "Chalkboard SE", sans-serif`;

        const text = (activeAction as any).text;
        const totalMetrics = ctx.measureText(text);

        // Check centering
        const pos = (activeAction as any).position;
        let startX = pos.x;
        if (pos.x > 900 && pos.x < 1020) {
          startX = pos.x - (totalMetrics.width / 2);
        }

        const progress = activeActionState.currentProgress;

        // Use floating point index for smooth movement
        const totalChars = text.length;
        const currentFloatIndex = totalChars * progress;
        const charIndex = Math.floor(currentFloatIndex);
        const charFraction = currentFloatIndex - charIndex;

        // Measure text up to current char
        const visibleText = text.substring(0, charIndex);
        const visibleMetrics = ctx.measureText(visibleText);

        // Add partial width of the character currently being "written"
        let partialWidth = 0;
        if (charIndex < totalChars) {
          const nextChar = text[charIndex];
          const nextCharMetrics = ctx.measureText(nextChar);
          // Simple linear interpolation across the character width
          partialWidth = nextCharMetrics.width * charFraction;
        }

        ctx.restore();

        handPos = {
          x: startX + visibleMetrics.width + partialWidth,
          y: pos.y
        };
      } else if ((activeAction as any).position) {
        handPos = (activeAction as any).position;
      }
    }

    const handAngle = activeActionState.handAngle || 0;
    if (handPos) {
      // Add subtle hand bobbing for realism
      const bob = Math.sin(Date.now() / 150) * 2;
      drawHandOnCanvas(ctx, handPos.x, handPos.y + bob, handAngle);
    }
  }
}

/**
 * Render a single drawing action on canvas
 */
function renderActionOnCanvas(
  ctx: CanvasRenderingContext2D,
  action: DrawingAction,
  state: { currentProgress: number; handPosition?: Position | null },
  width: number,
  height: number
) {
  const progress = Math.min(state.currentProgress, 1);
  const color = action.color || '#1a1a1a';
  // Increase default stroke width for marker look
  const strokeWidth = action.metadata?.strokeWidth || 6;

  switch (action.type) {
    case 'write':
      renderWriteActionOnCanvas(ctx, action, progress, color, strokeWidth);
      break;
    case 'draw':
    case 'circle':
    case 'arrow':
    case 'box':
      renderPathActionOnCanvas(ctx, action, progress, color, strokeWidth);
      break;
    case 'underline':
      renderUnderlineOnCanvas(ctx, action, progress, color, strokeWidth);
      break;
    case 'highlight':
      renderHighlightOnCanvas(ctx, action, progress, color);
      break;
    case 'image':
      // Handled in separate pass but if we wanted integrated layer order we'd do it here
      // For now images are background
      break;
  }
}

// ... (skip to drawHandOnCanvas)

/**
 * Render text writing action (stroke-by-stroke simulation)
 */
/**
 * Render text writing action (clean font reveal with hand follow)
 */
function renderWriteActionOnCanvas(
  ctx: CanvasRenderingContext2D,
  action: DrawingAction,
  progress: number,
  color: string,
  strokeWidth: number
) {
  if (!action.text || !action.position) return;

  ctx.save();
  ctx.fillStyle = color;
  // Use a nice clean font that looks credible but slightly informal
  const isHeading = (action.fontSize || 48) >= 36;
  const fontWeight = isHeading ? 'bold' : 'normal';
  ctx.font = `${fontWeight} ${action.fontSize || 48}px "Comic Neue", "Comic Sans MS", "Chalkboard SE", sans-serif`;
  ctx.textBaseline = 'middle';

  const text = action.text;
  const chars = text.length;
  // Progress determines how many characters are shown
  const charsToShow = Math.floor(chars * progress);

  const visibleText = text.substring(0, charsToShow);

  // Render text
  // Center alignment logic check
  let finalX = action.position.x;
  // If the position is close to the center (960), or it's a large heading, center it
  const isCentered = Math.abs(action.position.x - 960) < 100;
  if (isCentered) {
    const fullMetrics = ctx.measureText(text);
    finalX = action.position.x - (fullMetrics.width / 2);
  }
  ctx.textAlign = 'start';
  ctx.fillText(visibleText, finalX, action.position.y);

  ctx.restore();
}

/**
 * Render path-based actions (circles, arrows, boxes, freehand)
 */
function renderPathActionOnCanvas(
  ctx: CanvasRenderingContext2D,
  action: DrawingAction,
  progress: number,
  color: string,
  strokeWidth: number
) {
  if (!action.path) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const path = new Path2D(action.path);

  // Estimate total length (not perfect but fast)
  const pathLength = 1000;
  const dashLength = pathLength * progress;

  ctx.setLineDash([dashLength, pathLength]);
  ctx.stroke(path);
  ctx.setLineDash([]);

  ctx.restore();
}

/**
 * Render underline action
 */
function renderUnderlineOnCanvas(
  ctx: CanvasRenderingContext2D,
  action: DrawingAction,
  progress: number,
  color: string,
  strokeWidth: number
) {
  if (!action.position) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';

  // Offset slightly below text
  const y = action.position.y + (action.fontSize || 40);
  const startX = action.position.x;
  // Estimate width based on text length if available, else 200
  const width = action.text ? action.text.length * (action.fontSize ? action.fontSize * 0.5 : 20) : 200;
  const endX = startX + (width * progress);

  ctx.beginPath();
  ctx.moveTo(startX, y);
  // Add some "hand drawn" irregularity
  const midX = startX + (endX - startX) / 2;
  ctx.quadraticCurveTo(midX, y + 2, endX, y);
  ctx.stroke();

  ctx.restore();
}

/**
 * Render highlight action
 */
function renderHighlightOnCanvas(
  ctx: CanvasRenderingContext2D,
  action: DrawingAction,
  progress: number,
  color: string
) {
  if (!action.position) return;

  ctx.save();
  ctx.fillStyle = color; // Yellow or otherwise
  ctx.globalCompositeOperation = 'multiply'; // Multiply blend mode better for highlighter
  ctx.globalAlpha = 0.4;

  const width = (action.metadata?.width || 200) * progress;
  const height = action.fontSize || 40;

  ctx.fillRect(
    action.position.x - 5,
    action.position.y,
    width,
    height
  );

  ctx.restore();
}

/**
 * Draw hand on canvas (with pen)
 */
function drawHandOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number
) {
  ctx.save();

  if (handImage && handImageLoaded) {
    // Reduced size per user request (was 600)
    const handWidth = 300;
    const handHeight = 300;

    ctx.translate(x, y);
    // Rotate 
    ctx.rotate(angle);

    // Rotate to make pen vertical
    // Image has pen pointing down-left (~45 deg from vertical).
    const rotationOffset = Math.PI / 6;
    ctx.rotate(rotationOffset);

    // After rotation, we need to adjust offset to keep tip at (0,0)
    // Scaled down offsets (approx 50% of previous -80, -550)
    // -40, -270 seems right
    ctx.drawImage(
      handImage,
      -40,  // x offset
      -270, // y offset
      handWidth,
      handHeight
    );
    ctx.restore();
    return;

  }

  // Fallback...
  ctx.fillStyle = 'red';
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Render images on canvas (VideoScribe style WIPing)
 */
function renderImagesOnCanvas(
  ctx: CanvasRenderingContext2D,
  scene: WhiteboardScene,
  elapsedTime: number,
  width: number,
  height: number
) {
  // Extract image URLs from actions or direct content
  const imageActions = scene.actions.filter(action =>
    action.type === 'image' || (action.text && action.text.includes('[IMAGE:'))
  );

  for (const action of imageActions) {
    let imageUrl = '';
    if (action.type === 'image' && (action as any).imageUrl) {
      imageUrl = (action as any).imageUrl;
    } else if (action.text && action.text.includes('[IMAGE:')) {
      const match = action.text.match(/\[IMAGE:([^\]]+)\]/);
      if (match) imageUrl = match[1];
    }

    if (imageUrl && action.position) {
      const actionState = WhiteboardEngine.getActionState(action, elapsedTime, 0);

      if (actionState.currentProgress > 0) {
        renderImageOnCanvasHelper(
          ctx,
          imageUrl,
          action.position,
          width,
          height,
          actionState.currentProgress,
          action
        );
      }
    }
  }
}

/**
 * Render a single image on canvas with "Drawing" reveal
 */
function renderImageOnCanvasHelper(
  ctx: CanvasRenderingContext2D,
  imageUrl: string,
  position: { x: number; y: number },
  width: number,
  height: number,
  progress: number,
  action: DrawingAction
) {
  // Cache for loaded images
  if (!(window as any).imageCache) {
    (window as any).imageCache = new Map<string, HTMLImageElement>();
  }
  const imageCache = (window as any).imageCache;

  let img = imageCache.get(imageUrl);

  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    imageCache.set(imageUrl, img);
  }

  if (img.complete && img.naturalWidth > 0) {
    ctx.save();

    const maxWidth = width * 0.4;
    const maxHeight = height * 0.4;
    let imgWidth = img.width;
    let imgHeight = img.height;

    // Scale down if too big
    const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
    imgWidth *= scale;
    imgHeight *= scale;

    const x = position.x - imgWidth / 2;
    const y = position.y - imgHeight / 2;

    // VideoScribe "Masking Brush" Reveal
    // We create a clipping region that expands like a scribbling motion

    ctx.beginPath();

    // Diagonal Wipe effect (simple but effective for 'drawing in')
    // We define a region that covers the image based on progress
    // A diagonal line moves from top-left to bottom-right

    const diagonalSize = imgWidth + imgHeight;
    const p = progress;

    // Create a zigzag mask to simulate sketching
    ctx.moveTo(x, y);

    // Simple diagonal reveal
    // ctx.rect(x, y, imgWidth, imgHeight * p); // vertical wipe

    // Diagonal wipe with jagged edge
    const steps = 20;
    const wipePos = (imgWidth + imgHeight) * p;

    ctx.beginPath();
    ctx.moveTo(x, y);

    // Top edge
    ctx.lineTo(x + imgWidth, y);
    // Right edge
    ctx.lineTo(x + imgWidth, y + imgHeight);
    // Bottom edge
    ctx.lineTo(x, y + imgHeight);
    ctx.closePath();

    // Clip to the image area first
    // Then mask the reveal
    // Actually, easier: Draw image, then "erase" the undrawn part?
    // Or Clip to the "drawn" part.

    // Let's do a clip path which is the "drawn" area.
    ctx.beginPath();

    // Improved diagonal wipe
    // The line is x + y = C where C grows
    // We want all points where (px - x) + (py - y) < wipePos

    ctx.rect(x, y, imgWidth, imgHeight);
    // Clip to image bounds
    ctx.clip();

    // Now create the wipe mask
    ctx.beginPath();
    // A big rectangle that rotates? Or just a set of thick lines?

    // Let's simulate a thick marker filling it in
    // ZigZag filling
    const rows = 10;
    const rowHeight = imgHeight / rows;

    // How many rows are full?
    // Map progress 0-1 to total area

    // Let's stick to diagonal wipe for simplicity & performance
    // It looks like a hand moving across
    const clipRegion = new Path2D();
    clipRegion.moveTo(x, y);
    clipRegion.lineTo(x + wipePos, y);
    clipRegion.lineTo(x, y + wipePos);
    clipRegion.closePath();

    // Use the diagonal shape to clip?
    // A "reveal" rect for simplicity in this iteration to ensure it works
    // Diagonal reveal:
    // Create a polygon: (x,y) -> (x+w*p*2, y) -> (x, y+h*p*2)
    ctx.beginPath();
    ctx.moveTo(x, y - 50); // Start above
    ctx.lineTo(x + diagonalSize * p + 50, y - 50);
    ctx.lineTo(x - 50, y + diagonalSize * p + 50);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, x, y, imgWidth, imgHeight);

    // Optional: Draw the border of the image to define it
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    // ctx.strokeRect(x, y, imgWidth, imgHeight);

    ctx.restore();

    // Update hand position to follow the "wiper"
    // Approximate position of the brush
    // It should be roughly at the edge of the wipe
    if (action && progress < 1) {
      // We can't easily return the hand position from here to the main loop without refactoring
      // But renderWhiteboardSlide logic tries to determine hand pos.
      // We can store it on the action state maybe?
      // For now, simpler to just let it hold center or not show hand on images if tricky
    }
  }
}

