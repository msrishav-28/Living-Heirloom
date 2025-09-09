import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Pause, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface VoiceRecorderProps {
    onRecordingComplete: (audioBlob: Blob) => void;
    sampleText: string;
    sampleNumber: number;
    totalSamples: number;
}

export const VoiceRecorder = ({
    onRecordingComplete,
    sampleText,
    sampleNumber,
    totalSamples
}: VoiceRecorderProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            setError(null);
            setIsProcessing(true);

            // Check for microphone support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Your browser does not support microphone access. Please use a modern browser like Chrome, Firefox, or Safari.');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                    channelCount: 1,
                }
            });

            streamRef.current = stream;

            // Check MediaRecorder support
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                ? 'audio/webm;codecs=opus' 
                : MediaRecorder.isTypeSupported('audio/webm') 
                ? 'audio/webm' 
                : 'audio/mp4';

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                setIsProcessing(true);
                
                const blob = new Blob(chunksRef.current, { type: mimeType });
                
                // Validate recording quality
                if (blob.size < 1000) { // Less than 1KB is likely too short
                    setError('Recording is too short. Please record for at least 3 seconds.');
                    setIsProcessing(false);
                    return;
                }

                if (blob.size > 10 * 1024 * 1024) { // More than 10MB is too large
                    setError('Recording is too large. Please keep recordings under 2 minutes.');
                    setIsProcessing(false);
                    return;
                }

                setAudioBlob(blob);
                
                if (audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                }
                
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                setIsProcessing(false);

                // Clean up stream
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
            };

            mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event);
                setError('Recording failed. Please try again.');
                setIsProcessing(false);
            };

            mediaRecorder.start(100); // Collect data every 100ms
            setIsRecording(true);
            setRecordingTime(0);
            setIsProcessing(false);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    const newTime = prev + 1;
                    // Auto-stop after 2 minutes to prevent overly long recordings
                    if (newTime >= 120) {
                        stopRecording();
                    }
                    return newTime;
                });
            }, 1000);

        } catch (error) {
            console.error('Error starting recording:', error);
            
            let errorMessage = 'Failed to start recording. ';
            
            if (error instanceof Error) {
                if (error.name === 'NotAllowedError') {
                    errorMessage += 'Please allow microphone access and try again.';
                } else if (error.name === 'NotFoundError') {
                    errorMessage += 'No microphone found. Please connect a microphone and try again.';
                } else if (error.name === 'NotSupportedError') {
                    errorMessage += 'Your browser does not support audio recording.';
                } else {
                    errorMessage += error.message;
                }
            } else {
                errorMessage += 'Please check your microphone and try again.';
            }
            
            setError(errorMessage);
            setIsProcessing(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const playRecording = () => {
        if (audioUrl && audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const pauseRecording = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const resetRecording = () => {
        setAudioBlob(null);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }
        setRecordingTime(0);
        setIsPlaying(false);
    };

    const confirmRecording = () => {
        if (audioBlob) {
            // Final validation before confirming
            if (recordingTime < 3) {
                setError('Recording is too short. Please record for at least 3 seconds.');
                return;
            }
            
            if (recordingTime > 120) {
                setError('Recording is too long. Please keep recordings under 2 minutes.');
                return;
            }
            
            setError(null);
            onRecordingComplete(audioBlob);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Card className="card-memory">
            <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-accent to-accent-glow rounded-2xl flex items-center justify-center">
                    <Mic className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-medium mb-2">
                    Voice Sample {sampleNumber} of {totalSamples}
                </h3>
                <Progress value={(sampleNumber / totalSamples) * 100} className="mb-4" />
            </div>

            {/* Sample Text */}
            <div className="bg-muted/30 rounded-xl p-4 mb-6">
                <p className="text-sm text-muted-foreground mb-2">Please read this text clearly:</p>
                <p className="text-lg font-light leading-relaxed italic">
                    "{sampleText}"
                </p>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-4">
                    <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
            )}

            {/* Recording Controls */}
            <div className="space-y-4">
                {!audioBlob ? (
                    <div className="text-center">
                        <Button
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isProcessing}
                            className={`w-24 h-24 rounded-full focus:ring-4 focus:ring-primary focus:ring-offset-2 ${isRecording
                                ? 'bg-destructive hover:bg-destructive/90 animate-pulse'
                                : 'btn-hero'
                                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-label={isRecording ? 'Stop recording your voice sample' : 'Start recording your voice sample'}
                            aria-pressed={isRecording}
                        >
                            {isRecording ? (
                                <MicOff className="w-8 h-8" aria-hidden="true" />
                            ) : (
                                <Mic className="w-8 h-8" aria-hidden="true" />
                            )}
                        </Button>

                        {isRecording && (
                            <div className="mt-4" role="status" aria-live="polite">
                                <p className="text-2xl font-mono font-medium text-accent" aria-label={`Recording time: ${formatTime(recordingTime)}`}>
                                    {formatTime(recordingTime)}
                                </p>
                                <p className="text-sm text-muted-foreground">Recording...</p>
                            </div>
                        )}

                        {!isRecording && recordingTime === 0 && !isProcessing && (
                            <p className="text-sm text-muted-foreground mt-4">
                                Tap to start recording
                            </p>
                        )}

                        {isProcessing && (
                            <div className="mt-4">
                                <p className="text-sm text-muted-foreground">Processing...</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Audio Player */}
                        <audio
                            ref={audioRef}
                            src={audioUrl || undefined}
                            onEnded={() => setIsPlaying(false)}
                            className="hidden"
                        />

                        <div className="flex items-center justify-center gap-4">
                            <Button
                                variant="outline"
                                onClick={isPlaying ? pauseRecording : playRecording}
                                className="btn-gentle"
                            >
                                {isPlaying ? (
                                    <Pause className="w-4 h-4 mr-2" />
                                ) : (
                                    <Play className="w-4 h-4 mr-2" />
                                )}
                                {isPlaying ? 'Pause' : 'Play'}
                            </Button>

                            <span className="text-sm text-muted-foreground">
                                Duration: {formatTime(recordingTime)}
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="outline"
                                onClick={resetRecording}
                                className="btn-gentle"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Re-record
                            </Button>

                            <Button
                                onClick={confirmRecording}
                                className="btn-hero"
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Use This Recording
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tips */}
            <div className="mt-6 p-4 bg-primary/5 rounded-xl">
                <p className="text-sm text-muted-foreground">
                    💡 <strong>Tips:</strong> Speak naturally, find a quiet space, and hold your device 6-8 inches away. 
                    Record for 5-30 seconds for best quality.
                </p>
            </div>
        </Card>
    );
};