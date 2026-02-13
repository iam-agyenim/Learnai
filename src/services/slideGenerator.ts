import type { Slide, SlideContent, VideoSlides } from '@/types/slides';
import type { WhiteboardScene } from '@/types/whiteboard';
import { WhiteboardSceneGenerator } from './whiteboardSceneGenerator';

const generateId = () => Math.random().toString(36).substring(2, 15);

/**
 * Slide Generator Service
 * Generates programmatic slides from lesson content
 */
export class SlideGeneratorService {
  /**
   * Generate slides from AI-generated content
   */
  static generateSlidesFromAI(
    aiContent: { slides: any[] },
    topic: string
  ): VideoSlides {
    // Convert slides to whiteboard scenes first (action-based drawing)
    const whiteboardScenes = WhiteboardSceneGenerator.convertSlidesToWhiteboardScenes(
      aiContent.slides,
      topic
    );

    // Transform whiteboard scenes back to slides format (for compatibility)
    // Store whiteboard scene data in slide metadata AND keep some content for fallback
    const slides: Slide[] = whiteboardScenes.map((scene, index) => {
      // Extract content from actions for fallback (text and images)
      const fallbackContent = scene.actions
        .filter(action => {
          // Include text actions
          if (action.type === 'write' && action.text) return true;
          // Include image references
          if (action.text && action.text.includes('[IMAGE:')) return true;
          return false;
        })
        .map(action => {
          // Handle image references
          if (action.text && action.text.includes('[IMAGE:')) {
            const imageMatch = action.text.match(/\[IMAGE:([^\]]+)\]/);
            if (imageMatch && imageMatch[1]) {
              return {
                type: 'image' as const,
                imageUrl: imageMatch[1],
                style: {
                  x: action.position?.x || 960,
                  y: action.position?.y || 540,
                  width: 600,
                  height: 400,
                },
              };
            }
          }
          // Handle text actions
          return {
            type: 'text' as const,
            content: action.text || '',
            style: {
              fontSize: `${(action.fontSize || 48) / 24}rem`,
              color: action.color || '#1a1a1a',
              x: action.position?.x || 960,
              y: action.position?.y || 540,
            },
          };
        });

      return {
        id: scene.id,
        type: 'content' as const,
        duration: scene.totalDuration,
        content: fallbackContent.length > 0 ? fallbackContent : [
          {
            type: 'text' as const,
            content: `Scene ${index + 1}`,
            style: {
              fontSize: '2rem',
              color: '#1a1a1a',
            },
          },
        ], // Keep fallback content for compatibility
        background: { color: '#ffffff' }, // White background for whiteboard
        voiceScript: scene.narration || '',
        // Store whiteboard scene in metadata
        metadata: { whiteboardScene: scene },
      };
    });

    const totalDuration = slides.reduce((acc, slide) => acc + slide.duration, 0);

