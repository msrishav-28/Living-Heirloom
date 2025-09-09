import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary, AIErrorBoundary, VoiceErrorBoundary } from '@/components/ErrorBoundary';

// Mock component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when there is an error', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something Unexpected Happened')).toBeInTheDocument();
    expect(screen.getByText(/We're sorry, but something went wrong/)).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('provides retry functionality', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});

describe('AIErrorBoundary', () => {
  it('renders AI-specific error message', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <AIErrorBoundary>
        <ThrowError shouldThrow />
      </AIErrorBoundary>
    );
    
    expect(screen.getByText('AI Features Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/AI features are temporarily unavailable/)).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });
});

describe('VoiceErrorBoundary', () => {
  it('renders Voice-specific error message', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <VoiceErrorBoundary>
        <ThrowError shouldThrow />
      </VoiceErrorBoundary>
    );
    
    expect(screen.getByText('Voice Features Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/Voice features are temporarily unavailable/)).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });
});