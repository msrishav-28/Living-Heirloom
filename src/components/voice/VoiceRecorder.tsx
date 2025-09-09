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

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                }
            });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error starting recording:', error);
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

            {/* Recording Controls */}
            <div className="space-y-4">
                {!audioBlob ? (
                    <div className="text-center">
                        <Button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`w-24 h-24 rounded-full ${isRecording
                                ? 'bg-destructive hover:bg-destructive/90 animate-pulse'
                                : 'btn-hero'
                                }`}
                        >
                            {isRecording ? (
                                <MicOff className="w-8 h-8" />
                            ) : (
                                <Mic className="w-8 h-8" />
                            )}
                        </Button>

                        {isRecording && (
                            <div className="mt-4">
                                <p className="text-2xl font-mono font-medium text-accent">
                                    {formatTime(recordingTime)}
                                </p>
                                <p className="text-sm text-muted-foreground">Recording...</p>
                            </div>
                        )}

                        {!isRecording && recordingTime === 0 && (
                            <p className="text-sm text-muted-foreground mt-4">
                                Tap to start recording
                            </p>
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
                </p>
            </div>
        </Card>
    );
};