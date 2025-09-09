import Dexie, { Table } from 'dexie';
import { CapsuleEncryption } from '@/lib/crypto/encryption';

export interface TimeCapsule {
  id?: number;
  title: string;
  recipient: string;
  type: 'legacy' | 'family' | 'future-self';
  status: 'draft' | 'scheduled' | 'delivered' | 'locked';
  content: string;
  encryptedContent?: string;
  voiceModelId?: string;
  audioUrl?: string;
  audioBlob?: Blob;
  createdAt: Date;
  deliveryDate?: Date;
  isEncrypted: boolean;
  wordCount: number;
  isAIGenerated: boolean;
  metadata: {
    tone: string;
    emotionalState: string;
    interviewResponses: Record<string, string>;
    aiConfidence?: number;
    generationMethod: 'ai' | 'template' | 'manual';
    voiceCloned: boolean;
  };
}

export interface VoiceModel {
  id?: number;
  modelId: string;
  name: string;
  samples: string[];
  sampleBlobs?: Blob[];
  createdAt: Date;
  isActive: boolean;
  isElevenLabsModel: boolean;
  quality: 'high' | 'medium' | 'low';
}

export interface InterviewSession {
  id?: number;
  sessionId: string;
  responses: Record<string, string>;
  emotionalJourney: Record<string, string>;
  currentQuestionIndex: number;
  emotionalState: string;
  aiEnhanced: boolean;
  createdAt: Date;
  completedAt?: Date;
  totalQuestions: number;
}

export interface AIModel {
  id?: number;
  modelName: string;
  isLoaded: boolean;
  loadedAt?: Date;
  performance: {
    loadTime: number;
    averageResponseTime: number;
    successRate: number;
  };
}

export interface AppSettings {
  id?: number;
  userId: string;
  preferences: {
    enableAI: boolean;
    enableVoice: boolean;
    defaultTone: string;
    autoSave: boolean;
    encryptByDefault: boolean;
  };
  privacy: {
    dataRetention: number; // days
    shareAnalytics: boolean;
    allowTelemetry: boolean;
  };
  updatedAt: Date;
}

export class TimeCapsuleDB extends Dexie {
  timeCapsules!: Table<TimeCapsule>;
  voiceModels!: Table<VoiceModel>;
  interviewSessions!: Table<InterviewSession>;
  aiModels!: Table<AIModel>;
  settings!: Table<AppSettings>;

  constructor() {
    super('TimeCapsuleDB');
    
    this.version(1).stores({
      timeCapsules: '++id, title, type, status, createdAt, deliveryDate, isAIGenerated',
      voiceModels: '++id, modelId, name, createdAt, isActive, isElevenLabsModel',
      interviewSessions: '++id, sessionId, createdAt, completedAt, aiEnhanced',
      aiModels: '++id, modelName, isLoaded, loadedAt',
      settings: '++id, userId, updatedAt'
    });

    // Add hooks for encryption
    this.timeCapsules.hook('creating', (primKey, obj, trans) => {
      if (obj.isEncrypted && obj.content && !obj.encryptedContent) {
        return this.encryptCapsuleContent(obj);
      }
    });

    this.timeCapsules.hook('updating', (modifications, primKey, obj, trans) => {
      if (modifications.content && obj.isEncrypted) {
        return this.encryptCapsuleContent({ ...obj, ...modifications });
      }
    });
  }

  private async encryptCapsuleContent(capsule: TimeCapsule): Promise<void> {
    try {
      const encrypted = await CapsuleEncryption.encrypt(capsule.content);
      capsule.encryptedContent = JSON.stringify(encrypted);
      capsule.content = '[ENCRYPTED]'; // Clear plaintext
    } catch (error) {
      console.error('Failed to encrypt capsule content:', error);
      // Continue without encryption rather than fail
    }
  }

  async getCapsuleContent(capsule: TimeCapsule): Promise<string> {
    if (!capsule.isEncrypted || !capsule.encryptedContent) {
      return capsule.content;
    }

    try {
      const encryptedData = JSON.parse(capsule.encryptedContent);
      return await CapsuleEncryption.decrypt(
        encryptedData.encryptedData,
        encryptedData.salt,
        encryptedData.iv
      );
    } catch (error) {
      console.error('Failed to decrypt capsule content:', error);
      return '[CONTENT ENCRYPTED - UNABLE TO DECRYPT]';
    }
  }

  async saveCapsuleWithAudio(capsule: Omit<TimeCapsule, 'id'>, audioBlob?: Blob): Promise<number> {
    if (audioBlob) {
      capsule.audioBlob = audioBlob;
      capsule.audioUrl = URL.createObjectURL(audioBlob);
    }
    
    return await this.timeCapsules.add(capsule as TimeCapsule);
  }

  async getVoiceModelWithSamples(modelId: string): Promise<VoiceModel | null> {
    const model = await this.voiceModels.where('modelId').equals(modelId).first();
    if (!model) return null;

    // Reconstruct blob URLs if needed
    if (model.sampleBlobs && model.sampleBlobs.length > 0) {
      model.samples = model.sampleBlobs.map(blob => URL.createObjectURL(blob));
    }

    return model;
  }

  async updateAIModelPerformance(modelName: string, metrics: Partial<AIModel['performance']>): Promise<void> {
    const existing = await this.aiModels.where('modelName').equals(modelName).first();
    
    if (existing) {
      await this.aiModels.update(existing.id!, {
        performance: { ...existing.performance, ...metrics }
      });
    } else {
      await this.aiModels.add({
        modelName,
        isLoaded: true,
        loadedAt: new Date(),
        performance: {
          loadTime: 0,
          averageResponseTime: 0,
          successRate: 1,
          ...metrics
        }
      });
    }
  }

  async getUserSettings(userId: string): Promise<AppSettings> {
    const existing = await this.settings.where('userId').equals(userId).first();
    
    if (existing) {
      return existing;
    }

    // Create default settings
    const defaultSettings: AppSettings = {
      userId,
      preferences: {
        enableAI: true,
        enableVoice: true,
        defaultTone: 'heartfelt',
        autoSave: true,
        encryptByDefault: true
      },
      privacy: {
        dataRetention: 365,
        shareAnalytics: false,
        allowTelemetry: false
      },
      updatedAt: new Date()
    };

    const id = await this.settings.add(defaultSettings);
    return { ...defaultSettings, id };
  }

  async updateUserSettings(userId: string, updates: Partial<AppSettings>): Promise<void> {
    const existing = await this.settings.where('userId').equals(userId).first();
    
    if (existing) {
      await this.settings.update(existing.id!, {
        ...updates,
        updatedAt: new Date()
      });
    } else {
      await this.getUserSettings(userId); // Create default first
      await this.updateUserSettings(userId, updates); // Then update
    }
  }

  // Analytics and insights
  async getCapsuleStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    aiGenerated: number;
    withVoice: number;
  }> {
    const capsules = await this.timeCapsules.toArray();
    
    return {
      total: capsules.length,
      byType: capsules.reduce((acc, c) => {
        acc[c.type] = (acc[c.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStatus: capsules.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      aiGenerated: capsules.filter(c => c.isAIGenerated).length,
      withVoice: capsules.filter(c => c.voiceModelId).length
    };
  }
}

export const db = new TimeCapsuleDB();