/**
 * Text-to-Speech Service
 * Handles voice narration for video scenes
 */
export class TTSService {
  private static synthesis: SpeechSynthesis | null = null;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;
  private static voicesLoaded: Promise<void> | null = null;

  static init() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;

      // Initialize voice loading promise
      this.voicesLoaded = new Promise((resolve) => {
        const voices = this.synthesis?.getVoices() || [];
        if (voices.length > 0) {
          resolve();
        } else {
          let resolved = false;
          const onVoicesChanged = () => {
            if (!resolved) {
              resolved = true;
              console.log('[TTSService] Voices loaded event fired');
              resolve();
            }
          };
          window.speechSynthesis.onvoiceschanged = onVoicesChanged;

          // Safety timeout - don't wait forever
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              console.warn('[TTSService] Voice loading timed out, proceeding with default');
              resolve();
            }
          }, 2000);
        }
      });
    }
  }

  /**
   * Speak text with natural voice
   */
  static async speak(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      volume?: number;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    if (!this.synthesis) {
      this.init();
    }

    if (!this.synthesis) {
      console.warn('Speech synthesis not available');
      if (options?.onEnd) setTimeout(options.onEnd, 100);
      return;
    }

    // Wait for voices to be ready
    if (this.voicesLoaded) {
      await this.voicesLoaded;
    }

    return new Promise((resolve, reject) => {
      // Stop any current speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);

      // Configure voice
      utterance.rate = options?.rate ?? 0.9;
      utterance.pitch = options?.pitch ?? 1;
      utterance.volume = options?.volume ?? 1;

      // Try to use a natural-sounding voice
      const voices = this.synthesis?.getVoices() || [];
      console.log(`[TTSService] Available voices: ${voices.length}`);

      const preferredVoices = voices.filter(v =>
        v.lang.startsWith('en') && (
          v.name.includes('Samantha') ||
          v.name.includes('Alex') ||
          v.name.includes('Daniel') ||
          v.name.includes('Google US English') ||
          v.name.includes('Google')
        )
      );

      if (preferredVoices.length > 0) {
        utterance.voice = preferredVoices[0];
        console.log(`[TTSService] Using voice: ${utterance.voice.name}`);
      } else if (voices.length > 0) {
        utterance.voice = voices[0]; // Fallback to first available
        console.log(`[TTSService] Using fallback voice: ${utterance.voice.name}`);
      } else {
        console.warn('[TTSService] No voices found, using default');
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        if (options?.onEnd) options.onEnd();
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        console.error('[TTSService] Speech error:', event);
        const error = new Error(`Speech synthesis error: ${event.error}`);
        if (options?.onError) {
          options.onError(error);
        }
        reject(error);
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);

      // Safety check: is it actually speaking?
      if (!this.synthesis.speaking && !this.synthesis.pending) {
        console.warn('[TTSService] speak() called but not speaking. Browser policy?');
      }
    });
  }

  /**
   * Stop current speech
   */
  static stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.currentUtterance = null;
    }
  }

  /**
   * Pause current speech
   */
  static pause() {
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.pause();
    }
  }

  /**
   * Resume paused speech
   */
  static resume() {
    if (this.synthesis && this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  /**
   * Check if speech is currently active
   */
  static isSpeaking(): boolean {
    return this.synthesis?.speaking ?? false;
  }

  /**
   * Get available voices
   */
  static getVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) {
      this.init();
    }
    return this.synthesis?.getVoices() ?? [];
  }
}

// Initialize on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    TTSService.init();
  });
}


