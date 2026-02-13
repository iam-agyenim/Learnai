/**
 * Utility to convert text to SVG paths for stroke animation
 * Creates handwritten-style vector paths from text
 */

import { Position } from '@/types/whiteboard';

interface PathSegment {
  d: string;
  length: number;
}

// Handwritten letter paths - each letter as continuous strokes
const LETTER_PATHS: Record<string, string[]> = {
  'P': [
    'M 0 30 L 0 0 C 20 0 25 5 25 10 C 25 18 15 20 0 20'
  ],
  'Y': [
    'M 0 0 L 12 15 L 12 30',
    'M 24 0 L 12 15'
  ],
  'T': [
    'M 0 0 L 24 0',
    'M 12 0 L 12 30'
  ],
  'H': [
    'M 0 0 L 0 30',
    'M 0 15 L 20 15',
    'M 20 0 L 20 30'
  ],
  'O': [
    'M 12 0 C -2 0 -2 30 12 30 C 26 30 26 0 12 0'
  ],
  'N': [
    'M 0 30 L 0 0 L 20 30 L 20 0'
  ],
  'R': [
    'M 0 30 L 0 0 C 20 0 22 8 20 12 C 18 16 10 16 0 16',
    'M 10 16 L 22 30'
  ],
  'G': [
    'M 24 6 C 18 0 6 0 2 10 C -2 20 2 30 12 30 C 22 30 24 22 24 16 L 14 16'
  ],
  'A': [
    'M 0 30 L 12 0 L 24 30',
    'M 6 18 L 18 18'
  ],
  'M': [
    'M 0 30 L 0 0 L 14 20 L 28 0 L 28 30'
  ],
  'I': [
    'M 0 0 L 16 0',
    'M 8 0 L 8 30',
    'M 0 30 L 16 30'
  ],
  'L': [
    'M 0 0 L 0 30 L 20 30'
  ],
  'E': [
    'M 20 0 L 0 0 L 0 30 L 20 30',
    'M 0 15 L 16 15'
  ],
  'S': [
    'M 22 6 C 18 0 6 0 4 6 C 0 14 20 16 22 24 C 24 32 6 32 2 26'
  ],
  'C': [
    'M 24 6 C 18 0 6 0 2 10 C -2 22 6 30 14 30 C 20 30 24 26 24 26'
  ],
  'D': [
    'M 0 0 L 0 30 L 8 30 C 26 30 26 0 8 0 L 0 0'
  ],
  'U': [
    'M 0 0 L 0 20 C 0 32 22 32 22 20 L 22 0'
  ],
  'W': [
    'M 0 0 L 7 30 L 14 10 L 21 30 L 28 0'
  ],
  'B': [
    'M 0 0 L 0 30',
    'M 0 0 C 18 0 18 14 0 14 C 20 14 20 30 0 30'
  ],
  'F': [
    'M 20 0 L 0 0 L 0 30',
    'M 0 14 L 16 14'
  ],
  'V': [
    'M 0 0 L 12 30 L 24 0'
  ],
  'K': [
    'M 0 0 L 0 30',
    'M 22 0 L 0 16 L 22 30'
  ],
  'X': [
    'M 0 0 L 24 30',
    'M 24 0 L 0 30'
  ],
  'Z': [
    'M 0 0 L 24 0 L 0 30 L 24 30'
  ],
  'J': [
    'M 0 0 L 20 0',
    'M 14 0 L 14 24 C 14 32 0 32 0 24'
  ],
  'Q': [
    'M 12 0 C -2 0 -2 30 12 30 C 26 30 26 0 12 0',
    'M 16 22 L 26 32'
  ],
  // Lowercase letters
  'a': [
    'M 0 20 C 0 10 8 8 12 10 C 16 8 24 10 24 20 C 24 30 16 32 12 30 C 8 32 0 30 0 20',
    'M 12 20 L 12 30'
  ],
  'b': [
    'M 0 0 L 0 30',
    'M 0 15 C 0 8 6 6 12 8 C 18 6 24 8 24 15 C 24 22 18 24 12 22 C 6 24 0 22 0 15'
  ],
  'c': [
    'M 24 10 C 20 6 8 6 4 10 C 0 16 4 24 12 26 C 20 24 24 16 24 10'
  ],
  'd': [
    'M 24 0 L 24 30',
    'M 24 15 C 24 8 18 6 12 8 C 6 6 0 8 0 15 C 0 22 6 24 12 22 C 18 24 24 22 24 15'
  ],
  'e': [
    'M 0 18 L 24 18',
    'M 0 18 C 0 8 8 6 16 8 C 24 6 24 16 20 20 C 16 24 8 24 4 20'
  ],
  'f': [
    'M 12 0 L 12 30',
    'M 0 8 L 20 8',
    'M 8 20 C 12 20 16 22 16 26'
  ],
  'g': [
    'M 12 15 C 12 8 6 6 0 8 C -4 10 -4 18 0 20 C 6 22 12 20 12 15',
    'M 12 20 L 12 30 C 12 36 6 38 2 36'
  ],
  'h': [
    'M 0 0 L 0 30',
    'M 0 15 L 12 15',
    'M 12 15 C 12 8 18 6 24 8 C 24 14 24 20 24 30'
  ],
  'i': [
    'M 8 0 L 8 20',
    'M 8 30 C 8 28 10 28 10 30 C 10 32 8 32 8 30'
  ],
  'j': [
    'M 12 0 L 12 20',
    'M 12 20 C 12 28 6 30 2 28',
    'M 12 30 C 12 28 14 28 14 30 C 14 32 12 32 12 30'
  ],
  'k': [
    'M 0 0 L 0 30',
    'M 0 15 L 16 0',
    'M 0 15 L 16 30'
  ],
  'l': [
    'M 8 0 L 8 30',
    'M 8 30 L 4 26'
  ],
  'm': [
    'M 0 30 L 0 10 C 0 6 4 4 8 6 C 12 4 16 6 16 10 L 16 30',
    'M 16 10 C 16 6 20 4 24 6 C 28 4 32 6 32 10 L 32 30'
  ],
  'n': [
    'M 0 30 L 0 10 C 0 6 4 4 8 6 C 12 4 16 6 16 10 L 16 30'
  ],
  'o': [
    'M 12 10 C 6 8 0 10 0 18 C 0 26 6 28 12 26 C 18 28 24 26 24 18 C 24 10 18 8 12 10'
  ],
  'p': [
    'M 0 30 L 0 0',
    'M 0 15 C 0 8 6 6 12 8 C 18 6 24 8 24 15 C 24 22 18 24 12 22 C 6 24 0 22 0 15'
  ],
  'q': [
    'M 24 30 L 24 0',
    'M 24 15 C 24 8 18 6 12 8 C 6 6 0 8 0 15 C 0 22 6 24 12 22 C 18 24 24 22 24 15',
    'M 18 22 L 28 32'
  ],
  'r': [
    'M 0 0 L 0 30',
    'M 0 15 C 0 10 4 8 8 10 C 12 8 16 10 16 15'
  ],
  's': [
    'M 20 8 C 16 4 4 4 2 8 C 0 14 18 16 20 22 C 22 28 6 30 2 26'
  ],
  't': [
    'M 8 0 L 8 30',
    'M 0 8 L 20 8'
  ],
  'u': [
    'M 0 10 C 0 6 4 4 8 6 C 12 4 16 6 16 10 L 16 30',
    'M 16 10 C 16 6 20 4 24 6 C 28 4 32 6 32 10 L 32 30'
  ],
  'v': [
    'M 0 10 L 16 30 L 32 10'
  ],
  'w': [
    'M 0 10 L 8 30 L 16 10 L 24 30 L 32 10'
  ],
  'x': [
    'M 0 10 L 16 20 L 32 10',
    'M 32 30 L 16 20 L 0 30'
  ],
  'y': [
    'M 0 10 L 16 20 L 16 30',
    'M 32 10 L 16 20'
  ],
  'z': [
    'M 0 10 L 32 10 L 0 30 L 32 30'
  ],
  // Numbers
  '0': [
    'M 12 0 C 2 0 0 8 0 18 C 0 28 2 30 12 30 C 22 30 24 28 24 18 C 24 8 22 0 12 0',
    'M 0 0 L 24 30'
  ],
  '1': [
    'M 8 0 L 8 30',
    'M 0 8 L 8 0 L 16 0'
  ],
  '2': [
    'M 0 8 C 0 0 12 0 16 4 C 20 8 20 16 4 30 L 24 30'
  ],
  '3': [
    'M 0 6 C 0 0 10 0 14 4 C 18 8 14 12 10 12',
    'M 0 24 C 0 30 10 30 14 26 C 18 22 14 18 10 18'
  ],
  '4': [
    'M 0 20 L 16 0 L 16 30',
    'M 0 12 L 24 12'
  ],
  '5': [
    'M 20 0 L 4 0 L 4 14 C 4 18 8 20 12 18 C 16 16 20 18 20 22 C 20 28 12 30 4 28'
  ],
  '6': [
    'M 20 8 C 18 4 10 2 6 6 C 2 10 2 20 6 24 C 10 28 18 26 20 22 C 20 18 16 16 12 18'
  ],
  '7': [
    'M 0 0 L 20 0',
    'M 20 0 L 8 30'
  ],
  '8': [
    'M 12 0 C 4 0 0 6 0 14 C 0 18 2 20 6 18',
    'M 12 30 C 4 30 0 24 0 16 C 0 12 2 10 6 12'
  ],
  '9': [
    'M 4 8 C 6 4 14 2 18 6 C 22 10 22 20 18 24 C 14 28 6 26 4 22 C 4 18 8 16 12 18'
  ],
  ' ': [],
  '.': ['M 4 28 C 4 26 6 26 6 28 C 6 30 4 30 4 28'],
  ',': ['M 6 26 C 8 26 8 30 4 34'],
  '!': ['M 8 0 L 8 20', 'M 8 26 L 8 28'],
  '?': ['M 2 6 C 2 0 14 0 14 8 C 14 14 8 16 8 22', 'M 8 28 L 8 30'],
  '-': ['M 0 14 L 16 14'],
  ':': ['M 8 8 L 8 10', 'M 8 22 L 8 24'],
  "'": ['M 8 0 L 8 8'],
  '/': ['M 0 0 L 24 30'],
};

