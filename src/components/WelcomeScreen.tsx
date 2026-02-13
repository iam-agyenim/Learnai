import { Sparkles } from 'lucide-react';

export function WelcomeScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-xl text-center space-y-6 animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6 text-background" />
        </div>

        <h1 className="text-3xl font-semibold text-foreground">
          What are you working on?
        </h1>

        <p className="text-muted-foreground text-base">
          Tell me what you want to learn, and I'll create personalized video lessons and a complete learning path just for you.
        </p>
      </div>
    </div>
  );
}
