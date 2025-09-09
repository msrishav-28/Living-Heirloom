import { useState, useEffect } from 'react';
import { Sparkles, Brain, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/stores/capsuleStore';

interface LLMLoadingProgressProps {
  onComplete?: () => void;
  className?: string;
}

export const LLMLoadingProgress = ({ onComplete, className }: LLMLoadingProgressProps) => {
  const { aiLoadingProgress, isAIReady } = useAppStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (aiLoadingProgress && aiLoadingProgress.progress > 0 && !isAIReady) {
      setIsVisible(true);
    }
    
    if (isAIReady && isVisible) {
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 1000);
    }
  }, [aiLoadingProgress, isAIReady, isVisible, onComplete]);

  if (!isVisible || !aiLoadingProgress) return null;

  const progress = aiLoadingProgress.progress * 100;

  return (
    <div className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center ${className || ''}`}>
      <Card className="card-sacred max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary to-primary-glow rounded-3xl flex items-center justify-center animate-pulse-soft">
            <Brain className="w-10 h-10 text-white" />
          </div>
          
          <h3 className="text-xl font-serif font-medium mb-2">
            Loading AI Brain
          </h3>
          
          <p className="text-muted-foreground mb-6">
            Preparing GPT-OSS for emotionally intelligent conversations...
          </p>
          
          <div className="space-y-4">
            <Progress value={progress} className="h-3" />
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4 animate-pulse" />
              <span>{aiLoadingProgress.text || 'Initializing...'}</span>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {Math.round(progress)}% complete
            </div>
          </div>
          
          <div className="mt-6 p-3 bg-primary/5 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-primary font-medium">
                This happens once and enables AI-powered interviews
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Compact version for inline use
export const AILoadingIndicator = ({ className }: { className?: string }) => {
  const { aiLoadingProgress, isAIReady } = useAppStore();
  
  if (!aiLoadingProgress || isAIReady) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full ${className || ''}`}>
      <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs text-primary font-medium">
        AI Loading... {Math.round(aiLoadingProgress.progress * 100)}%
      </span>
    </div>
  );
};