// Generate a simple handwritten path for any character
function getCharacterPath(char: string, x: number, y: number, scale: number): string[] {
  const paths = LETTER_PATHS[char] || LETTER_PATHS[char.toUpperCase()];
  
  if (!paths || paths.length === 0) {
    // For unknown characters, create a simple placeholder
    if (char !== ' ') {
      return [`M ${x} ${y} L ${x + 15 * scale} ${y} L ${x + 15 * scale} ${y + 25 * scale} L ${x} ${y + 25 * scale} Z`];
    }
    return [];
  }

  // Transform each path to the target position
  return paths.map(path => transformPathString(path, x, y, scale));
}

function transformPathString(pathStr: string, offsetX: number, offsetY: number, scale: number): string {
  // Parse and transform all coordinates in the path
  return pathStr.replace(/([MLCQSTZ])\s*([-\d.\s,]+)?/gi, (match, cmd, coords) => {
    if (!coords) return cmd;
    
    const numbers = coords.trim().split(/[\s,]+/).map(Number);
    const transformed: number[] = [];
    
    for (let i = 0; i < numbers.length; i += 2) {
      if (i + 1 < numbers.length) {
        transformed.push(numbers[i] * scale + offsetX);
        transformed.push(numbers[i + 1] * scale + offsetY);
      }
    }
    
    return `${cmd} ${transformed.join(' ')}`;
  });
}

