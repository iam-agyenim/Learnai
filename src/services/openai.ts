const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.warn('OpenAI API key not found. Please set VITE_OPENAI_API_KEY in your .env file');
}

/**
 * Helper function to call OpenAI API
 */
async function callOpenAI(messages: Array<{ role: string; content: string }>, options: {
  model?: string;
  temperature?: number;
  max_tokens?: number;
} = {}) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || 'gpt-4o-mini',
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  return await response.json();
}

/**
 * Master prompt for whiteboard-style animated video education platform
 */
const SYSTEM_PROMPT = `You are an AI-powered education platform that produces professional, Udemy-level courses taught using animated whiteboard videos similar to VideoScribe.

You are NOT a chatbot.
You are a curriculum designer, instructor, and whiteboard video director combined.

Your responsibility is to transform ANY learning request into:
- a complete structured course
- deeply explained lessons
- real whiteboard-style animated video instructions
- interactive learning checkpoints

Your output must be structured, precise, and executable by a whiteboard animation engine.

────────────────────────────────────
GLOBAL TEACHING PRINCIPLES
────────────────────────────────────
- Teach like a top Udemy instructor
- Explain concepts deeply but clearly
- Assume the learner is a beginner
- Use simple English
- One idea at a time
- Visual explanation first, words support visuals
- Never rush
- Never overwhelm
- Always explain WHY, not just WHAT

────────────────────────────────────
WHITEBOARD VIDEO STYLE
────────────────────────────────────
- Background: Whiteboard (white background)
- Hand style: Marker hand (realistic drawing hand)
- Visual style: Hand-drawn animations
- Drawing actions: write, draw_arrow, circle, underline, box, erase, pause
- Narration: Calm, human teacher voice
- Interactivity: Enabled

────────────────────────────────────
STRICT RULES
────────────────────────────────────
- Do NOT summarize concepts
- Do NOT skip visual explanations
- Do NOT overload scenes
- Every idea must be visualized
- Output must be usable by a whiteboard animation engine
- You are building education, not content`;

/**
 * OpenAI Service
 * Handles all AI interactions for the learning platform
 */
