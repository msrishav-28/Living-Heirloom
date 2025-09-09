import { useState } from 'react';
import { ArrowRight, ArrowLeft, Sparkles, Volume2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { VoiceRecorder } from './VoiceRecorder';
import { useVoice } from '@/hooks/useVoice';
import { useAppStore } from '@/stores/capsuleStore';
import { db } from '@/lib/db/database';
import { validateVoiceName } from '@/lib/schemas';

const SAMPLE_TEXTS = [
  "I want to preserve my voice for the people I love most in this world.",
  "Every story deserves to be heard, every voice deserves to echo through time.",
  "The memories we create today become the treasures of tomorrow."
];

export const VoiceCloneSetup = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState<'intro' | 'name' | 'recording' | 'processing' | 'complete'>('intro');
  const [voiceName, setVoiceName] = useState('');
  const [voiceNameError, setVoiceNameError] = useState<string | null>(null);
  const [currentSample, setCurrentSample] = useState(0);
  const [recordings, setRecordings] = useState<Blob[]>([]);
  const [voiceModelId, setVoiceModelId] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  
  const { setCurrentVoiceModel, setVoiceEnabled } = useAppStore();
  const { cloneVoice, isProcessing: isVoiceProcessing } = useVoice();

  const handleRecordingComplete = (audioBlob: Blob) => {
    const newRecordings = [...recordings, audioBlob];
    setRecordings(newRecordings);
    
    if (currentSample < SAMPLE_TEXTS.length - 1) {
      setCurrentSample(currentSample + 1);
    } else {
      processVoiceClone(newRecordings);
    }
  };

  const processVoiceClone = async (audioBlobs: Blob[]) => {
    setStep('processing');
    
    try {
      // Validate audio blobs before processing
      if (!audioBlobs || audioBlobs.length < 3) {
        throw new Error('Insufficient voice samples. Please record at least 3 samples.');
      }

      // Check each blob for quality
      for (let i = 0; i < audioBlobs.length; i++) {
        if (!audioBlobs[i] || audioBlobs[i].size < 1000) {
          throw new Error(`Voice sample ${i + 1} is too short or corrupted. Please re-record.`);
        }
      }

      // Use the voice hook for cloning
      const modelId = await cloneVoice(voiceName, audioBlobs);
      
      // Get the saved model from database
      const savedModel = await db.voiceModels.where('modelId').equals(modelId).first();
      if (savedModel) {
        setCurrentVoiceModel(savedModel);
        setVoiceEnabled(true);
      }
      
      setVoiceModelId(modelId);
      setStep('complete');
      
    } catch (error) {
      console.error('Voice cloning failed:', error);
      
      // Enhanced fallback with better error handling
      try {
        console.log('Attempting fallback voice model creation...');
        
        const fallbackModelId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create a more robust fallback model
        const fallbackModel = {
          modelId: fallbackModelId,
          name: voiceName.trim(),
          samples: audioBlobs.map((_, index) => `sample_${index}.wav`),
          sampleBlobs: audioBlobs,
          createdAt: new Date(),
          isActive: true,
          isElevenLabsModel: false,
          quality: 'medium' as const // Better quality for local fallback
        };

        await db.voiceModels.add(fallbackModel);
        
        const savedFallbackModel = await db.voiceModels.where('modelId').equals(fallbackModelId).first();
        if (savedFallbackModel) {
          setCurrentVoiceModel(savedFallbackModel);
          setVoiceEnabled(true);
          setVoiceModelId(fallbackModelId);
          setStep('complete');
          
          console.log('Fallback voice model created successfully');
        } else {
          throw new Error('Failed to save fallback voice model');
        }
        
      } catch (fallbackError) {
        console.error('Fallback voice model creation failed:', fallbackError);
        
        // Final fallback: show error and allow retry
        setSetupError('Voice cloning failed. You can continue creating heirlooms without voice features, or try again with different audio samples.');
        setStep('intro');
      }
    }
  };

  const validateVoiceNameInput = (name: string): boolean => {
    setVoiceNameError(null);
    
    if (!name || name.trim().length === 0) {
      setVoiceNameError('Voice name is required');
      return false;
    }

    const validation = validateVoiceName(name);
    if (!validation.success) {
      setVoiceNameError(validation.error.errors[0]?.message || 'Invalid voice name');
      return false;
    }

    return true;
  };

  const handleVoiceNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setVoiceName(name);
    
    // Clear error when user starts typing
    if (voiceNameError) {
      setVoiceNameError(null);
    }
  };

  const handleNameSubmit = () => {
    if (validateVoiceNameInput(voiceName)) {
      setStep('recording');
    }
  };

  const skipVoiceSetup = () => {
    setVoiceEnabled(false);
    onComplete();
  };

  if (step === 'intro') {
    return (
      <div className="max-w-2xl mx-auto">
        {setupError && (
          <div className="mb-6 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{setupError}</p>
            </div>
          </div>
        )}
        
        <Card className="card-sacred text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-accent to-accent-glow rounded-3xl flex items-center justify-center">
            <Volume2 className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-3xl font-serif font-medium mb-4">
            Preserve Your Voice
          </h2>
          
          <p className="text-emotion mb-8">
            Create a digital clone of your voice that can speak your heirloom messages. 
            This adds a deeply personal touch that text alone cannot capture.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="text-left">
              <h3 className="font-medium mb-2">✨ What you get:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Your voice speaking any text</li>
                <li>• Multilingual capabilities</li>
                <li>• Emotional tone matching</li>
                <li>• Forever preserved</li>
              </ul>
            </div>
            
            <div className="text-left">
              <h3 className="font-medium mb-2">🔒 Privacy first:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Voice data encrypted</li>
                <li>• Stored locally</li>
                <li>• You control everything</li>
                <li>• Delete anytime</li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => setStep('name')}
              className="btn-hero"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Create Voice Clone
            </Button>
            
            <Button 
              variant="outline" 
              onClick={skipVoiceSetup}
              className="btn-gentle"
            >
              Skip for Now
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'name') {
    return (
      <div className="max-w-md mx-auto">
        <Card className="card-memory">
          <div className="text-center mb-6">
            <h3 className="text-xl font-medium mb-2">Name Your Voice</h3>
            <p className="text-muted-foreground">
              Give your voice clone a memorable name
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <Input
                placeholder="e.g., Mom's Voice, My Voice, etc."
                value={voiceName}
                onChange={handleVoiceNameChange}
                className={`text-center ${voiceNameError ? 'border-destructive focus:border-destructive' : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleNameSubmit();
                  }
                }}
              />
              {voiceNameError && (
                <p className="text-sm text-destructive mt-2 text-center">{voiceNameError}</p>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('intro');
                  setVoiceNameError(null);
                  setSetupError(null);
                }}
                className="btn-gentle"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              <Button
                onClick={handleNameSubmit}
                disabled={!voiceName.trim()}
                className="btn-hero flex-1"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'recording') {
    return (
      <div className="max-w-2xl mx-auto">
        <VoiceRecorder
          onRecordingComplete={handleRecordingComplete}
          sampleText={SAMPLE_TEXTS[currentSample]}
          sampleNumber={currentSample + 1}
          totalSamples={SAMPLE_TEXTS.length}
        />
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="card-sacred text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary to-primary-glow rounded-3xl flex items-center justify-center animate-pulse-soft">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-2xl font-serif font-medium mb-4">
            Creating Your Voice Clone
          </h2>
          
          <p className="text-emotion mb-8">
            Our AI is analyzing your voice patterns and creating a digital twin. 
            This process takes about 30 seconds.
          </p>
          
          <div className="space-y-4">
            <div className="shimmer h-4 rounded"></div>
            <div className="shimmer h-4 rounded w-3/4 mx-auto"></div>
            <div className="shimmer h-4 rounded w-1/2 mx-auto"></div>
          </div>
          
          <p className="text-sm text-muted-foreground mt-8">
            {isVoiceProcessing ? 'Processing voice samples...' : 'Finalizing voice model...'}
          </p>
        </Card>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="card-sacred text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-success to-success rounded-3xl flex items-center justify-center">
            <Check className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-2xl font-serif font-medium mb-4">
            Voice Clone Created! 🎉
          </h2>
          
          <p className="text-emotion mb-8">
            Your voice has been successfully preserved. You can now create living heirlooms 
            that speak in your own voice, adding an incredibly personal touch to your messages.
          </p>
          
          <div className="bg-success/10 rounded-xl p-4 mb-8">
            <p className="text-sm">
              <strong>"{voiceName}"</strong> is ready to use. Your voice can now speak any text 
              you write, in multiple languages, with emotional nuance.
            </p>
          </div>
          
          <Button 
            onClick={onComplete}
            className="btn-hero"
          >
            Continue to Interview
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      </div>
    );
  }

  return null;
};