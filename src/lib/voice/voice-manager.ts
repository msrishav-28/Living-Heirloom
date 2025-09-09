// Voice model management utilities for Living Heirloom

import { db, VoiceModel } from '@/lib/db/database';
import { elevenLabsClient } from './elevenlabs-client';

export interface VoiceModelInfo {
  id: string;
  name: string;
  quality: 'high' | 'medium' | 'low';
  isElevenLabsModel: boolean;
  isActive: boolean;
  createdAt: Date;
  sampleCount: number;
}

export class VoiceManager {
  /**
   * Get all available voice models
   */
  static async getAvailableModels(): Promise<VoiceModelInfo[]> {
    try {
      const models = await db.voiceModels.where('isActive').equals(true).toArray();
      
      return models.map(model => ({
        id: model.modelId,
        name: model.name,
        quality: model.quality,
        isElevenLabsModel: model.isElevenLabsModel,
        isActive: model.isActive,
        createdAt: model.createdAt,
        sampleCount: model.samples.length
      }));
    } catch (error) {
      console.error('Failed to get available voice models:', error);
      return [];
    }
  }

  /**
   * Get the best available voice model
   */
  static async getBestAvailableModel(): Promise<VoiceModel | null> {
    try {
      const models = await db.voiceModels.where('isActive').equals(true).toArray();
      
      if (models.length === 0) {
        return null;
      }

      // Prioritize ElevenLabs models with high quality
      const elevenLabsModels = models.filter(m => m.isElevenLabsModel && m.quality === 'high');
      if (elevenLabsModels.length > 0) {
        return elevenLabsModels[0];
      }

      // Then ElevenLabs models with medium quality
      const elevenLabsMedium = models.filter(m => m.isElevenLabsModel && m.quality === 'medium');
      if (elevenLabsMedium.length > 0) {
        return elevenLabsMedium[0];
      }

      // Then any ElevenLabs model
      const anyElevenLabs = models.filter(m => m.isElevenLabsModel);
      if (anyElevenLabs.length > 0) {
        return anyElevenLabs[0];
      }

      // Finally, any local model
      return models[0];
    } catch (error) {
      console.error('Failed to get best voice model:', error);
      return null;
    }
  }

  /**
   * Validate voice model integrity
   */
  static async validateModel(modelId: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const model = await db.voiceModels.where('modelId').equals(modelId).first();
      
      if (!model) {
        return { isValid: false, issues: ['Voice model not found'] };
      }

      // Check basic properties
      if (!model.name || model.name.trim().length === 0) {
        issues.push('Voice model has no name');
      }

      if (!model.samples || model.samples.length === 0) {
        issues.push('Voice model has no samples');
      }

      if (model.samples && model.samples.length < 3) {
        issues.push('Voice model has insufficient samples (minimum 3 required)');
      }

      // Check sample blobs if available
      if (model.sampleBlobs) {
        for (let i = 0; i < model.sampleBlobs.length; i++) {
          const blob = model.sampleBlobs[i];
          if (!blob || blob.size === 0) {
            issues.push(`Sample ${i + 1} is empty or corrupted`);
          } else if (blob.size < 1000) {
            issues.push(`Sample ${i + 1} is too short (less than 1KB)`);
          }
        }
      }

      // For ElevenLabs models, try to verify with the service
      if (model.isElevenLabsModel) {
        try {
          const voices = await elevenLabsClient.getVoices();
          const exists = voices.some(v => v.voice_id === modelId);
          if (!exists) {
            issues.push('ElevenLabs voice model no longer exists on the service');
          }
        } catch (error) {
          issues.push('Unable to verify ElevenLabs voice model (service may be unavailable)');
        }
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Failed to validate voice model:', error);
      return {
        isValid: false,
        issues: ['Failed to validate voice model due to system error']
      };
    }
  }

  /**
   * Clean up inactive or corrupted voice models
   */
  static async cleanupModels(): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    let cleaned = 0;
    const errors: string[] = [];

    try {
      const allModels = await db.voiceModels.toArray();

      for (const model of allModels) {
        try {
          const validation = await this.validateModel(model.modelId);
          
          // Remove models with critical issues
          const criticalIssues = validation.issues.filter(issue => 
            issue.includes('not found') || 
            issue.includes('corrupted') || 
            issue.includes('no longer exists')
          );

          if (criticalIssues.length > 0) {
            await db.deleteVoiceModel(model.modelId);
            cleaned++;
            console.log(`Cleaned up corrupted voice model: ${model.name}`);
          }
        } catch (error) {
          errors.push(`Failed to clean up model ${model.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { cleaned, errors };
    } catch (error) {
      console.error('Failed to cleanup voice models:', error);
      return {
        cleaned: 0,
        errors: ['Failed to cleanup voice models due to system error']
      };
    }
  }

  /**
   * Get voice model statistics
   */
  static async getModelStats(): Promise<{
    total: number;
    active: number;
    elevenLabsModels: number;
    localModels: number;
    qualityDistribution: Record<string, number>;
  }> {
    try {
      const models = await db.voiceModels.toArray();

      return {
        total: models.length,
        active: models.filter(m => m.isActive).length,
        elevenLabsModels: models.filter(m => m.isElevenLabsModel).length,
        localModels: models.filter(m => !m.isElevenLabsModel).length,
        qualityDistribution: models.reduce((acc, model) => {
          acc[model.quality] = (acc[model.quality] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
    } catch (error) {
      console.error('Failed to get voice model stats:', error);
      return {
        total: 0,
        active: 0,
        elevenLabsModels: 0,
        localModels: 0,
        qualityDistribution: {}
      };
    }
  }

  /**
   * Test voice model functionality
   */
  static async testModel(modelId: string, testText: string = 'Hello, this is a test of your voice model.'): Promise<{
    success: boolean;
    error?: string;
    audioBlob?: Blob;
  }> {
    try {
      const model = await db.voiceModels.where('modelId').equals(modelId).first();
      
      if (!model) {
        return { success: false, error: 'Voice model not found' };
      }

      if (!model.isElevenLabsModel) {
        return { success: false, error: 'Local voice synthesis testing not yet supported' };
      }

      // Test with ElevenLabs
      const audioBuffer = await elevenLabsClient.generateSpeech(testText, modelId);
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });

      return { success: true, audioBlob };
    } catch (error) {
      console.error('Voice model test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Voice model test failed'
      };
    }
  }
}