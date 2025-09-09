import { useState, useEffect, useCallback } from 'react';
import { webLLMManager } from '@/lib/ai/webllm-manager';
import { useAppStore } from '@/stores/capsuleStore';
import { db } from '@/lib/db/database';

export interface UseAIReturn {
  isReady: boolean;
  isLoading: boolean;
  loadingProgress: number;
  error: string | null;
  generateQuestion: (responses: Record<string, string>, emotion: string, category: string, index: number) => Promise<string>;
  generateContent: (responses: Record<string, string>, tone: string, length: string) => Promise<any>;
  analyzeEmotion: (text: string) => Promise<string>;
  initialize: () => Promise<void>;
}

export const useAI = (): UseAIReturn => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const { isAIEnabled, setAIReady, setAILoadingProgress } = useAppStore();

  // Initialize AI on mount if enabled
  useEffect(() => {
    if (isAIEnabled && !isReady && !isLoading) {
      initialize();
    }
  }, [isAIEnabled]);

  // Listen for AI progress events
  useEffect(() => {
    const handleProgress = (event: CustomEvent) => {
      const progress = event.detail;
      setLoadingProgress(progress.progress * 100);
      setAILoadingProgress(progress);
      
      if (progress.stage === 'ready') {
        setIsReady(true);
        setIsLoading(false);
        setAIReady(true);
        setError(null);
      } else if (progress.stage === 'error') {
        setError('AI initialization failed');
        setIsLoading(false);
        setAIReady(false);
      }
    };

    window.addEventListener('ai-progress', handleProgress as EventListener);
    return () => window.removeEventListener('ai-progress', handleProgress as EventListener);
  }, [setAIReady, setAILoadingProgress]);

  const initialize = useCallback(async () => {
    if (!isAIEnabled || isLoading || isReady) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const startTime = Date.now();
      await webLLMManager.initialize();
      const loadTime = Date.now() - startTime;
      
      // Track performance
      await db.updateAIModelPerformance('webllm', { loadTime });
      
      setIsReady(true);
      setAIReady(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize AI';
      setError(errorMessage);
      setAIReady(false);
      console.error('AI initialization failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAIEnabled, isLoading, isReady, setAIReady]);

  const generateQuestion = useCallback(async (
    responses: Record<string, string>,
    emotion: string,
    category: string,
    index: number
  ): Promise<string> => {
    if (!isReady || !isAIEnabled) {
      throw new Error('AI not ready');
    }

    try {
      const startTime = Date.now();
      const result = await webLLMManager.generateInterviewQuestion(responses, emotion, category, index);
      const responseTime = Date.now() - startTime;
      
      // Track performance
      await db.updateAIModelPerformance('webllm', { 
        averageResponseTime: responseTime,
        successRate: 1 
      });
      
      return result.content;
    } catch (err) {
      console.error('Failed to generate question:', err);
      
      // Track failure
      await db.updateAIModelPerformance('webllm', { successRate: 0 });
      
      throw err;
    }
  }, [isReady, isAIEnabled]);

  const generateContent = useCallback(async (
    responses: Record<string, string>,
    tone: string = 'heartfelt',
    length: string = 'medium'
  ) => {
    if (!isReady || !isAIEnabled) {
      throw new Error('AI not ready');
    }

    try {
      const startTime = Date.now();
      const result = await webLLMManager.generateTimeCapsuleContent(responses, tone, length);
      const responseTime = Date.now() - startTime;
      
      // Track performance
      await db.updateAIModelPerformance('webllm', { 
        averageResponseTime: responseTime,
        successRate: 1 
      });
      
      return result;
    } catch (err) {
      console.error('Failed to generate content:', err);
      
      // Track failure
      await db.updateAIModelPerformance('webllm', { successRate: 0 });
      
      throw err;
    }
  }, [isReady, isAIEnabled]);

  const analyzeEmotion = useCallback(async (text: string): Promise<string> => {
    if (!isReady || !isAIEnabled) {
      // Fallback emotion analysis
      return analyzeEmotionFallback(text);
    }

    try {
      return await webLLMManager.analyzeEmotionalState(text);
    } catch (err) {
      console.error('Failed to analyze emotion:', err);
      return analyzeEmotionFallback(text);
    }
  }, [isReady, isAIEnabled]);

  return {
    isReady,
    isLoading,
    loadingProgress,
    error,
    generateQuestion,
    generateContent,
    analyzeEmotion,
    initialize
  };
};

// Fallback emotion analysis for when AI is not available
function analyzeEmotionFallback(text: string): string {
  const emotionKeywords = {
    joyful: ['happy', 'joy', 'excited', 'wonderful', 'amazing', 'love', 'great'],
    nostalgic: ['remember', 'used to', 'back then', 'childhood', 'past', 'when I was'],
    grateful: ['thankful', 'blessed', 'appreciate', 'grateful', 'lucky', 'fortunate'],
    melancholic: ['sad', 'miss', 'lost', 'gone', 'difficult', 'hard', 'wish'],
    hopeful: ['hope', 'future', 'dream', 'wish', 'believe', 'will', 'someday'],
    loving: ['love', 'care', 'dear', 'precious', 'cherish', 'adore'],
    proud: ['proud', 'accomplished', 'achieved', 'success', 'overcome']
  };

  const lowerText = text.toLowerCase();
  let maxScore = 0;
  let dominantEmotion = 'reflective';

  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    const score = keywords.reduce((acc, keyword) => {
      return acc + (lowerText.includes(keyword) ? 1 : 0);
    }, 0);
    
    if (score > maxScore) {
      maxScore = score;
      dominantEmotion = emotion;
    }
  }

  return dominantEmotion;
}