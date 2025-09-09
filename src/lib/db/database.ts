import Dexie, { Table } from 'dexie';
import { CapsuleEncryption } from '@/lib/crypto/encryption';
import { validateTimeCapsule, validateVoiceModel, validateAppSettings } from '@/lib/schemas';
import { deepSanitize, sanitizeText, sanitizeName } from '@/lib/sanitization';

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

export class LivingHeirloomDB extends Dexie {
  timeCapsules!: Table<TimeCapsule>;
  voiceModels!: Table<VoiceModel>;
  interviewSessions!: Table<InterviewSession>;
  aiModels!: Table<AIModel>;
  settings!: Table<AppSettings>;

  constructor() {
    super('LivingHeirloomDB');
    
    this.version(1).stores({
      timeCapsules: '++id, title, type, status, createdAt, deliveryDate, isAIGenerated',
      voiceModels: '++id, modelId, name, createdAt, isActive, isElevenLabsModel',
      interviewSessions: '++id, sessionId, createdAt, completedAt, aiEnhanced',
      aiModels: '++id, modelName, isLoaded, loadedAt',
      settings: '++id, userId, updatedAt'
    });

    // Add hooks for validation and encryption
    this.timeCapsules.hook('creating', (_primKey, obj, _trans) => {
      // Validate and sanitize data before storing
      const sanitized = this.sanitizeTimeCapsule(obj);
      Object.assign(obj, sanitized);
      
      // Validate the sanitized object
      const validation = validateTimeCapsule(obj);
      if (!validation.success) {
        throw new Error(`Invalid capsule data: ${validation.error.errors.map(e => e.message).join(', ')}`);
      }
      
      if (obj.isEncrypted && obj.content && !obj.encryptedContent) {
        return this.encryptCapsuleContent(obj);
      }
    });

    this.timeCapsules.hook('updating', (modifications, _primKey, obj, _trans) => {
      // Sanitize modifications
      const sanitizedMods = this.sanitizeTimeCapsule(modifications);
      Object.assign(modifications, sanitizedMods);
      
      if (modifications.content && obj.isEncrypted) {
        return this.encryptCapsuleContent({ ...obj, ...modifications });
      }
    });

    // Add validation hooks for voice models
    this.voiceModels.hook('creating', (_primKey, obj, _trans) => {
      const sanitized = this.sanitizeVoiceModel(obj);
      Object.assign(obj, sanitized);
      
      const validation = validateVoiceModel(obj);
      if (!validation.success) {
        throw new Error(`Invalid voice model data: ${validation.error.errors.map(e => e.message).join(', ')}`);
      }
    });
  }

  // Data sanitization methods
  private sanitizeTimeCapsule(capsule: Partial<TimeCapsule>): Partial<TimeCapsule> {
    const sanitized: Partial<TimeCapsule> = {};
    
    if (capsule.title !== undefined) {
      sanitized.title = sanitizeName(capsule.title);
    }
    
    if (capsule.recipient !== undefined) {
      sanitized.recipient = sanitizeName(capsule.recipient);
    }
    
    if (capsule.content !== undefined) {
      sanitized.content = sanitizeText(capsule.content);
    }
    
    if (capsule.metadata !== undefined) {
      sanitized.metadata = deepSanitize(capsule.metadata) as TimeCapsule['metadata'];
    }
    
    // Copy other fields as-is if they're safe types
    const safeFields: (keyof TimeCapsule)[] = [
      'type', 'status', 'isEncrypted', 'isAIGenerated', 'wordCount',
      'createdAt', 'deliveryDate', 'voiceModelId'
    ];
    
    for (const field of safeFields) {
      if (capsule[field] !== undefined) {
        (sanitized as any)[field] = capsule[field];
      }
    }
    
    return sanitized;
  }

  private sanitizeVoiceModel(model: Partial<VoiceModel>): Partial<VoiceModel> {
    const sanitized: Partial<VoiceModel> = {};
    
    if (model.name !== undefined) {
      sanitized.name = sanitizeName(model.name);
    }
    
    if (model.modelId !== undefined) {
      sanitized.modelId = sanitizeName(model.modelId);
    }
    
    // Copy other safe fields
    const safeFields: (keyof VoiceModel)[] = [
      'samples', 'sampleBlobs', 'createdAt', 'isActive', 'isElevenLabsModel', 'quality'
    ];
    
    for (const field of safeFields) {
      if (model[field] !== undefined) {
        (sanitized as any)[field] = model[field];
      }
    }
    
    return sanitized;
  }

  private async encryptCapsuleContent(capsule: TimeCapsule): Promise<void> {
    try {
      if (!capsule.content || capsule.content.trim().length === 0) {
        console.warn('Attempting to encrypt empty content');
        return;
      }

      const encrypted = await CapsuleEncryption.encrypt(capsule.content);
      capsule.encryptedContent = JSON.stringify(encrypted);
      capsule.content = '[ENCRYPTED]'; // Clear plaintext
    } catch (error) {
      console.error('Failed to encrypt capsule content:', error);
      // Continue without encryption rather than fail
      // In production, you might want to notify the user about encryption failure
    }
  }

