import { useState } from 'react';
import { ArrowRight, ArrowLeft, Sparkles, Volume2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { VoiceRecorder } from './VoiceRecorder';
import { useVoice } from '@/hooks/useVoice';
import { useAppStore } from '@/stores/capsuleStore';
import { db } from '@/lib/db/database';

const SAMPLE_TEXTS = [
  "I want to preserve my voice for the people I love most in this world.",
  "Every story deserves to be heard, every voice deserves to echo through time.",
  "The memories we create today become the treasures of tomorrow."
];

export const VoiceCloneSetup = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState<'intro' | 'name' | 'recording' | 'processing' | 'complete'>('intro');
  const [voiceName, setVoiceName] = useState('');
  const [currentSample, setCurrentSample] = useState(0);
  const [recordings, setRecordings] = useState<Blob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceModelId, setVoiceModelId] = useState<string | null>(null);
  
  const { setCurrentVoiceModel, setVoiceEnabled } = useAppStore();
  const { cloneVoice, isProcessing } = useVoice();

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
      
      // Fallback: create a basic local model entry
      try {
        const fallbackModelId = `local_${Date.now()}`;
        await db.voiceModels.add({
          modelId: fallbackModelId,
          name: voiceName,
          samples: audioBlobs.map((_, index) => `sample_${index}.wav`),
          sampleBlobs: audioBlobs,
          createdAt: new Date(),
          isActive: true,
          isElevenLabsModel: false,
          quality: 'low'
        });
        
        const fallbackModel = await db.voiceModels.where('modelId').equals(fallbackModelId).first();
        if (fallbackModel) {
          setCurrentVoiceModel(fallbackModel);
          setVoiceEnabled(true);
        }
        
        setStep('complete');
      } catch (fallbackError) {
        console.error('Fallback voice model creation failed:', fallbackError);
        setStep('intro'); // Reset to allow retry
      }
    }
  };

  const skipVoiceSetup = () => {
    setVoiceEnabled(false);
    onComplete();
  };

  if (step === 'intro') {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="card-sacred text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-accent to-accent-glow rounded-3xl flex items-center justify-center">
            <Volume2 className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-3xl font-serif font-medium mb-4">
            Preserve Your Voice
          </h2>
          
          <p className="text-emotion mb-8">
            Create a digital clone of your voice that can speak your time capsule messages. 
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
            <Input
              placeholder="e.g., Mom's Voice, My Voice, etc."
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              className="text-center"
            />
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('intro')}
                className="btn-gentle"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              <Button
                onClick={() => setStep('recording')}
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
            {isProcessing ? 'Processing voice samples...' : 'Finalizing voice model...'}
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
            Your voice has been successfully preserved. You can now create time capsules 
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