export function textToPathSegments(
  text: string, 
  startPos: Position, 
  scale: number = 1
): PathSegment[] {
  const segments: PathSegment[] = [];
  let currentX = startPos.x;
  const baseY = startPos.y;
  const letterWidth = 28 * scale;
  const spaceWidth = 16 * scale;
  
  for (const char of text) {
    if (char === ' ') {
      currentX += spaceWidth;
      continue;
    }
    
    const charPaths = getCharacterPath(char, currentX, baseY, scale);
    
    for (const path of charPaths) {
      segments.push({
        d: path,
        length: estimatePathLength(path),
      });
    }
    
    currentX += letterWidth;
  }
  
  return segments;
}

function estimatePathLength(pathDef: string): number {
  // Rough estimate based on path complexity
  const commands = pathDef.match(/[MLCQSTZ]/gi) || [];
  return Math.max(commands.length * 40, 60);
}

export function generateUnderlinePath(
  startX: number, 
  endX: number, 
  y: number
): string {
  const wave = 2;
  const midX = (startX + endX) / 2;
  return `M ${startX} ${y} Q ${midX} ${y + wave} ${endX} ${y}`;
}

export function generateCirclePath(
  centerX: number, 
  centerY: number, 
  radius: number
): string {
  const r = radius;
  const k = 0.552284749831; // Bezier approximation for circle
  
  return `
    M ${centerX} ${centerY - r}
    C ${centerX + r * k} ${centerY - r} ${centerX + r} ${centerY - r * k} ${centerX + r} ${centerY}
    C ${centerX + r} ${centerY + r * k} ${centerX + r * k} ${centerY + r} ${centerX} ${centerY + r}
    C ${centerX - r * k} ${centerY + r} ${centerX - r} ${centerY + r * k} ${centerX - r} ${centerY}
    C ${centerX - r} ${centerY - r * k} ${centerX - r * k} ${centerY - r} ${centerX} ${centerY - r}
  `.trim().replace(/\s+/g, ' ');
}

export function generateArrowPath(
  from: Position,
  to: Position,
  curve: number = 0
): { linePath: string; headPath: string } {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const perpX = -dy * curve;
  const perpY = dx * curve;
  const controlX = midX + perpX;
  const controlY = midY + perpY;
  
  const linePath = curve === 0 
    ? `M ${from.x} ${from.y} L ${to.x} ${to.y}`
    : `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
  
  // Arrow head
  const angle = Math.atan2(to.y - (curve === 0 ? from.y : controlY), to.x - (curve === 0 ? from.x : controlX));
  const headLength = 14;
  const headAngle = Math.PI / 6;
  
  const head1X = to.x - headLength * Math.cos(angle - headAngle);
  const head1Y = to.y - headLength * Math.sin(angle - headAngle);
  const head2X = to.x - headLength * Math.cos(angle + headAngle);
  const head2Y = to.y - headLength * Math.sin(angle + headAngle);
  
  const headPath = `M ${head1X} ${head1Y} L ${to.x} ${to.y} L ${head2X} ${head2Y}`;
  
  return { linePath, headPath };
}