export class OpenAIService {
  /**
   * Generate comprehensive syllabus from topic (STEP 1: COURSE ARCHITECTURE)
   */
  static async generateSyllabus(topic: string): Promise<Array<{ id: string; title: string; completed: boolean; current: boolean }>> {
    try {
      const response = await callOpenAI([
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}

────────────────────────────────────
STEP 1: COURSE ARCHITECTURE
────────────────────────────────────
Design a COMPLETE, comprehensive professional course syllabus similar to Udemy courses.

For a complete course (like Python), this should be equivalent to 6 months of learning:
- Start with fundamentals (basics, syntax, core concepts)
- Progress through intermediate topics (control flow, functions, data structures)
- Advance to expert topics (OOP, advanced features, specialized areas)
- Include practical application and problem-solving throughout
- End with real-world projects

Structure:
- Course title and description
- 5-8 major sections/modules
- 3-6 detailed lessons per section
- Logical progression from absolute beginner to advanced
- Practical exercises and real-world projects
- Specialized tracks (if applicable)

Each lesson title should be:
- Specific and descriptive
- Clear about what will be learned
- Progressive (building on previous lessons)
- Practical and applicable

Return ONLY a JSON array of lesson titles with sections. Format:
[
  {"title": "Section 1: Fundamentals", "isSection": true},
  {"title": "Introduction to [topic] Basics"},
  {"title": "Understanding Core Concepts"},
  ...
  {"title": "Section 2: Intermediate Topics", "isSection": true},
  ...
]

For a complete course like Python, generate 30-50+ lessons covering the full curriculum.`
        },
        {
          role: 'user',
          content: `Design a COMPLETE, comprehensive professional course syllabus for: ${topic}

This should be a full Udemy-style course with:

REQUIREMENTS:
- 30-50+ detailed lessons (for a complete course like Python, React, etc.)
- Multiple sections/modules (5-8 major sections)
- Complete learning path from absolute beginner to advanced
- Coverage of ALL essential topics, intermediate concepts, and specialized areas
- Emphasis on practical application and problem-solving throughout
- Real-world projects and exercises

EXAMPLE STRUCTURE (for Python):
Section 1: Python Fundamentals
- Lesson 1: Introduction to Python
- Lesson 2: Installing Python and Setting Up Your Environment
- Lesson 3: Python Syntax and Variables
- Lesson 4: Data Types in Python (Strings, Integers, Floats, Booleans)
- Lesson 5: Working with Numbers and Math Operations
- Lesson 6: String Manipulation and Formatting
- Lesson 7: Input and Output Operations

Section 2: Control Flow and Logic
- Lesson 8: Conditional Statements (if, elif, else)
- Lesson 9: Comparison Operators and Logical Operators
- Lesson 10: While Loops
- Lesson 11: For Loops and Iteration
- Lesson 12: Loop Control (break, continue, pass)
- Lesson 13: Nested Loops and Complex Logic

Section 3: Data Structures
- Lesson 14: Introduction to Lists
- Lesson 15: List Methods and Operations
- Lesson 16: Tuples
- Lesson 17: Dictionaries
- Lesson 18: Dictionary Methods
- Lesson 19: Sets
- Lesson 20: List Comprehensions

Section 4: Functions and Modules
- Lesson 21: Defining Functions
- Lesson 22: Function Parameters and Arguments
- Lesson 23: Return Values and Multiple Returns
- Lesson 24: Scope and Global Variables
- Lesson 25: Lambda Functions
- Lesson 26: Working with Modules
- Lesson 27: Creating Your Own Modules

Section 5: Object-Oriented Programming
- Lesson 28: Introduction to Classes and Objects
- Lesson 29: Creating Classes and Instances
- Lesson 30: Class Methods and Instance Methods
- Lesson 31: Inheritance
- Lesson 32: Polymorphism
- Lesson 33: Encapsulation and Private Attributes

Section 6: Advanced Topics
- Lesson 34: File Handling (Reading and Writing Files)
- Lesson 35: Exception Handling (try, except, finally)
- Lesson 36: Working with JSON Data
- Lesson 37: Regular Expressions
- Lesson 38: Generators and Iterators
- Lesson 39: Decorators

Section 7: Practical Applications
- Lesson 40: Building a CLI Application
- Lesson 41: Working with APIs
- Lesson 42: Data Processing and Analysis
- Lesson 43: Web Scraping Basics
- Lesson 44: Building a Complete Project

Section 8: Specializations
- Lesson 45: Introduction to Data Science (NumPy, Pandas)
- Lesson 46: Web Development (Django/Flask Basics)
- Lesson 47: Testing Your Code
- Lesson 48: Deployment and Best Practices
- Lesson 49: Final Project: Build a Complete Application

Follow this detailed structure for: ${topic}

User level: Beginner
Output: JSON array of lesson titles with section headers. Make it comprehensive, detailed, and complete - covering EVERYTHING a student needs to master ${topic}.`
        }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content || '[]';

      // Clean up the JSON response
      let cleanedContent = content.trim();
      cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Parse and repair JSON
      let parsed;
      try {
        parsed = this.extractAndRepairJSON(cleanedContent);
      } catch (e) {
        console.error('Failed to parse syllabus JSON:', e);
        parsed = this.generateFallbackSyllabus(topic);
      }

      // Convert to syllabus format with IDs, INCLUDING section headers for display
      const lessons: Array<{ id: string; title: string; completed: boolean; current: boolean; isSection?: boolean }> = [];
      parsed.forEach((item: any, index: number) => {
        if (item.title) {
          // Include section headers for better organization
          lessons.push({
            id: Math.random().toString(36).substring(2, 15),
            title: item.title,
            completed: false,
            current: !item.isSection && lessons.filter(l => !l.isSection).length === 0, // First non-section lesson is current
            isSection: item.isSection || false,
          });
        } else if (typeof item === 'string') {
          // Handle simple string format
          lessons.push({
            id: Math.random().toString(36).substring(2, 15),
            title: item,
            completed: false,
            current: lessons.filter(l => !l.isSection).length === 0,
            isSection: false,
          });
        }
      });

      // If no lessons were extracted, create fallback
      if (lessons.length === 0) {
        return this.generateFallbackSyllabus(topic).map((title: string, index: number) => ({
          id: Math.random().toString(36).substring(2, 15),
          title,
          completed: false,
          current: index === 0,
        }));
      }

      return lessons;
    } catch (error) {
      console.error('Error generating syllabus:', error);
      // Fallback to simple syllabus
      return [
        { id: '1', title: `Introduction to ${topic}`, completed: false, current: true },
        { id: '2', title: `${topic} Fundamentals`, completed: false, current: false },
        { id: '3', title: `Advanced ${topic}`, completed: false, current: false },
      ];
    }
  }

  /**
   * Generate fallback syllabus if AI response fails
   */
  private static generateFallbackSyllabus(topic: string): any[] {
    // Generate a comprehensive fallback syllabus with sections
    return [
      { title: `Section 1: ${topic} Fundamentals`, isSection: true },
      { title: `Introduction to ${topic}` },
      { title: `Getting Started with ${topic}` },
      { title: `Core Concepts of ${topic}` },
      { title: `Essential ${topic} Basics` },
      { title: `Setting Up Your Environment` },
      { title: `Section 2: Intermediate ${topic}`, isSection: true },
      { title: `Working with ${topic} Tools` },
      { title: `Building Your First Project` },
      { title: `Advanced Concepts` },
      { title: `Section 3: Advanced ${topic}`, isSection: true },
      { title: `Expert-Level Techniques` },
      { title: `Best Practices and Patterns` },
      { title: `Real-World Applications` },
      { title: `Final Project: Complete ${topic} Application` },
    ];
  }

  /**
   * Generate AI response message
   */
  static async generateAIResponse(
    userMessage: string,
    isFirstMessage: boolean,
    topic?: string
  ): Promise<string> {
    try {
      const systemPrompt = isFirstMessage
        ? `${SYSTEM_PROMPT}

You are a professional educator. The user wants to learn about "${topic || userMessage}".
Respond warmly and professionally in EXACTLY 2 sentences maximum. Be brief and encouraging.`
        : `${SYSTEM_PROMPT}

You are a professional educator helping the user continue their learning journey.
Respond briefly, helpfully, and professionally. Keep responses to EXACTLY 2 sentences maximum.`;

      const response = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 150,
      });

      const content = response.choices[0]?.message?.content || `I'm excited to help you learn ${topic || 'this topic'}. Let's get started!`;
      // Ensure response is limited to 2 sentences
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      return sentences.slice(0, 2).join('. ').trim() + (sentences.length > 0 ? '.' : '');
    } catch (error) {
      console.error('Error generating AI response:', error);
      return `I'm excited to help you learn ${topic || 'this topic'}. Let's get started!`;
    }
  }

  /**
   * Generate video lesson content (WHITEBOARD VIDEO STYLE)
   * Now accepts a specific lesson title to follow the syllabus
   */
  static async generateVideoContent(
    topic: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
    lessonTitle?: string
  ): Promise<{
    slides: Array<{
      id: string;
      type: string;
      duration: number;
      content: Array<any>;
      background?: any;
      voiceScript: string;
    }>;
  }> {
    try {
      const response = await callOpenAI([
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}

────────────────────────────────────
STEP 3: SCENE-BY-SCENE STORYBOARD
────────────────────────────────────
Break the lesson into 4–8 scenes (slides).

Each scene must:
- Teach ONE concept
- Be 10–25 seconds long
- Use drawings, arrows, circles, highlights
- Feel like a real whiteboard explanation

────────────────────────────────────
STEP 4: WHITEBOARD ANIMATION INSTRUCTIONS
────────────────────────────────────
For EACH scene, generate precise visual elements.

Each scene MUST include:
- Scene goal
- Background type: whiteboard (white background #ffffff)
- Ordered visual elements that appear sequentially
- Drawing-style animations (hand-drawn appearance)

Visual elements can be:
- Text (handwritten style with "draw" animation)
- Icons (drawn style)
- Arrows and shapes (for emphasis)
- Circles and highlights (for emphasis)

────────────────────────────────────
STEP 5: NARRATION SCRIPT
────────────────────────────────────
Write narration that:
- Explains exactly what is being drawn
- Syncs with visual appearance order
- Sounds like a Udemy instructor
- Uses simple English
- Explains concepts clearly and confidently
- Explains WHY, not just WHAT

────────────────────────────────────
OUTPUT FORMAT (MANDATORY)
────────────────────────────────────
Return ONLY valid JSON:
{
  "slides": [
    {
      "type": "title",
      "duration": 5,
      "content": [
        {
          "type": "icon",
          "iconName": "lightbulb",
          "style": {"x": "50%", "y": "30%", "width": 200, "color": "#1a1a1a"},
          "animation": {"type": "draw", "duration": 2000}
        },
        {
          "type": "heading",
          "content": "Topic Name",
          "style": {"fontSize": "5.5rem", "fontWeight": "bold", "textAlign": "center", "color": "#e21717ff"},
          "animation": {"type": "draw", "duration": 2500, "delay": 1000}
        }
      ],
      "background": {"color": "#ffffff"},
      "voiceScript": "Welcome! Today we're exploring [topic]. Let me show you how this works."
    },
    {
      "type": "content",
      "duration": 15,
      "content": [
        {
          "type": "heading",
          "content": "Key Concept",
          "style": {"fontSize": "2.5rem", "fontWeight": "bold", "textAlign": "left", "color": "#0f0303ff", "x": "10%", "y": "15%"},
          "animation": {"type": "draw", "duration": 2000, "delay": 500}
        },
        {
          "type": "text",
          "content": "Simple explanation",
          "style": {"fontSize": "1.5rem", "textAlign": "left", "color": "#333333", "x": "10%", "y": "30%"},
          "animation": {"type": "draw", "duration": 3000, "delay": 1500}
        },
        {
          "type": "icon",
          "iconName": "arrow",
          "style": {"x": "50%", "y": "60%", "width": 150, "color": "#4a9eff"},
          "animation": {"type": "draw", "duration": 1500, "delay": 3000}
        }
      ],
      "background": {"color": "#ffffff"},
      "voiceScript": "Here's the main idea. Think of it this way: [explanation]. Notice how this works..."
    }
  ]
}

CRITICAL RULES:
- Background is ALWAYS white (#ffffff) - whiteboard style
- Text colors: dark colors (#1a1a1a for headings, #333333 for body text)
- Use "draw" animation for ALL text to create hand-drawn VideoScribe effect
- Keep text SHORT (3-7 words per element maximum)
- Use icons, arrows, and visual elements liberally
- Every slide should have visual elements that draw in sequence
- Narration must explain what's appearing as it draws
- Each scene: 10-25 seconds
- Total video: 5-10 minutes
- Teach deeply, explain WHY
- Visual explanation first, words support visuals
- One concept per scene

Available icons: "lightbulb", "code", "book", "check", "arrow", "star", "gear", "rocket"

IMAGES AND VISUALS (PROFESSIONAL UDEMY STYLE):
- For complex concepts, include "image" type content items
- Images should be educational, clear, and support the explanation
- Use images for: diagrams, examples, real-world applications, code screenshots, architecture diagrams
- Image descriptions should be specific and educational
- Format: {"type": "image", "imagePrompt": "detailed description for image generation", "style": {"x": "50%", "y": "50%", "width": 600, "height": 400}}

PROFESSIONAL FEATURES:
- Use diagrams for complex relationships
- Include code examples with syntax highlighting
- Add visual flowcharts and process diagrams
- Use comparison tables (visualized)
- Include real-world examples with images

You are directing a whiteboard animation video. Think like VideoScribe - hand-drawn, sequential, visual-first. Make it professional like Udemy courses.`
        },
        {
          role: 'user',
          content: `Create a professional whiteboard-style animated learning video${lessonTitle ? ` for the lesson: "${lessonTitle}"` : ` about: ${topic}`}

${lessonTitle ? `This lesson is part of a comprehensive course on: ${topic}` : ''}

User level: ${difficulty}
Teaching depth: Professional / Udemy-level
Video style: Whiteboard hand-drawn animation
Background: Whiteboard (white)
Hand style: Marker hand (realistic)
Duration: 5-10 minutes total

${lessonTitle ? `Focus specifically on teaching: ${lessonTitle}. Make sure to cover this lesson comprehensively and in detail.` : ''}

Generate 4-8 scenes that teach this${lessonTitle ? ' lesson' : ' topic'} deeply with visual-first explanations, hand-drawn animations, and clear narration.`
        }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content || '{"slides":[]}';

      // Clean up the JSON response
      let cleanedContent = content.trim();
      // Remove markdown code blocks if present
      cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Parse and repair JSON
      let parsed;
      try {
        parsed = this.extractAndRepairJSON(cleanedContent);
      } catch (e) {
        console.error('Failed to parse video content JSON:', e);
        throw new Error('Could not parse video storyboard. Returning fallback.');
      }

      // Add IDs to slides and ensure proper structure (whiteboard style)
      const slides = (parsed.slides || []).map((slide: any) => ({
        ...slide,
        id: slide.id || Math.random().toString(36).substring(2, 15),
        type: slide.type || 'content',
        duration: slide.duration || 10,
        content: (slide.content || []).map((item: any) => ({
          ...item,
          type: item.type || 'text',
          style: {
            ...(item.style || {}),
            // Ensure whiteboard-appropriate colors if not specified
            color: item.style?.color || (item.type === 'heading' ? '#1a1a1a' : '#333333'),
          },
          animation: item.animation || { type: 'draw', duration: 2000 },
          // Preserve image prompt if present
          imagePrompt: item.imagePrompt,
        })),
        background: slide.background || { color: '#ffffff' }, // White background for whiteboard
        voiceScript: slide.voiceScript || '',
      }));

      // Generate images for slides that have image prompts (PROFESSIONAL UDEMY FEATURE)
      const slidesWithImages = await Promise.all(
        slides.map(async (slide: any) => {
          const contentWithImages = await Promise.all(
            slide.content.map(async (item: any) => {
              if (item.type === 'image' && item.imagePrompt) {
                try {
                  console.log('Generating image for prompt:', item.imagePrompt);
                  const imageUrl = await OpenAIService.generateImage(item.imagePrompt);
                  console.log('Image generated:', imageUrl);
                  return {
                    ...item,
                    imageUrl,
                  };
                } catch (error) {
                  console.warn('Failed to generate image:', error);
                  // Fallback to icon if image generation fails
                  return {
                    ...item,
                    type: 'icon',
                    iconName: 'image',
                    imageUrl: undefined,
                  };
                }
              }
              return item;
            })
          );
          return {
            ...slide,
            content: contentWithImages,
          };
        })
      );

      return { slides: slidesWithImages };
    } catch (error) {
      console.error('Error generating video content:', error);
      // Return a simple whiteboard-style fallback slide
      return {
        slides: [
          {
            id: Math.random().toString(36).substring(2, 15),
            type: 'title',
            duration: 5,
            content: [{
              type: 'heading',
              content: topic,
              style: { fontSize: '4rem', fontWeight: 'bold', textAlign: 'center', color: '#1a1a1a' },
              animation: { type: 'draw', duration: 2500 }
            }],
            background: { color: '#ffffff' }, // White background
            voiceScript: `Welcome! Today we're exploring ${topic}. Let me show you how this works.`,
          },
        ],
      };
    }
  }

