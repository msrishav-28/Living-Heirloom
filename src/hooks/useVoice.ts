import React, { useState, useCallback, useRef } from 'react';
import { elevenLabsClient } from '@/lib/voice/elevenlabs-client';
import { useAppStore } from '@/stores/capsuleStore';
import { db } from '@/lib/db/database';
import { voiceConfig } from '@/lib/config';

export interface UseVoiceReturn {
  isRecording: boolean;
  isProcessing: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  playRecording: () => void;
  pauseRecording: () => void;
  resetRecording: () => void;
  cloneVoice: (name: string, samples: Blob[]) => Promise<string>;
  generateSpeech: (text: string, voiceId?: string) => Promise<Blob>;
  isPlaying: boolean;
}

export const useVoice = (): UseVoiceReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const { currentVoiceModel } = useAppStore();

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1,
        }
      });

      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        setAudioBlob(blob);
        
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      console.error('Recording failed:', err);
    }
  }, [audioUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const playRecording = useCallback(() => {
    if (audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onerror = () => {
          setError('Failed to play audio');
          setIsPlaying(false);
        };
      }
      
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          setError('Failed to play audio');
          console.error('Playback failed:', err);
        });
    }
  }, [audioUrl]);

  const pauseRecording = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const resetRecording = useCallback(() => {
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }

    // Stop playback if active
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Clean up URLs
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    // Reset state
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
    setError(null);

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [isRecording, audioUrl, stopRecording]);

  const cloneVoice = useCallback(async (name: string, samples: Blob[]): Promise<string> => {
    setIsProcessing(true);
    setError(null);

    // Validate inputs
    if (!name || name.trim().length === 0) {
      const error = 'Voice name is required for cloning';
      setError(error);
      setIsProcessing(false);
      throw new Error(error);
    }

    if (!samples || samples.length === 0) {
      const error = 'Voice samples are required for cloning';
      setError(error);
      setIsProcessing(false);
      throw new Error(error);
    }

    if (samples.length < voiceConfig.requiredSamples) {
      const error = `At least ${voiceConfig.requiredSamples} voice samples are required for quality cloning`;
      setError(error);
      setIsProcessing(false);
      throw new Error(error);
    }

    try {
      // Validate sample quality
      for (let i = 0; i < samples.length; i++) {
        if (samples[i].size === 0) {
          throw new Error(`Voice sample ${i + 1} is empty or corrupted`);
        }
        if (samples[i].size < 1000) { // Less than 1KB is likely too short
          throw new Error(`Voice sample ${i + 1} is too short for quality cloning`);
        }
        if (samples[i].size > voiceConfig.maxFileSize) {
          throw new Error(`Voice sample ${i + 1} is too large (max ${Math.round(voiceConfig.maxFileSize / 1024 / 1024)}MB)`);
        }
      }

      // Convert blobs to files
      const audioFiles = samples.map((blob, index) => 
        new File([blob], `sample_${index}.wav`, { type: 'audio/wav' })
      );

      // Try ElevenLabs first
      let modelId: string;
      let isElevenLabsModel = true;

      try {
        modelId = await elevenLabsClient.cloneVoice(name, audioFiles);
      } catch (elevenLabsError) {
        console.warn('ElevenLabs cloning failed, using local storage:', elevenLabsError);
        // Fallback to local storage
        modelId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        isElevenLabsModel = false;
      }

      // Save to database
      try {
        await db.voiceModels.add({
          modelId,
          name: name.trim(),
          samples: audioFiles.map(file => file.name),
          sampleBlobs: samples,
          createdAt: new Date(),
          isActive: true,
          isElevenLabsModel,
          quality: isElevenLabsModel ? 'high' : 'medium'
        });
      } catch (dbError) {
        console.error('Failed to save voice model to database:', dbError);
        throw new Error('Failed to save voice model. Please try again.');
      }

      return modelId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Voice cloning failed unexpectedly';
      setError(errorMessage);
      throw new Error(`Voice Cloning Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const generateSpeech = useCallback(async (text: string, voiceId?: string): Promise<Blob> => {
    setIsProcessing(true);
    setError(null);

    // Validate input text
    if (!text || text.trim().length === 0) {
      const error = 'Text is required for speech generation';
      setError(error);
      setIsProcessing(false);
      throw new Error(error);
    }

    if (text.length > 5000) {
      const error = 'Text is too long for speech generation (max 5000 characters)';
      setError(error);
      setIsProcessing(false);
      throw new Error(error);
    }

    try {
      const targetVoiceId = voiceId || currentVoiceModel?.modelId;
      
      if (!targetVoiceId) {
        throw new Error('No voice model available for speech generation');
      }

      // Get and validate voice model
      const voiceModel = await db.voiceModels.where('modelId').equals(targetVoiceId).first();
      
      if (!voiceModel) {
        throw new Error('Voice model not found in database');
      }

      if (!voiceModel.isActive) {
        throw new Error('Voice model is not active');
      }
      
      if (voiceModel.isElevenLabsModel) {
        // Use ElevenLabs for generation
        try {
          const audioBuffer = await elevenLabsClient.generateSpeech(text.trim(), targetVoiceId);
          
          if (!audioBuffer || audioBuffer.byteLength === 0) {
            throw new Error('ElevenLabs returned empty audio');
          }
          
          return new Blob([audioBuffer], { type: 'audio/mpeg' });
        } catch (elevenLabsError) {
          console.error('ElevenLabs speech generation failed:', elevenLabsError);
          throw new Error('Voice synthesis service is temporarily unavailable');
        }
      } else {
        // For local models, provide a helpful message
        throw new Error('Local voice synthesis is not yet available. Please use ElevenLabs voice models for speech generation.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Speech generation failed unexpectedly';
      setError(errorMessage);
      throw new Error(`Speech Generation Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, [currentVoiceModel]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioUrl]);

  return {
    isRecording,
    isProcessing,
    recordingTime,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    playRecording,
    pauseRecording,
    resetRecording,
    cloneVoice,
    generateSpeech,
    isPlaying
  };
};