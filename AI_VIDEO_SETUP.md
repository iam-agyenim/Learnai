# AI Video Generation Setup

This project now supports multiple AI video generation APIs for creating high-quality educational videos.

## Supported Providers

1. **RunwayML Gen-3** (Recommended) - Best for educational content
2. **Luma Dream Machine** - Fast and reliable
3. **Stability AI** - Stable Video Diffusion
4. **Pika Labs** - Alternative option

## Setup Instructions

### Environment Variables

For Vite projects, use `VITE_` prefix. Add to your `.env` file:

```bash
# RunwayML (Recommended)
VITE_RUNWAY_API_KEY=your_runway_api_key_here

# Or use without prefix (will work in some setups)
RUNWAY_API_KEY=your_runway_api_key_here
```

### 1. RunwayML (Recommended)

1. Sign up at [RunwayML](https://runwayml.com)
2. Get your API key from the dashboard
3. Add to your `.env` file (see above)

### 2. Luma Dream Machine

1. Sign up at [Luma Labs](https://lumalabs.ai)
2. Get your API key from the dashboard
3. Add to your `.env` file:

```bash
VITE_LUMA_API_KEY=your_luma_api_key_here
```

### 3. Stability AI

1. Sign up at [Stability AI](https://platform.stability.ai)
2. Get your API key from the dashboard
3. Add to your `.env` file:

```bash
VITE_STABILITY_API_KEY=your_stability_api_key_here
```

### 4. Pika Labs

1. Sign up at [Pika Labs](https://pika.art)
2. Get your API key from the dashboard
3. Add to your `.env` file:

```bash
VITE_PIKA_API_KEY=your_pika_api_key_here
```

## How It Works

The system automatically:
1. **Tries AI video generation first** (if API keys are available)
2. **Falls back to canvas rendering** if AI generation fails
3. **Falls back to slide-based rendering** as final fallback

The video exporter will automatically detect which providers have API keys configured and use the first available one.

## Usage in Code

```typescript
import { VideoExporterService } from '@/services/videoExporter';

// Automatic provider selection
const videoUrl = await VideoExporterService.exportToMP4(slides);

// Force specific provider
const videoUrl = await VideoExporterService.exportToMP4(slides, {
  provider: 'runway', // or 'luma', 'stability', 'pika'
  style: 'whiteboard',
});

// Check available providers
import { AIVideoGeneratorService } from '@/services/aiVideoGenerator';
const available = AIVideoGeneratorService.getAvailableProviders();
console.log('Available providers:', available);
```

## Pricing Notes

- **RunwayML**: Pay-as-you-go, ~$0.05-0.25 per video
- **Luma**: Free tier available, paid plans for more
- **Stability AI**: Pay-as-you-go pricing
- **Pika Labs**: Various pricing tiers

Check each provider's website for current pricing.

## Benefits of AI Video Generation

✅ **Higher Quality**: Professional-grade video output
✅ **Faster**: Generate videos without browser rendering
✅ **Scalable**: Works server-side or client-side
✅ **Consistent**: No browser compatibility issues
✅ **Realistic**: More natural animations

## Fallback Behavior

If no API keys are configured or AI generation fails, the system will:
1. Try canvas-based video generation (browser-based)
2. Fall back to slide-based rendering (real-time canvas)

This ensures the system always works, even without API keys!

