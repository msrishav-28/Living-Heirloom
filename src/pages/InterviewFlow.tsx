import { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Clock, Sparkles, Heart, MessageCircle, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { VoiceCloneSetup } from '@/components/voice/VoiceCloneSetup';
import { LLMLoadingProgress } from '@/components/ai/LLMLoadingProgress';
import { useAppStore } from '@/stores/capsuleStore';
import { useAI } from '@/hooks/useAI';


interface Question {
  id: number;
  text: string;
  category: 'memories' | 'wisdom' | 'feelings' | 'future';
  mood: 'gentle' | 'thoughtful' | 'warm' | 'inspiring';
  followUp?: string;
}

const InterviewFlow = () => {
  const [showVoiceSetup, setShowVoiceSetup] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [emotionalState, setEmotionalState] = useState('reflective');
  const [aiQuestions, setAiQuestions] = useState<Record<number, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const { isVoiceEnabled, currentVoiceModel, isAIEnabled, isAIReady } = useAppStore();
  const { generateQuestion, analyzeEmotion, isLoading: isAILoading } = useAI();

  const questions: Question[] = [
    {
      id: 1,
      text: "What's a moment from your life that still makes you smile when you think about it?",
      category: 'memories',
      mood: 'warm',
      followUp: "Tell me more about why this moment was special to you."
    },
    {
      id: 2,
      text: "If you could share one piece of wisdom with someone you love, what would it be?",
      category: 'wisdom',
      mood: 'thoughtful',
      followUp: "What experiences taught you this wisdom?"
    },
    {
      id: 3,
      text: "What do you hope the person receiving this message will remember about you?",
      category: 'feelings',
      mood: 'gentle',
      followUp: "How do you want them to feel when they think of you?"
    },
    {
      id: 4,
      text: "What dreams or hopes do you have for their future?",
      category: 'future',
      mood: 'inspiring',
      followUp: "What advice would you give them to help achieve these dreams?"
    },
    {
      id: 5,
      text: "Is there something you've always wanted to tell them but never found the right moment?",
      category: 'feelings',
      mood: 'gentle',
      followUp: "What makes this the right moment to share it now?"
    }
  ];

  // Use AI-generated question if available, otherwise use predefined
  const baseQuestion = questions[currentQuestionIndex];
  const aiQuestion = aiQuestions[currentQuestionIndex];
  const currentQuestion = {
    ...baseQuestion,
    text: aiQuestion || baseQuestion.text
  };
  
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Typewriter effect for questions
  useEffect(() => {
    if (currentQuestion) {
      setIsTyping(true);
      setDisplayedText('');
      let index = 0;
      const text = currentQuestion.text;
      
      const timer = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          index++;
        } else {
          setIsTyping(false);
          clearInterval(timer);
        }
      }, 30);

      return () => clearInterval(timer);
    }
  }, [currentQuestion]);

  const handleNext = async () => {
    const trimmedAnswer = currentAnswer.trim();
    
    // Clear previous validation error
    setValidationError(null);
    
    // Validation
    if (!trimmedAnswer) {
      setValidationError('Please share your thoughts before continuing.');
      return;
    }

    if (trimmedAnswer.length < 10) {
      setValidationError('Please share something more detailed (at least 10 characters).');
      return;
    }

    if (trimmedAnswer.length > 2000) {
      setValidationError('Your response is too long. Please keep it under 2000 characters.');
      return;
    }

    try {
      const newAnswers = { ...answers, [currentQuestion.id]: trimmedAnswer };
      setAnswers(newAnswers);
      
      // Analyze emotional state with AI if available
      try {
        if (isAIEnabled && isAIReady) {
          const emotion = await analyzeEmotion(trimmedAnswer);
          setEmotionalState(emotion);
        }
      } catch (error) {
        console.log('Using fallback emotional analysis');
        // Continue without AI emotion analysis
      }
      
      setCurrentAnswer('');
      setValidationError(null);
      
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        
        // Generate next question with AI if available
        if (isAIEnabled && isAIReady) {
          try {
            await generateAIQuestion(newAnswers);
          } catch (error) {
            console.log('Failed to generate AI question, using predefined questions');
            // Continue with predefined questions
          }
        }
      } else {
        // Navigate to generation page with collected responses
        console.log('All answers collected:', newAnswers);
        window.location.href = '/generate';
      }
    } catch (error) {
      console.error('Error processing interview response:', error);
      setValidationError('Something went wrong. Please try again.');
    }
  };

  const generateAIQuestion = async (currentAnswers: Record<number, string>) => {
    try {
      const nextQuestionIndex = currentQuestionIndex + 1;
      if (nextQuestionIndex < questions.length) {
        const aiQuestion = await generateQuestion(
          currentAnswers,
          emotionalState,
          questions[nextQuestionIndex]?.category || 'general',
          nextQuestionIndex
        );
        
        // Store AI-generated question
        setAiQuestions(prev => ({
          ...prev,
          [nextQuestionIndex]: aiQuestion
        }));
      }
    } catch (error) {
      console.log('Using predefined questions as fallback');
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      const prevQuestion = questions[currentQuestionIndex - 1];
      setCurrentAnswer(answers[prevQuestion.id] || '');
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer('');
    }
  };

  const getMoodColors = (mood: string) => {
    switch (mood) {
      case 'warm': return 'from-accent to-accent-glow';
      case 'thoughtful': return 'from-secondary to-secondary-glow';
      case 'gentle': return 'from-primary to-primary-glow';
      case 'inspiring': return 'from-success to-success';
      default: return 'from-primary to-primary-glow';
    }
  };

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'warm': return Heart;
      case 'thoughtful': return Clock;
      case 'gentle': return MessageCircle;
      case 'inspiring': return Sparkles;
      default: return MessageCircle;
    }
  };

  // Show voice setup first if not completed
  if (showVoiceSetup && !isVoiceEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-6 flex items-center justify-center">
        <VoiceCloneSetup onComplete={() => setShowVoiceSetup(false)} />
      </div>
    );
  }

  return (
    <>
      <LLMLoadingProgress />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-6">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto py-4 px-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</span>
              {isVoiceEnabled && currentVoiceModel && (
                <div className="flex items-center gap-1 px-2 py-1 bg-accent/10 rounded-full">
                  <Volume2 className="w-3 h-3 text-accent" />
                  <span className="text-xs text-accent font-medium">{currentVoiceModel.name}</span>
                </div>
              )}
              {isAIEnabled && isAIReady && (
                <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-xs text-primary font-medium">AI Enhanced</span>
                </div>
              )}
              {isAILoading && (
                <div className="flex items-center gap-1 px-2 py-1 bg-secondary/10 rounded-full">
                  <div className="w-3 h-3 border border-secondary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-secondary font-medium">AI Thinking...</span>
                </div>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto pt-24">
        {/* Question Card */}
        <Card className="card-sacred mb-8" role="main" aria-labelledby="current-question">
          <div className="flex items-start gap-6">
            {/* AI Avatar */}
            <div className={`w-16 h-16 bg-gradient-to-br ${getMoodColors(currentQuestion.mood)} rounded-2xl flex items-center justify-center flex-shrink-0`}>
              {(() => {
                const Icon = getMoodIcon(currentQuestion.mood);
                return <Icon className="w-8 h-8 text-white" />;
              })()}
            </div>

            {/* Question Content */}
            <div className="flex-1">
              <div className="mb-6">
                <h2 
                  id="current-question"
                  className="text-2xl font-serif font-medium mb-4"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {displayedText}
                  {isTyping && <span className="animate-pulse" aria-hidden="true">|</span>}
                </h2>
                {!isTyping && currentQuestion.followUp && (
                  <p className="text-muted-foreground animate-fade-up" aria-live="polite">
                    {currentQuestion.followUp}
                  </p>
                )}
              </div>

              {/* Response Area */}
              <div className="space-y-6">
                <div>
                  <Textarea
                    value={currentAnswer}
                    onChange={(e) => {
                      setCurrentAnswer(e.target.value);
                      // Clear validation error when user starts typing
                      if (validationError) {
                        setValidationError(null);
                      }
                    }}
                    placeholder="Take your time... Share what feels right to you."
                    className={`min-h-32 text-lg resize-none border-2 rounded-xl transition-colors ${
                      validationError 
                        ? 'border-destructive focus:border-destructive' 
                        : 'focus:border-primary/50'
                    }`}
                    disabled={isTyping}
                    aria-label="Your response to the interview question"
                    aria-describedby={validationError ? "response-error" : "response-help"}
                    aria-invalid={validationError ? "true" : "false"}
                  />
                  
                  {/* Character count */}
                  <div className="flex justify-between items-center mt-2">
                    <div>
                      {validationError && (
                        <p id="response-error" className="text-sm text-destructive" role="alert">
                          {validationError}
                        </p>
                      )}
                      {!validationError && (
                        <p id="response-help" className="text-sm text-muted-foreground sr-only">
                          Share your thoughts and feelings about this question. Take your time to express what feels meaningful to you.
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground" aria-label={`Character count: ${currentAnswer.length} of 2000`}>
                      {currentAnswer.length}/2000 characters
                    </p>
                  </div>
                </div>

                {currentAnswer.trim() && !validationError && currentAnswer.length >= 10 && (
                  <div className="animate-fade-up">
                    <p className="text-sm text-muted-foreground mb-4">
                      Beautiful. Your words carry so much meaning.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <div className="flex gap-3">
                    {currentQuestionIndex > 0 && (
                      <Button 
                        variant="outline" 
                        onClick={handlePrevious}
                        className="btn-gentle focus:ring-2 focus:ring-primary"
                        aria-label="Go back to previous question"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
                        Previous
                      </Button>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      onClick={handleSkip}
                      className="btn-ghost focus:ring-2 focus:ring-primary"
                      aria-label="Skip this question and continue to the next one"
                    >
                      Skip for now
                    </Button>
                  </div>

                  <Button 
                    onClick={handleNext}
                    disabled={!currentAnswer.trim() || isTyping}
                    className={`btn-hero group focus:ring-2 focus:ring-primary focus:ring-offset-2 ${currentAnswer.trim() ? 'animate-pulse-soft' : ''}`}
                    aria-label={currentQuestionIndex === questions.length - 1 ? 'Complete interview and create your heirloom' : 'Continue to next question'}
                  >
                    {currentQuestionIndex === questions.length - 1 ? 'Create My Heirloom' : 'Continue'}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Encouraging Messages */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {currentQuestionIndex === 0 && "Welcome! Let's begin this meaningful journey together."}
            {currentQuestionIndex === 1 && "You're doing wonderfully. These memories are precious."}
            {currentQuestionIndex === 2 && "Your wisdom will be treasured by those who receive it."}
            {currentQuestionIndex === 3 && "Almost there! Your story is taking beautiful shape."}
            {currentQuestionIndex === 4 && "This is the final question. You've shared something truly special."}
          </p>
        </div>

        {/* Floating comfort elements */}
        <div className="fixed bottom-8 right-8 opacity-30 pointer-events-none">
          <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl animate-pulse-soft"></div>
        </div>
      </div>
      </div>
    </>
  );
};

export default InterviewFlow;