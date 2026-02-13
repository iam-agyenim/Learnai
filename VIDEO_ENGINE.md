# Video Engine Architecture

## Overview

The application now uses a **programmatic slides → video** approach for MVP:

1. **Generate animated slides** from lesson content
2. **Add motion** and animations
3. **Add voice** (TTS)
4. **Export MP4** video

## Architecture

### 1. Slide Generation (`slideGenerator.ts`)

- `SlideGeneratorService.generateSlides()` - Creates slide data structures from topics
- Supports different slide types: title, content, bullet, code, diagram
- Each slide includes:
  - Content (text, headings, code, etc.)
  - Animations (fade, slide, zoom, typewriter)
  - Background (colors, gradients)
  - Voice script for TTS

### 2. Video Export (`videoExporter.ts`)

- `VideoExporterService.exportToMP4()` - Exports slides to MP4
- **MVP**: Returns placeholder URLs
- **Production**: Would use Remotion to render React components → MP4

### 3. Integration

- `useLearning` hook generates slides and exports videos
- Videos are displayed using the standard `VideoPlayer` component
- Videos are MP4 files that can be played in any HTML5 video player

## Current Implementation (MVP)

For MVP, the system:
- ✅ Generates slide data structures
- ✅ Simulates video generation
- ✅ Returns video URLs (placeholders)
- ✅ Uses standard HTML5 video player

## Production Implementation

To implement actual video generation:

1. **Install Remotion**:
   ```bash
   npm install remotion
   ```

2. **Create Remotion compositions** from slides:
   - Convert slide data to Remotion React components
   - Add animations using Remotion's animation API
   - Add TTS audio tracks

3. **Render videos**:
   - Use Remotion's `renderMedia()` API
   - Export to MP4
   - Upload to storage (S3, Cloudflare R2, etc.)

4. **Update `VideoExporterService`**:
   - Replace placeholder with actual Remotion rendering
   - Add audio synthesis
   - Handle video upload

## Benefits

- ✅ Fast generation (slides → video pipeline)
- ✅ Clean, Apple-style visuals
- ✅ Cost-effective (programmatic generation)
- ✅ Scalable (generate videos on-demand)
- ✅ Consistent quality

## Future Enhancements

- Add Remotion integration for actual video rendering
- Implement TTS voice synthesis
- Add more animation types
- Support custom templates
- Add video caching/optimization