  /**
   * Generate lesson content for a specific syllabus item
   */
  static async generateLessonContent(
    lessonTitle: string,
    topic: string
  ): Promise<string> {
    try {
      const response = await callOpenAI([
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}

Generate comprehensive lesson content for "${lessonTitle}" as part of learning "${topic}".
Use simple English, professional tone, and practical examples.
Return detailed, educational content that explains the concept clearly.`
        },
        {
          role: 'user',
          content: `Create lesson content for: ${lessonTitle}`
        }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || `This lesson covers ${lessonTitle}.`;
    } catch (error) {
      console.error('Error generating lesson content:', error);
      return `Let's learn about ${lessonTitle}.`;
    }
  }

  /**
   * Generate simpler explanation (STEP 6: ADAPTIVE EXPLANATION)
   */
  static async generateSimplerExplanation(
    topic: string,
    originalContent?: string
  ): Promise<string> {
    try {
      const response = await callOpenAI([
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}

### STEP 6: ADAPTIVE EXPLANATION
The learner asked for a simpler explanation. You must:
- Adjust depth and complexity to be even more beginner-friendly
- Use clearer, simpler examples
- Break down concepts into smaller pieces
- Use analogies that are easy to understand
- Maintain professional tone
- Keep explanations concise but thorough
- Never assume prior knowledge

Think of explaining it to someone completely new to the topic.`
        },
        {
          role: 'user',
          content: originalContent
            ? `Explain this more simply, like I'm a complete beginner:\n\n${originalContent}\n\nTopic: ${topic}`
            : `Explain ${topic} more simply, like I'm a complete beginner. Use very simple language and clear examples.`
        }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 500,
      });

      return response.choices[0]?.message?.content || `Let me explain ${topic} more simply.`;
    } catch (error) {
      console.error('Error generating simpler explanation:', error);
      return `Let me explain ${topic} more simply.`;
    }
  }

  /**
   * Generate deeper explanation (STEP 6: ADAPTIVE EXPLANATION)
   */
  static async generateDeeperExplanation(
    topic: string,
    currentLevel: string = 'beginner'
  ): Promise<string> {
    try {
      const response = await callOpenAI([
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}

### STEP 6: ADAPTIVE EXPLANATION
The learner wants to go deeper. You must:
- Provide more advanced details and nuances
- Discuss underlying principles and concepts
- Show connections to related topics
- Use technical terms with clear definitions
- Maintain professional tone
- Keep it structured and clear
- Build on what they already know`
        },
        {
          role: 'user',
          content: `Go deeper into ${topic}. The learner is currently at ${currentLevel} level. Provide more advanced insights and details while keeping it clear.`
        }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 800,
      });

      return response.choices[0]?.message?.content || `Let's dive deeper into ${topic}.`;
    } catch (error) {
      console.error('Error generating deeper explanation:', error);
      return `Let's dive deeper into ${topic}.`;
    }
  }

  /**
   * Generate example (STEP 6: ADAPTIVE EXPLANATION)
   */
  static async generateExample(
    topic: string,
    concept?: string
  ): Promise<string> {
    try {
      const response = await callOpenAI([
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}

### STEP 6: ADAPTIVE EXPLANATION
The learner wants more examples. You must:
- Provide real-life, practical examples
- Make examples relatable and easy to understand
- Show different scenarios where the concept applies
- Use concrete, specific examples
- Connect examples to the main concept clearly
- Keep it concise and focused`
        },
        {
          role: 'user',
          content: concept
            ? `Give me a clear, practical example of ${concept} in the context of ${topic}.`
            : `Give me a clear, practical example related to ${topic}.`
        }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 400,
      });

      return response.choices[0]?.message?.content || `Here's an example related to ${topic}.`;
    } catch (error) {
      console.error('Error generating example:', error);
      return `Here's an example related to ${topic}.`;
    }
  }

  /**
   * Generate practice exercise (STEP 5: PRACTICE EXERCISE)
   */
  static async generatePracticeExercise(
    topic: string,
    lessonTitle?: string
  ): Promise<{
    exercise: string;
    instructions: string;
    expectedOutcome?: string;
    hint?: string;
  }> {
    try {
      const response = await callOpenAI([
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}

### STEP 5: PRACTICE EXERCISE
Create a practical exercise that:
- Reinforces the lesson through action
- Has clear, step-by-step instructions
- Is beginner-friendly but meaningful
- Has a defined expected outcome
- Includes an optional hint if needed
- Is practical and hands-on

Return JSON in this format:
{
  "exercise": "Exercise title",
  "instructions": "Step-by-step instructions...",
  "expectedOutcome": "What the learner should achieve",
  "hint": "Optional hint if they get stuck"
}`
        },
        {
          role: 'user',
          content: lessonTitle
            ? `Create a practical exercise for the lesson "${lessonTitle}" about ${topic}.`
            : `Create a practical exercise for learning ${topic}.`
        }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 600,
      });

      const content = response.choices[0]?.message?.content || '{}';
      let parsed;
      try {
        parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
      } catch (e) {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error('Could not parse exercise JSON');
        }
      }

      return {
        exercise: parsed.exercise || `Practice Exercise: ${topic}`,
        instructions: parsed.instructions || `Complete this exercise about ${topic}.`,
        expectedOutcome: parsed.expectedOutcome,
        hint: parsed.hint,
      };
    } catch (error) {
      console.error('Error generating practice exercise:', error);
      return {
        exercise: `Practice Exercise: ${topic}`,
        instructions: `Complete this exercise about ${topic}. Follow the steps carefully.`,
      };
    }
  }

  /**
   * Generate course project (STEP 7: COURSE PROJECT)
   */
  static async generateCourseProject(
    topic: string,
    completedLessons: string[] = []
  ): Promise<{
    project: string;
    description: string;
    successCriteria: string[];
    skillsApplied: string[];
    instructions: string;
  }> {
    try {
      const response = await callOpenAI([
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}

### STEP 7: COURSE PROJECT
Generate a real-world final project that:
- Is beginner-friendly but meaningful
- Defines clear success criteria
- Explains what skills are applied
- Provides step-by-step instructions
- Creates a tangible outcome
- Is practical and applicable

Return JSON in this format:
{
  "project": "Project title",
  "description": "Brief project description",
  "successCriteria": ["Criterion 1", "Criterion 2"],
  "skillsApplied": ["Skill 1", "Skill 2"],
  "instructions": "Step-by-step project instructions"
}`
        },
        {
          role: 'user',
          content: `Create a final project for ${topic}. 
          
Completed lessons: ${completedLessons.join(', ') || 'Introduction'}
Make it beginner-friendly but meaningful and practical.`
        }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content || '{}';
      let parsed;
      try {
        parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
      } catch (e) {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error('Could not parse project JSON');
        }
      }

      return {
        project: parsed.project || `Final Project: ${topic}`,
        description: parsed.description || `A practical project applying what you've learned about ${topic}.`,
        successCriteria: parsed.successCriteria || ['Project is complete', 'Demonstrates understanding'],
        skillsApplied: parsed.skillsApplied || [topic],
        instructions: parsed.instructions || `Build a project that applies ${topic} concepts.`,
      };
    } catch (error) {
      console.error('Error generating course project:', error);
      return {
        project: `Final Project: ${topic}`,
        description: `A practical project applying what you've learned about ${topic}.`,
        successCriteria: ['Project is complete', 'Demonstrates understanding'],
        skillsApplied: [topic],
        instructions: `Build a project that applies ${topic} concepts.`,
      };
    }
  }

  /**
   * Generate image using OpenAI DALL-E 3
   * Professional Udemy-style educational images
   */
  static async generateImage(
    prompt: string,
    size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024'
  ): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `Professional educational illustration for online course: ${prompt}. Clean, clear, professional style suitable for learning. Simple, easy to understand, whiteboard-friendly aesthetic.`,
          size: size,
          quality: 'standard',
          n: 1,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(error.error?.message || 'DALL-E API error');
      }

      const data = await response.json();
      const imageUrl = data.data[0]?.url;

      if (!imageUrl) {
        throw new Error('No image URL returned from DALL-E');
      }

      return imageUrl;
    } catch (error) {
      console.error('Error generating image with DALL-E:', error);
      throw error;
    }
  }

  /**
   * Generate multiple images for a lesson (batch processing with rate limiting)
   */
  static async generateImagesForLesson(
    imagePrompts: string[],
    size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024'
  ): Promise<string[]> {
    // Generate images in parallel (but limit to avoid rate limits)
    const batchSize = 2; // DALL-E 3 has stricter rate limits
    const results: string[] = [];

    for (let i = 0; i < imagePrompts.length; i += batchSize) {
      const batch = imagePrompts.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(prompt => this.generateImage(prompt, size))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.warn(`Failed to generate image ${i + index}:`, result.reason);
          results.push(''); // Empty string as placeholder
        }
      });

      // Delay between batches to avoid rate limits (DALL-E 3 is slower)
      if (i + batchSize < imagePrompts.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    return results;
  }

  /**
   * Generate a cover image for the lesson
   * Now defaults to DALL-E 3 (AI) for maximum relevance, with Unsplash as a fallback.
   */
  static async generateCoverImage(topic: string, useAI: boolean = true): Promise<string> {
    if (!useAI) {
      // Return a professional tech placeholder instead of random service
      return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop';
    }

    try {
      const prompt = `Create a modern, clean, flat-design educational illustration for a lesson about "${topic}". 
      Style: Minimalist, vibrant colors, vector art style. 
      Components: One central visual metaphor representing the main concept. 
      Background: Solid, light, clean background color (white or very light grey).
      No text, just the illustration.`;

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          style: "vivid"
        }),
      });

      if (!response.ok) {
        throw new Error('Image generation failed');
      }

      const data = await response.json();
      return data.data[0].url;
    } catch (error) {
      console.error('Error generating cover image:', error);
      // Fallback to a stable, high-quality educational image
      return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop';
    }
  }

  /**
   * Extract and repair JSON from AI response
   */
  private static extractAndRepairJSON(content: string): any {
    let cleanedContent = content.trim();

    // Remove markdown code blocks if present
    cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      return JSON.parse(cleanedContent);
    } catch (e) {
      console.warn('[OpenAIService] Standard JSON parse failed, attempting repair...');

      // Attempt to extract the last valid JSON structure
      const jsonMatch = cleanedContent.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (jsonMatch) {
        try {
          let jsonString = jsonMatch[0];

          // Truncation repair: Close open brackets if missing
          const openBrackets = (jsonString.match(/\[/g) || []).length;
          const closeBrackets = (jsonString.match(/\]/g) || []).length;
          const openCurly = (jsonString.match(/\{/g) || []).length;
          const closeCurly = (jsonString.match(/\{/g) || []).length; // Oops, typo in previous turn
          const closeCurlyReal = (jsonString.match(/\}/g) || []).length;

          if (openBrackets > closeBrackets) {
            jsonString += ']'.repeat(openBrackets - closeBrackets);
          }
          if (openCurly > closeCurlyReal) {
            jsonString += '}'.repeat(openCurly - closeCurlyReal);
          }

          return JSON.parse(jsonString);
        } catch (e2) {
          console.error('[OpenAIService] JSON repair failed:', e2);
          throw e2;
        }
      }
      throw e;
    }
  }
}

