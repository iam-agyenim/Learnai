import type { VideoLesson, UserInteractionData } from '@/types/learning';

/**
 * Adaptive Learning Service
 * Tracks user behavior and adjusts difficulty/content accordingly
 */
export class AdaptiveLearningService {
  /**
   * Update lesson difficulty based on user interactions
   */
  static updateLessonDifficulty(
    lesson: VideoLesson,
    interactions: UserInteractionData[]
  ): VideoLesson {
    if (!lesson.adaptiveDifficulty) {
      return lesson;
    }

    const lessonInteractions = interactions.filter(i => 
      lesson.scenes.some(s => s.id === i.sceneId)
    );

    // Calculate understanding score (0-1)
    const correctAnswers = lessonInteractions.filter(i => i.wasCorrect === true).length;
    const totalQuestions = lessonInteractions.filter(i => i.interactionType === 'check_understanding').length;
    const understandingScore = totalQuestions > 0 ? correctAnswers / totalQuestions : 0.5;

    // Count pauses and replays
    const pauses = lessonInteractions.filter(i => i.paused).length;
    const replays = lessonInteractions.filter(i => i.replayed).length;
    const wrongAnswers = lessonInteractions.filter(i => i.wasCorrect === false).length;

    // Average time spent (normalized)
    const avgTimeSpent = lessonInteractions.length > 0
      ? lessonInteractions.reduce((sum, i) => sum + i.timeSpent, 0) / lessonInteractions.length
      : 0;

    // Determine difficulty level
    let difficultyLevel: 'beginner' | 'intermediate' | 'advanced' = lesson.adaptiveDifficulty.level;
    
    if (understandingScore < 0.5 || wrongAnswers > 2 || pauses > 3) {
      difficultyLevel = 'beginner';
    } else if (understandingScore > 0.8 && wrongAnswers === 0 && pauses < 1) {
      difficultyLevel = 'advanced';
    } else {
      difficultyLevel = 'intermediate';
    }

    return {
      ...lesson,
      adaptiveDifficulty: {
        ...lesson.adaptiveDifficulty,
        level: difficultyLevel,
        userUnderstanding: understandingScore,
        pauses: pauses,
        replays: replays,
        wrongAnswers: wrongAnswers,
      },
    };
  }

  /**
   * Check if user needs simpler explanation
   */
  static shouldSimplify(lesson: VideoLesson): boolean {
    if (!lesson.adaptiveDifficulty) return false;
    
    return (
      lesson.adaptiveDifficulty.userUnderstanding < 0.4 ||
      lesson.adaptiveDifficulty.wrongAnswers > 2 ||
      lesson.adaptiveDifficulty.pauses > 3
    );
  }

  /**
   * Check if user can handle more advanced content
   */
  static canAdvance(lesson: VideoLesson): boolean {
    if (!lesson.adaptiveDifficulty) return false;
    
    return (
      lesson.adaptiveDifficulty.userUnderstanding > 0.8 &&
      lesson.adaptiveDifficulty.wrongAnswers === 0 &&
      lesson.adaptiveDifficulty.pauses <= 1
    );
  }

  /**
   * Get recommended next difficulty
   */
  static getRecommendedDifficulty(lesson: VideoLesson): 'beginner' | 'intermediate' | 'advanced' {
    if (!lesson.adaptiveDifficulty) return 'beginner';

    if (this.shouldSimplify(lesson)) {
      return 'beginner';
    } else if (this.canAdvance(lesson)) {
      return 'advanced';
    } else {
      return 'intermediate';
    }
  }
}


