// Error recovery and resilience utilities for Living Heirloom

export interface RecoveryAction {
  label: string;
  action: () => Promise<void> | void;
  isPrimary?: boolean;
}

export interface ErrorRecoveryOptions {
  title: string;
  message: string;
  actions: RecoveryAction[];
  canRetry?: boolean;
  fallbackMessage?: string;
}

export class ErrorRecoveryManager {
  private static errorCounts = new Map<string, number>();
  private static maxRetries = 3;

  /**
   * Track error occurrences and determine if recovery should be attempted
   */
  static shouldAttemptRecovery(errorKey: string): boolean {
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);
    return count < this.maxRetries;
  }

  /**
   * Reset error count for a specific error type
   */
  static resetErrorCount(errorKey: string): void {
    this.errorCounts.delete(errorKey);
  }

  /**
   * Get recovery options for AI-related errors
   */
  static getAIRecoveryOptions(error: Error): ErrorRecoveryOptions {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      return {
        title: 'AI Connection Issue',
        message: 'The AI service is taking longer than expected to respond. This might be due to network conditions.',
        actions: [
          {
            label: 'Retry AI Features',
            action: () => window.location.reload(),
            isPrimary: true
          },
          {
            label: 'Continue Without AI',
            action: () => {
              // Disable AI features temporarily
              localStorage.setItem('ai-disabled-temp', 'true');
              window.location.reload();
            }
          }
        ],
        canRetry: true,
        fallbackMessage: 'You can still create beautiful heirlooms using our templates.'
      };
    }

    if (errorMessage.includes('memory') || errorMessage.includes('insufficient')) {
      return {
        title: 'Memory Limitation',
        message: 'Your device may not have enough memory to run AI features. This is common on older devices or when many tabs are open.',
        actions: [
          {
            label: 'Close Other Tabs',
            action: () => {
              alert('Please close other browser tabs and try again.');
            },
            isPrimary: true
          },
          {
            label: 'Use Template Mode',
            action: () => {
              localStorage.setItem('ai-disabled-temp', 'true');
              window.location.href = '/create';
            }
          }
        ],
        canRetry: false,
        fallbackMessage: 'Template mode provides beautiful pre-written messages you can customize.'
      };
    }

    // Generic AI error
    return {
      title: 'AI Features Unavailable',
      message: 'AI features are temporarily unavailable, but you can still create meaningful heirlooms.',
      actions: [
        {
          label: 'Try Again',
          action: () => window.location.reload(),
          isPrimary: true
        },
        {
          label: 'Continue Without AI',
          action: () => {
            localStorage.setItem('ai-disabled-temp', 'true');
            window.location.href = '/create';
          }
        }
      ],
      canRetry: true,
      fallbackMessage: 'Our templates help you create beautiful messages without AI assistance.'
    };
  }

  /**
   * Get recovery options for voice-related errors
   */
  static getVoiceRecoveryOptions(error: Error): ErrorRecoveryOptions {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('permission') || errorMessage.includes('notallowed')) {
      return {
        title: 'Microphone Permission Required',
        message: 'Voice cloning requires microphone access to record your voice samples.',
        actions: [
          {
            label: 'Grant Permission',
            action: () => {
              // Reload to trigger permission request again
              window.location.reload();
            },
            isPrimary: true
          },
          {
            label: 'Skip Voice Features',
            action: () => {
              // Continue without voice
              const event = new CustomEvent('skip-voice-setup');
              window.dispatchEvent(event);
            }
          }
        ],
        canRetry: true,
        fallbackMessage: 'You can still create beautiful written heirlooms without voice features.'
      };
    }

    if (errorMessage.includes('notfound') || errorMessage.includes('no microphone')) {
      return {
        title: 'No Microphone Detected',
        message: 'We couldn\'t find a microphone on your device. Voice cloning requires a working microphone.',
        actions: [
          {
            label: 'Check Microphone',
            action: () => {
              alert('Please ensure your microphone is connected and try again.');
              window.location.reload();
            },
            isPrimary: true
          },
          {
            label: 'Continue Without Voice',
            action: () => {
              const event = new CustomEvent('skip-voice-setup');
              window.dispatchEvent(event);
            }
          }
        ],
        canRetry: false,
        fallbackMessage: 'Written heirlooms are just as meaningful and can be shared easily.'
      };
    }

    if (errorMessage.includes('elevenlabs') || errorMessage.includes('api')) {
      return {
        title: 'Voice Service Unavailable',
        message: 'The voice cloning service is temporarily unavailable. This might be due to service maintenance or network issues.',
        actions: [
          {
            label: 'Try Again Later',
            action: () => window.location.reload(),
            isPrimary: true
          },
          {
            label: 'Create Text Heirloom',
            action: () => {
              const event = new CustomEvent('skip-voice-setup');
              window.dispatchEvent(event);
            }
          }
        ],
        canRetry: true,
        fallbackMessage: 'Your written words will be just as precious to your loved ones.'
      };
    }

    // Generic voice error
    return {
      title: 'Voice Features Unavailable',
      message: 'Voice cloning encountered an issue, but you can still create meaningful heirlooms.',
      actions: [
        {
          label: 'Try Again',
          action: () => window.location.reload(),
          isPrimary: true
        },
        {
          label: 'Continue Without Voice',
          action: () => {
            const event = new CustomEvent('skip-voice-setup');
            window.dispatchEvent(event);
          }
        }
      ],
      canRetry: true,
      fallbackMessage: 'Written messages can be just as powerful and meaningful.'
    };
  }

  /**
   * Get recovery options for database/storage errors
   */
  static getStorageRecoveryOptions(error: Error): ErrorRecoveryOptions {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('quota') || errorMessage.includes('storage')) {
      return {
        title: 'Storage Space Full',
        message: 'Your browser\'s storage is full. This can happen when you have many heirlooms or large voice recordings.',
        actions: [
          {
            label: 'Clear Old Data',
            action: async () => {
              if (confirm('This will remove old draft heirlooms. Your completed heirlooms will be preserved. Continue?')) {
                // Clear old drafts and temporary data
                try {
                  const { db } = await import('@/lib/db/database');
                  await db.cleanupExpiredData();
                  alert('Storage cleaned up successfully!');
                  window.location.reload();
                } catch (cleanupError) {
                  alert('Failed to clean up storage. Please try clearing your browser data.');
                }
              }
            },
            isPrimary: true
          },
          {
            label: 'Export Heirlooms',
            action: () => {
              window.location.href = '/capsules';
            }
          }
        ],
        canRetry: false,
        fallbackMessage: 'Consider exporting your heirlooms and clearing old drafts to free up space.'
      };
    }

    // Generic storage error
    return {
      title: 'Storage Issue',
      message: 'There was a problem saving your data. Your heirlooms might not be saved properly.',
      actions: [
        {
          label: 'Try Again',
          action: () => window.location.reload(),
          isPrimary: true
        },
        {
          label: 'Export Current Work',
          action: () => {
            // Try to export current work
            const currentData = localStorage.getItem('living-heirloom-app');
            if (currentData) {
              const blob = new Blob([currentData], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `heirloom-backup-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }
          }
        }
      ],
      canRetry: true,
      fallbackMessage: 'Consider exporting your work as a backup.'
    };
  }

  /**
   * Get generic recovery options for unknown errors
   */
  static getGenericRecoveryOptions(error: Error): ErrorRecoveryOptions {
    return {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred, but don\'t worry - your precious memories are safe.',
      actions: [
        {
          label: 'Refresh Page',
          action: () => window.location.reload(),
          isPrimary: true
        },
        {
          label: 'Go Home',
          action: () => {
            window.location.href = '/';
          }
        },
        {
          label: 'View My Heirlooms',
          action: () => {
            window.location.href = '/capsules';
          }
        }
      ],
      canRetry: true,
      fallbackMessage: 'If the problem persists, try refreshing your browser or restarting the application.'
    };
  }

  /**
   * Determine the appropriate recovery options based on error type
   */
  static getRecoveryOptions(error: Error, context?: string): ErrorRecoveryOptions {
    const errorMessage = error.message.toLowerCase();

    // AI-related errors
    if (context === 'ai' || errorMessage.includes('ai') || errorMessage.includes('llm') || errorMessage.includes('model')) {
      return this.getAIRecoveryOptions(error);
    }

    // Voice-related errors
    if (context === 'voice' || errorMessage.includes('voice') || errorMessage.includes('microphone') || errorMessage.includes('audio')) {
      return this.getVoiceRecoveryOptions(error);
    }

    // Storage-related errors
    if (context === 'storage' || errorMessage.includes('storage') || errorMessage.includes('database') || errorMessage.includes('quota')) {
      return this.getStorageRecoveryOptions(error);
    }

    // Generic error
    return this.getGenericRecoveryOptions(error);
  }
}