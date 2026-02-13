# OpenAI Integration Setup

## ✅ What's Connected

Your OpenAI API key is now integrated into the project. The system uses OpenAI for:

1. **Syllabus Generation** - Creates personalized learning syllabi
2. **AI Responses** - Generates conversational responses to users
3. **Video Content Generation** - Creates slide content for interactive videos
4. **Lesson Content** - Generates detailed lesson explanations

## 🔑 API Key Configuration

Your API key is stored in `.env` file:
```
VITE_OPENAI_API_KEY=sk-proj-...
```

⚠️ **Important**: The `.env` file is in `.gitignore` to keep your key secure. Never commit it to version control.

## 🚀 How It Works

### User Flow:
1. User asks to learn something (e.g., "Teach me Python")
2. **OpenAI generates syllabus** → 6-8 lesson titles
3. **OpenAI generates video slides** → 4-6 slides with content, animations, and voice scripts
4. **OpenAI generates AI response** → Conversational reply
5. Video is rendered from slides with TTS narration

### Services:
- `OpenAIService.generateSyllabus()` - Creates learning syllabus
- `OpenAIService.generateAIResponse()` - Generates chat responses
- `OpenAIService.generateVideoContent()` - Creates video slide content
- `OpenAIService.generateLessonContent()` - Creates detailed lesson content

## ⚠️ Browser API Limitations

**Important Note**: OpenAI API calls from the browser may be blocked by CORS policies. 

For MVP: The code is structured correctly and will work if:
- You add a backend API proxy, OR
- OpenAI enables CORS for your domain (unlikely for production)

### Recommended: Add Backend Proxy

For production, create a simple backend API endpoint:

```javascript
// backend/api/openai-proxy.js
app.post('/api/openai', async (req, res) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req.body),
  });
  const data = await response.json();
  res.json(data);
});
```

Then update `src/services/openai.ts` to call your proxy instead of OpenAI directly.

## 📝 Removed Demo Content

All hardcoded/demo content has been removed:
- ❌ Template-based syllabus generation
- ❌ Mock video content
- ❌ Static AI responses

Now everything is powered by OpenAI GPT-4o-mini!

## 🔧 Environment Variables

Make sure your `.env` file exists with:
```
VITE_OPENAI_API_KEY=your-key-here
```

The app reads this via `import.meta.env.VITE_OPENAI_API_KEY`.

## 🎯 What's Generated

1. **Syllabus**: 6-8 lesson titles tailored to the topic
2. **Video Slides**: 4-6 slides with:
   - Text content
   - Animations
   - Voice narration scripts
   - Background styling
3. **AI Responses**: Contextual, conversational messages

All content is now AI-generated and personalized to each user's request!