  async getCapsuleContent(capsule: TimeCapsule): Promise<string> {
    if (!capsule) {
      throw new Error('No capsule provided');
    }

    if (!capsule.isEncrypted || !capsule.encryptedContent) {
      return capsule.content || '';
    }

    try {
      if (!capsule.encryptedContent.trim()) {
        console.warn('Empty encrypted content found');
        return '[CONTENT ENCRYPTED - NO DATA]';
      }

      const encryptedData = JSON.parse(capsule.encryptedContent);
      
      if (!encryptedData.encryptedData || !encryptedData.salt || !encryptedData.iv) {
        throw new Error('Invalid encrypted data structure');
      }

      return await CapsuleEncryption.decrypt(
        encryptedData.encryptedData,
        encryptedData.salt,
        encryptedData.iv
      );
    } catch (error) {
      console.error('Failed to decrypt capsule content:', error);
      
      if (error instanceof SyntaxError) {
        return '[CONTENT ENCRYPTED - CORRUPTED DATA]';
      }
      
      return '[CONTENT ENCRYPTED - UNABLE TO DECRYPT]';
    }
  }

  async saveCapsuleWithAudio(capsule: Omit<TimeCapsule, 'id'>, audioBlob?: Blob): Promise<number> {
    try {
      // Validate required fields
      if (!capsule.title || !capsule.recipient || !capsule.content) {
        throw new Error('Missing required capsule fields: title, recipient, or content');
      }

      // Validate audio blob if provided
      if (audioBlob) {
        if (audioBlob.size === 0) {
          throw new Error('Audio blob is empty');
        }
        if (audioBlob.size > 50 * 1024 * 1024) { // 50MB limit
          throw new Error('Audio file is too large (max 50MB)');
        }
        
        capsule.audioBlob = audioBlob;
        capsule.audioUrl = URL.createObjectURL(audioBlob);
      }
      
      // Ensure required metadata
      const capsuleWithDefaults = {
        ...capsule,
        createdAt: capsule.createdAt || new Date(),
        wordCount: capsule.wordCount || capsule.content.split(' ').length,
        isAIGenerated: capsule.isAIGenerated || false,
        isEncrypted: capsule.isEncrypted || false,
        metadata: {
          tone: 'heartfelt',
          emotionalState: 'reflective',
          interviewResponses: {},
          generationMethod: 'manual' as const,
          voiceCloned: false,
          ...capsule.metadata
        }
      };
      
      return await this.timeCapsules.add(capsuleWithDefaults as TimeCapsule);
    } catch (error) {
      console.error('Failed to save capsule:', error);
      throw new Error(`Failed to save heirloom: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    try {
      if (!modelName || modelName.trim().length === 0) {
        throw new Error('Model name is required');
      }

      const existing = await this.aiModels.where('modelName').equals(modelName).first();
      
      if (existing) {
        // Calculate running averages for metrics
        const updatedPerformance = { ...existing.performance };
        
        if (metrics.averageResponseTime !== undefined) {
          // Simple running average (could be improved with proper weighted average)
          updatedPerformance.averageResponseTime = 
            (updatedPerformance.averageResponseTime + metrics.averageResponseTime) / 2;
        }
        
        if (metrics.successRate !== undefined) {
          // Update success rate (could track total attempts for better accuracy)
          updatedPerformance.successRate = 
            (updatedPerformance.successRate + metrics.successRate) / 2;
        }
        
        if (metrics.loadTime !== undefined) {
          updatedPerformance.loadTime = metrics.loadTime;
        }

        await this.aiModels.update(existing.id!, {
          performance: updatedPerformance
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
    } catch (error) {
      console.error('Failed to update AI model performance:', error);
      // Don't throw here as this is a non-critical operation
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

  // Cleanup operations
  async cleanupExpiredData(): Promise<void> {
    try {
      const settings = await this.getUserSettings('default');
      const retentionDays = settings.privacy.dataRetention;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Clean up old draft capsules
      const expiredDrafts = await this.timeCapsules
        .where('status').equals('draft')
        .and(capsule => capsule.createdAt < cutoffDate)
        .toArray();

      for (const draft of expiredDrafts) {
        await this.deleteCapsule(draft.id!);
      }

      console.log(`Cleaned up ${expiredDrafts.length} expired draft capsules`);
    } catch (error) {
      console.error('Failed to cleanup expired data:', error);
    }
  }

  async deleteCapsule(id: number): Promise<void> {
    try {
      const capsule = await this.timeCapsules.get(id);
      if (!capsule) {
        throw new Error('Capsule not found');
      }

      // Clean up audio URL if it exists
      if (capsule.audioUrl) {
        try {
          URL.revokeObjectURL(capsule.audioUrl);
        } catch (error) {
          console.warn('Failed to revoke audio URL:', error);
        }
      }

      // Delete the capsule
      await this.timeCapsules.delete(id);
    } catch (error) {
      console.error('Failed to delete capsule:', error);
      throw new Error(`Failed to delete heirloom: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteVoiceModel(modelId: string): Promise<void> {
    try {
      const model = await this.voiceModels.where('modelId').equals(modelId).first();
      if (!model) {
        throw new Error('Voice model not found');
      }

      // Clean up sample URLs if they exist
      if (model.sampleBlobs) {
        model.samples.forEach(sampleUrl => {
          try {
            URL.revokeObjectURL(sampleUrl);
          } catch (error) {
            console.warn('Failed to revoke sample URL:', error);
          }
        });
      }

      // Delete the model
      await this.voiceModels.where('modelId').equals(modelId).delete();
    } catch (error) {
      console.error('Failed to delete voice model:', error);
      throw new Error(`Failed to delete voice model: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    try {
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
    } catch (error) {
      console.error('Failed to get capsule stats:', error);
      return {
        total: 0,
        byType: {},
        byStatus: {},
        aiGenerated: 0,
        withVoice: 0
      };
    }
  }
}

export const db = new LivingHeirloomDB();