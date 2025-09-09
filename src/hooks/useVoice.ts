import React, { useState, useCallback, useRef } from 'react';
import { elevenLabsClient } from '@/lib/voice/elevenlabs-client';
import { useAppStore } from '@/stores/capsuleStore';
import { db } from '@/lib/db/database';

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

    try {
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
      await db.voiceModels.add({
        modelId,
        name,
        samples: audioFiles.map(file => file.name),
        sampleBlobs: samples,
        createdAt: new Date(),
        isActive: true,
        isElevenLabsModel,
        quality: isElevenLabsModel ? 'high' : 'medium'
      });

      return modelId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Voice cloning failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const generateSpeech = useCallback(async (text: string, voiceId?: string): Promise<Blob> => {
    setIsProcessing(true);
    setError(null);

    try {
      const targetVoiceId = voiceId || currentVoiceModel?.modelId;
      
      if (!targetVoiceId) {
        throw new Error('No voice model available');
      }

      // Check if it's an ElevenLabs model
      const voiceModel = await db.voiceModels.where('modelId').equals(targetVoiceId).first();
      
      if (voiceModel?.isElevenLabsModel) {
        // Use ElevenLabs for generation
        const audioBuffer = await elevenLabsClient.generateSpeech(text, targetVoiceId);
        return new Blob([audioBuffer], { type: 'audio/mpeg' });
      } else {
        // For local models, we'd need a local TTS implementation
        // For now, throw an error indicating this feature needs implementation
        throw new Error('Local voice synthesis not yet implemented');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Speech generation failed';
      setError(errorMessage);
      throw err;
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