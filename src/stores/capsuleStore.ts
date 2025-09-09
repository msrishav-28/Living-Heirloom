import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TimeCapsule, InterviewSession, VoiceModel, AppSettings } from '@/lib/db/database';
import { AILoadingProgress } from '@/lib/ai/webllm-manager';

interface AppState {
  // Current session
  currentSession: InterviewSession | null;
  currentCapsule: Partial<TimeCapsule> | null;
  
  // Voice features
  currentVoiceModel: VoiceModel | null;
  isVoiceEnabled: boolean;
  
  // AI features
  isAIEnabled: boolean;
  aiLoadingProgress: AILoadingProgress | null;
  isAIReady: boolean;
  
  // UI state
  isGenerating: boolean;
  generationProgress: number;
  currentView: 'home' | 'interview' | 'generation' | 'library';
  
  // User settings
  userSettings: AppSettings | null;
  
  // Actions
  setCurrentSession: (session: InterviewSession | null) => void;
  setCurrentCapsule: (capsule: Partial<TimeCapsule> | null) => void;
  setCurrentVoiceModel: (model: VoiceModel | null) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setAIEnabled: (enabled: boolean) => void;
  setAILoadingProgress: (progress: AILoadingProgress | null) => void;
  setAIReady: (ready: boolean) => void;
  setGenerating: (generating: boolean) => void;
  setGenerationProgress: (progress: number) => void;
  setCurrentView: (view: AppState['currentView']) => void;
  setUserSettings: (settings: AppSettings) => void;
  
  // Interview actions
  updateSessionResponse: (questionId: string, response: string, emotion?: string) => void;
  completeSession: () => void;
  
  // Capsule actions
  updateCapsuleContent: (content: string) => void;
  updateCapsuleMetadata: (metadata: Partial<TimeCapsule['metadata']>) => void;
  
  // Utility actions
  reset: () => void;
  initializeFromSettings: (settings: AppSettings) => void;
}

const initialState = {
  currentSession: null,
  currentCapsule: null,
  currentVoiceModel: null,
  isVoiceEnabled: false,
  isAIEnabled: true,
  aiLoadingProgress: null,
  isAIReady: false,
  isGenerating: false,
  generationProgress: 0,
  currentView: 'home' as const,
  userSettings: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Basic setters
      setCurrentSession: (session) => set({ currentSession: session }),
      setCurrentCapsule: (capsule) => set({ currentCapsule: capsule }),
      setCurrentVoiceModel: (model) => set({ currentVoiceModel: model }),
      setVoiceEnabled: (enabled) => set({ isVoiceEnabled: enabled }),
      setAIEnabled: (enabled) => set({ isAIEnabled: enabled }),
      setAILoadingProgress: (progress) => set({ aiLoadingProgress: progress }),
      setAIReady: (ready) => set({ isAIReady: ready }),
      setGenerating: (generating) => set({ isGenerating: generating }),
      setGenerationProgress: (progress) => set({ generationProgress: progress }),
      setCurrentView: (view) => set({ currentView: view }),
      setUserSettings: (settings) => set({ userSettings: settings }),

      // Interview actions
      updateSessionResponse: (questionId, response, emotion) => {
        const session = get().currentSession;
        if (session) {
          const updatedSession = {
            ...session,
            responses: {
              ...session.responses,
              [questionId]: response,
            },
            emotionalJourney: {
              ...session.emotionalJourney,
              [questionId]: emotion || session.emotionalState,
            },
          };
          
          set({ currentSession: updatedSession });
        }
      },

      completeSession: () => {
        const session = get().currentSession;
        if (session) {
          set({
            currentSession: {
              ...session,
              completedAt: new Date(),
            },
          });
        }
      },

      // Capsule actions
      updateCapsuleContent: (content) => {
        const capsule = get().currentCapsule;
        if (capsule) {
          set({
            currentCapsule: {
              ...capsule,
              content,
              wordCount: content.split(' ').length,
            },
          });
        }
      },

      updateCapsuleMetadata: (metadata) => {
        const capsule = get().currentCapsule;
        if (capsule) {
          set({
            currentCapsule: {
              ...capsule,
              metadata: {
                ...capsule.metadata,
                ...metadata,
              },
            },
          });
        }
      },

      // Utility actions
      reset: () => set(initialState),
      
      initializeFromSettings: (settings) => {
        set({
          userSettings: settings,
          isAIEnabled: settings.preferences.enableAI,
          isVoiceEnabled: settings.preferences.enableVoice,
        });
      },
    }),
    {
      name: 'living-heirloom-app',
      partialize: (state) => ({
        currentVoiceModel: state.currentVoiceModel,
        isVoiceEnabled: state.isVoiceEnabled,
        isAIEnabled: state.isAIEnabled,
        userSettings: state.userSettings,
      }),
    }
  )
);

// Legacy export for backward compatibility
export const useCapsuleStore = useAppStore;