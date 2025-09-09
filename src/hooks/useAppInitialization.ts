import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/capsuleStore';
import { useAI } from '@/hooks/useAI';
import { db } from '@/lib/db/database';

export const useAppInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  const { 
    setUserSettings, 
    initializeFromSettings, 
    isAIEnabled,
    setAIReady 
  } = useAppStore();
  
  const { initialize: initializeAI, isReady: aiReady } = useAI();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Generate a simple user ID for this session
        const userId = localStorage.getItem('time-capsule-user-id') || 
          `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        if (!localStorage.getItem('time-capsule-user-id')) {
          localStorage.setItem('time-capsule-user-id', userId);
        }

        // Load or create user settings
        const settings = await db.getUserSettings(userId);
        setUserSettings(settings);
        initializeFromSettings(settings);

        // Initialize AI if enabled
        if (settings.preferences.enableAI && isAIEnabled) {
          try {
            await initializeAI();
          } catch (error) {
            console.warn('AI initialization failed, continuing without AI features:', error);
          }
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('App initialization failed:', error);
        setInitError(error instanceof Error ? error.message : 'Initialization failed');
      }
    };

    initializeApp();
  }, [setUserSettings, initializeFromSettings, isAIEnabled, initializeAI]);

  // Update AI ready state when AI becomes ready
  useEffect(() => {
    if (aiReady) {
      setAIReady(true);
    }
  }, [aiReady, setAIReady]);

  return {
    isInitialized,
    initError
  };
};