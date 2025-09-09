import { lazy, Suspense } from 'react';
import { InlineLoader } from '@/components/PageLoader';

// Lazy load AI components
const LLMLoadingProgress = lazy(() => 
  import('@/components/ai/LLMLoadingProgress').then(module => ({
    default: module.LLMLoadingProgress
  }))
);

const AIErrorBoundary = lazy(() => 
  import('@/components/ErrorBoundary').then(module => ({
    default: module.AIErrorBoundary
  }))
);

// Lazy load Voice components
const VoiceCloneSetup = lazy(() => 
  import('@/components/voice/VoiceCloneSetup').then(module => ({
    default: module.VoiceCloneSetup
  }))
);

const VoiceErrorBoundary = lazy(() => 
  import('@/components/ErrorBoundary').then(module => ({
    default: module.VoiceErrorBoundary
  }))
);

// Wrapper components with suspense
export const LazyLLMLoadingProgress = (props: any) => (
  <Suspense fallback={<InlineLoader message="Loading AI components..." />}>
    <LLMLoadingProgress {...props} />
  </Suspense>
);

export const LazyAIErrorBoundary = ({ children, ...props }: any) => (
  <Suspense fallback={<InlineLoader message="Loading AI error handler..." />}>
    <AIErrorBoundary {...props}>
      {children}
    </AIErrorBoundary>
  </Suspense>
);

export const LazyVoiceCloneSetup = (props: any) => (
  <Suspense fallback={<InlineLoader message="Loading voice setup..." />}>
    <VoiceCloneSetup {...props} />
  </Suspense>
);

export const LazyVoiceErrorBoundary = ({ children, ...props }: any) => (
  <Suspense fallback={<InlineLoader message="Loading voice error handler..." />}>
    <VoiceErrorBoundary {...props}>
      {children}
    </VoiceErrorBoundary>
  </Suspense>
);