    return {
      id: generateId(),
      title: `Introduction to ${topic}`,
      topic,
      slides,
      metadata: {
        totalDuration,
        aspectRatio: '16:9',
        resolution: {
          width: 1920,
          height: 1080,
        },
        whiteboardScenes, // Store whiteboard scenes for renderer
      } as any,
    };
  }

  /**
   * Generate slides from topic/content (Legacy - kept for fallback)
   */
  static async generateSlides(
    topic: string,
    content?: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
  ): Promise<VideoSlides> {
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));

    const topicLower = topic.toLowerCase();
    
    // Generate slides based on topic type
    let slides: Slide[];
    if (topicLower.includes('python') || topicLower.includes('programming')) {
      slides = this.generateProgrammingSlides(topic, difficulty);
    } else if (topicLower.includes('design') || topicLower.includes('ui') || topicLower.includes('ux')) {
      slides = this.generateDesignSlides(topic, difficulty);
    } else {
      slides = this.generateGenericSlides(topic, difficulty);
    }

    const totalDuration = slides.reduce((acc, slide) => acc + slide.duration, 0);

    return {
      id: generateId(),
      title: `Introduction to ${topic}`,
      topic,
      slides,
      metadata: {
        totalDuration,
        aspectRatio: '16:9',
        resolution: {
          width: 1920,
          height: 1080,
        },
      },
    };
  }

  private static generateProgrammingSlides(
    topic: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  ): Slide[] {
    return [
      // Title slide
      {
        id: generateId(),
        type: 'title',
        duration: 4,
        content: [
          {
            type: 'heading',
            content: topic,
            style: {
              fontSize: '4rem',
              fontWeight: 'bold',
              textAlign: 'center',
              color: '#ffffff',
            },
            animation: {
              type: 'fade',
              duration: 1000,
            },
          },
        ],
        background: {
          gradient: ['#1a1a1a', '#2d2d2d'],
        },
        voiceScript: `Welcome to this comprehensive lesson on ${topic}. I'm excited to guide you through this fundamental programming concept step by step.`,
      },
      // Introduction slide
      {
        id: generateId(),
        type: 'content',
        duration: 8,
        content: [
          {
            type: 'heading',
            content: 'What is it?',
            style: {
              fontSize: '2.5rem',
              fontWeight: 'bold',
              textAlign: 'left',
              color: '#ffffff',
            },
            animation: {
              type: 'slide',
              duration: 600,
            },
          },
          {
            type: 'text',
            content: `${topic} is a fundamental concept that serves as the building blocks of programming. Understanding this concept will help you write better code and solve problems more effectively.`,
            style: {
              fontSize: '1.5rem',
              textAlign: 'left',
              color: '#e0e0e0',
              lineHeight: '1.8',
            },
            animation: {
              type: 'fade',
              duration: 800,
              delay: 400,
            },
          },
        ],
        background: {
          color: '#1a1a1a',
        },
        voiceScript: `Let's start by understanding what ${topic} is. ${topic} is a fundamental concept that serves as the building blocks of programming. Understanding this concept will help you write better code and solve problems more effectively in your programming journey.`,
      },
      // Why it matters slide
      {
        id: generateId(),
        type: 'bullet',
        duration: 10,
        content: [
          {
            type: 'heading',
            content: 'Why is it important?',
            style: {
              fontSize: '2.5rem',
              fontWeight: 'bold',
              textAlign: 'left',
              color: '#ffffff',
            },
            animation: {
              type: 'fade',
              duration: 500,
            },
          },
          {
            type: 'bullet',
            content: 'It provides the foundation for advanced programming concepts',
            style: {
              fontSize: '1.4rem',
              textAlign: 'left',
              color: '#e0e0e0',
            },
            animation: {
              type: 'fade',
              duration: 500,
              delay: 300,
            },
          },
          {
            type: 'bullet',
            content: 'Mastering this will make complex topics easier to understand',
            style: {
              fontSize: '1.4rem',
              textAlign: 'left',
              color: '#e0e0e0',
            },
            animation: {
              type: 'fade',
              duration: 500,
              delay: 600,
            },
          },
          {
            type: 'bullet',
            content: "You'll use this concept in almost every program you write",
            style: {
              fontSize: '1.4rem',
              textAlign: 'left',
              color: '#e0e0e0',
            },
            animation: {
              type: 'fade',
              duration: 500,
              delay: 900,
            },
          },
        ],
        background: {
          color: '#1a1a1a',
        },
        voiceScript: `Now, why is ${topic} important? First, it provides the foundation for advanced programming concepts. Second, mastering this will make complex topics easier to understand later. And third, you'll use this concept in almost every program you write.`,
      },
      // Code example slide
      {
        id: generateId(),
        type: 'code',
        duration: 12,
        content: [
          {
            type: 'heading',
            content: 'Let\'s see it in action',
            style: {
              fontSize: '2rem',
              fontWeight: 'bold',
              textAlign: 'left',
              color: '#ffffff',
            },
            animation: {
              type: 'fade',
              duration: 500,
            },
          },
          {
            type: 'code',
            content: this.getCodeExample(topic),
            style: {
              fontSize: '1.1rem',
              textAlign: 'left',
              color: '#ffffff',
            },
            animation: {
              type: 'fade',
              duration: 1000,
              delay: 500,
            },
          },
        ],
        background: {
          color: '#1a1a1a',
        },
        voiceScript: `Let's see ${topic} in action with a practical example. Here's a code snippet that demonstrates how this concept works in real code. I'll walk you through each line so you understand what's happening.`,
      },
      // Explanation slide
      {
        id: generateId(),
        type: 'content',
        duration: 10,
        content: [
          {
            type: 'heading',
            content: 'How it works',
            style: {
              fontSize: '2.5rem',
              fontWeight: 'bold',
              textAlign: 'left',
              color: '#ffffff',
            },
          },
          {
            type: 'text',
            content: `In the example above, we can see how ${topic} is used in practice. Each element serves a specific purpose and contributes to the overall functionality. As you practice more, you'll start to recognize patterns and apply these concepts naturally.`,
            style: {
              fontSize: '1.4rem',
              textAlign: 'left',
              color: '#e0e0e0',
              lineHeight: '1.8',
            },
          },
        ],
        background: {
          color: '#1a1a1a',
        },
        voiceScript: `In the example above, we can see how ${topic} is used in practice. Each element serves a specific purpose and contributes to the overall functionality. As you practice more with similar examples, you'll start to recognize patterns and apply these concepts naturally in your own code.`,
      },
      // Key points slide
      {
        id: generateId(),
        type: 'bullet',
        duration: 12,
        content: [
          {
            type: 'heading',
            content: 'Key Takeaways',
            style: {
              fontSize: '2.5rem',
              fontWeight: 'bold',
              textAlign: 'left',
              color: '#ffffff',
            },
          },
          {
            type: 'bullet',
            content: 'Understand the fundamental concepts deeply',
            style: {
              fontSize: '1.4rem',
              textAlign: 'left',
              color: '#e0e0e0',
            },
            animation: {
              type: 'fade',
              duration: 500,
              delay: 300,
            },
          },
          {
            type: 'bullet',
            content: 'Practice with real-world examples regularly',
            style: {
              fontSize: '1.4rem',
              textAlign: 'left',
              color: '#e0e0e0',
            },
            animation: {
              type: 'fade',
              duration: 500,
              delay: 600,
            },
          },
          {
            type: 'bullet',
            content: 'Build projects to reinforce your learning',
            style: {
              fontSize: '1.4rem',
              textAlign: 'left',
              color: '#e0e0e0',
            },
            animation: {
              type: 'fade',
              duration: 500,
              delay: 900,
            },
          },
          {
            type: 'bullet',
            content: "Don't be afraid to experiment and make mistakes",
            style: {
              fontSize: '1.4rem',
              textAlign: 'left',
              color: '#e0e0e0',
            },
            animation: {
              type: 'fade',
              duration: 500,
              delay: 1200,
            },
          },
        ],
        background: {
          color: '#1a1a1a',
        },
        voiceScript: `Before we wrap up, let me share some key takeaways. First, understand the fundamental concepts deeply. Second, practice with real-world examples regularly. Third, build projects to reinforce your learning. And finally, don't be afraid to experiment and make mistakes - that's how you truly learn.`,
      },
      // Closing slide
      {
        id: generateId(),
        type: 'content',
        duration: 6,
        content: [
          {
            type: 'heading',
            content: 'You\'re ready!',
            style: {
              fontSize: '3rem',
              fontWeight: 'bold',
              textAlign: 'center',
              color: '#ffffff',
            },
          },
          {
            type: 'text',
            content: 'Keep practicing and you\'ll master this concept in no time.',
            style: {
              fontSize: '1.5rem',
              textAlign: 'center',
              color: '#e0e0e0',
            },
          },
        ],
        background: {
          gradient: ['#1a1a1a', '#2d2d2d'],
        },
        voiceScript: `Great work! You've completed this lesson on ${topic}. Keep practicing what you've learned, and you'll master this concept in no time. Ready to continue learning?`,
      },
    ];
  }

  private static generateDesignSlides(
    topic: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  ): Slide[] {
    return [
      {
        id: generateId(),
        type: 'title',
        duration: 4,
        content: [
          {
            type: 'heading',
            content: topic,
            style: {
              fontSize: '4rem',
              fontWeight: 'bold',
              textAlign: 'center',
              color: '#ffffff',
            },
            animation: {
              type: 'fade',
              duration: 1000,
            },
          },
        ],
        background: {
          gradient: ['#1a1a1a', '#2d2d2d'],
        },
        voiceScript: `Welcome to this comprehensive lesson on ${topic}. Design is a fascinating field that combines creativity with functionality. Let's dive in and explore the fundamentals together.`,
      },
      {
        id: generateId(),
        type: 'content',
        duration: 10,
        content: [
          {
            type: 'heading',
            content: 'Design Principles',
            style: {
              fontSize: '2.5rem',
              fontWeight: 'bold',
              textAlign: 'left',
              color: '#ffffff',
            },
            animation: {
              type: 'slide',
              duration: 600,
            },
          },
          {
            type: 'text',
            content: 'Design is about creating experiences that are both beautiful and functional. Great design solves problems while delighting users. It requires understanding user needs, visual aesthetics, and technical constraints.',
            style: {
              fontSize: '1.4rem',
              textAlign: 'left',
              color: '#e0e0e0',
              lineHeight: '1.8',
            },
            animation: {
              type: 'fade',
              duration: 800,
              delay: 400,
            },
          },
        ],
        background: {
          color: '#1a1a1a',
        },
        voiceScript: `Let's start with design principles. Design is about creating experiences that are both beautiful and functional. Great design solves problems while delighting users. It requires understanding user needs, visual aesthetics, and technical constraints all working together.`,
      },
      {
        id: generateId(),
        type: 'bullet',
        duration: 12,
        content: [
          {
            type: 'heading',
            content: 'Key Design Elements',
            style: {
              fontSize: '2.5rem',
              fontWeight: 'bold',
              textAlign: 'left',
              color: '#ffffff',
            },
          },
          {
            type: 'bullet',
            content: 'Balance and proportion create visual harmony',
            style: {
              fontSize: '1.4rem',
              textAlign: 'left',
              color: '#e0e0e0',
            },
            animation: {
              type: 'fade',
              duration: 500,
              delay: 300,
            },
          },
          {
            type: 'bullet',
            content: 'Color theory guides emotional responses',
            style: {
              fontSize: '1.4rem',
              textAlign: 'left',
              color: '#e0e0e0',
            },
            animation: {
              type: 'fade',
              duration: 500,
              delay: 600,
            },
          },
          {
            type: 'bullet',
            content: 'Typography affects readability and tone',
            style: {
              fontSize: '1.4rem',
              textAlign: 'left',
              color: '#e0e0e0',
            },
            animation: {
              type: 'fade',
              duration: 500,
              delay: 900,
            },
          },
          {
            type: 'bullet',
            content: 'Whitespace provides clarity and focus',
            style: {
              fontSize: '1.4rem',
              textAlign: 'left',
              color: '#e0e0e0',
            },
            animation: {
              type: 'fade',
              duration: 500,
              delay: 1200,
            },
          },
        ],
        background: {
          color: '#1a1a1a',
        },
        voiceScript: `Now let's look at key design elements. First, balance and proportion create visual harmony in your designs. Second, color theory guides emotional responses from your users. Third, typography affects readability and sets the tone. And finally, whitespace provides clarity and helps users focus on what matters.`,
      },
      {
        id: generateId(),
        type: 'content',
        duration: 8,
        content: [
          {
            type: 'heading',
            content: 'Putting it all together',
            style: {
              fontSize: '2.5rem',
              fontWeight: 'bold',
              textAlign: 'left',
              color: '#ffffff',
            },
          },
          {
            type: 'text',
            content: 'Remember, great design is iterative. Start with user research, create prototypes, test with real users, and refine based on feedback. Every great design started as a rough sketch.',
            style: {
              fontSize: '1.4rem',
              textAlign: 'left',
              color: '#e0e0e0',
              lineHeight: '1.8',
            },
          },
        ],
        background: {
          color: '#1a1a1a',
        },
        voiceScript: `Let's talk about putting it all together. Remember, great design is iterative. Start with user research, create prototypes, test with real users, and refine based on feedback. Every great design you see started as a rough sketch.`,
      },
    ];
  }

  private static generateGenericSlides(
    topic: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  ): Slide[] {
    return [
      {
        id: generateId(),
        type: 'title',
        duration: 3,
        content: [
          {
            type: 'heading',
            content: topic,
            style: {
              fontSize: '4rem',
              fontWeight: 'bold',
              textAlign: 'center',
              color: '#ffffff',
            },
            animation: {
              type: 'fade',
              duration: 800,
            },
          },
        ],
        background: {
          gradient: ['#1a1a1a', '#2d2d2d'],
        },
        voiceScript: `Let's dive into ${topic}.`,
      },
      {
        id: generateId(),
        type: 'content',
        duration: 5,
        content: [
          {
            type: 'text',
            content: `I'll break this down into simple, easy-to-understand concepts.`,
            style: {
              fontSize: '1.5rem',
              textAlign: 'center',
              color: '#e0e0e0',
            },
          },
        ],
        background: {
          color: '#1a1a1a',
        },
        voiceScript: `I'll break this down into simple, easy-to-understand concepts.`,
      },
    ];
  }

  private static getCodeExample(topic: string): string {
    if (topic.toLowerCase().includes('variable')) {
      return `# Variables in Python\nname = "LearnAI"\nage = 25\nis_student = True`;
    }
    return `# Example code\nprint("Hello, ${topic}!")`;
  }
}

