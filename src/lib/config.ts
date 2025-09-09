// Centralized configuration for Living Heirloom application

export interface AppConfig {
  app: {
    name: string;
    version: string;
    description: string;
    author: string;
  };
  features: {
    enableAI: boolean;
    enableVoice: boolean;
    enableAnalytics: boolean;
    enableOfflineMode: boolean;
    enableEncryption: boolean;
  };
  ai: {
    modelName: string;
    maxTokens: number;
    temperature: number;
    timeoutMs: number;
    retryAttempts: number;
  };
  voice: {
    sampleRate: number;
    channelCount: number;
    maxRecordingDuration: number;
    minRecordingDuration: number;
    maxFileSize: number;
    requiredSamples: number;
  };
  storage: {
    dbName: string;
    maxStorageSize: number;
    dataRetentionDays: number;
    autoCleanup: boolean;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    animations: boolean;
    reducedMotion: boolean;
    highContrast: boolean;
  };
  security: {
    encryptionAlgorithm: string;
    keyLength: number;
    saltLength: number;
    iterations: number;
  };
  performance: {
    chunkSize: number;
    maxConcurrentRequests: number;
    cacheTimeout: number;
    preloadComponents: boolean;
  };
}

// Default configuration
const defaultConfig: AppConfig = {
  app: {
    name: 'Living Heirloom',
    version: '1.0.0',
    description: 'Preserve your legacy for tomorrow',
    author: 'Living Heirloom Team'
  },
  features: {
    enableAI: true,
    enableVoice: true,
    enableAnalytics: false,
    enableOfflineMode: true,
    enableEncryption: true
  },
  ai: {
    modelName: 'Llama-3.2-3B-Instruct-q4f32_1-MLC',
    maxTokens: 800,
    temperature: 0.7,
    timeoutMs: 120000, // 2 minutes
    retryAttempts: 3
  },
  voice: {
    sampleRate: 44100,
    channelCount: 1,
    maxRecordingDuration: 120, // 2 minutes in seconds
    minRecordingDuration: 3, // 3 seconds
    maxFileSize: 10 * 1024 * 1024, // 10MB
    requiredSamples: 3
  },
  storage: {
    dbName: 'LivingHeirloomDB',
    maxStorageSize: 100 * 1024 * 1024, // 100MB
    dataRetentionDays: 365,
    autoCleanup: true
  },
  ui: {
    theme: 'auto',
    animations: true,
    reducedMotion: false,
    highContrast: false
  },
  security: {
    encryptionAlgorithm: 'AES-GCM',
    keyLength: 256,
    saltLength: 16,
    iterations: 100000
  },
  performance: {
    chunkSize: 1024 * 1024, // 1MB
    maxConcurrentRequests: 3,
    cacheTimeout: 300000, // 5 minutes
    preloadComponents: true
  }
};

// Environment-specific overrides
const getEnvironmentConfig = (): Partial<AppConfig> => {
  const env = import.meta.env;
  
  return {
    features: {
      enableAI: env.VITE_ENABLE_AI !== 'false',
      enableVoice: env.VITE_ENABLE_VOICE_FEATURES !== 'false',
      enableAnalytics: env.VITE_ENABLE_ANALYTICS === 'true',
      enableOfflineMode: env.VITE_ENABLE_OFFLINE_MODE !== 'false',
      enableEncryption: env.VITE_ENABLE_ENCRYPTION !== 'false'
    },
    ai: {
      modelName: env.VITE_AI_MODEL_NAME || defaultConfig.ai.modelName,
      timeoutMs: env.VITE_AI_TIMEOUT_MS ? parseInt(env.VITE_AI_TIMEOUT_MS) : defaultConfig.ai.timeoutMs
    }
  };
};

// User preference overrides
const getUserPreferences = (): Partial<AppConfig> => {
  try {
    const stored = localStorage.getItem('living-heirloom-preferences');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load user preferences:', error);
  }
  return {};
};

// Merge configurations with priority: user preferences > environment > defaults
const createConfig = (): AppConfig => {
  const envConfig = getEnvironmentConfig();
  const userConfig = getUserPreferences();
  
  return {
    ...defaultConfig,
    ...mergeDeep(defaultConfig, envConfig),
    ...mergeDeep(defaultConfig, userConfig)
  };
};

// Deep merge utility
function mergeDeep(target: any, source: any): any {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

// Configuration instance
export const config = createConfig();

// Configuration utilities
export const ConfigUtils = {
  // Save user preferences
  saveUserPreferences: (preferences: Partial<AppConfig>) => {
    try {
      const current = getUserPreferences();
      const updated = mergeDeep(current, preferences);
      localStorage.setItem('living-heirloom-preferences', JSON.stringify(updated));
      
      // Reload config (in a real app, you might want to emit an event)
      Object.assign(config, createConfig());
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  },

  // Get a specific config value with type safety
  get: <T extends keyof AppConfig>(section: T): AppConfig[T] => {
    return config[section];
  },

  // Check if a feature is enabled
  isFeatureEnabled: (feature: keyof AppConfig['features']): boolean => {
    return config.features[feature];
  },

  // Get environment info
  getEnvironment: () => {
    return {
      isDevelopment: import.meta.env.DEV,
      isProduction: import.meta.env.PROD,
      mode: import.meta.env.MODE
    };
  },

  // Validate configuration
  validate: (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validate AI config
    if (config.ai.maxTokens < 1 || config.ai.maxTokens > 2000) {
      errors.push('AI maxTokens must be between 1 and 2000');
    }

    if (config.ai.temperature < 0 || config.ai.temperature > 2) {
      errors.push('AI temperature must be between 0 and 2');
    }

    // Validate voice config
    if (config.voice.requiredSamples < 1 || config.voice.requiredSamples > 10) {
      errors.push('Voice requiredSamples must be between 1 and 10');
    }

    if (config.voice.maxRecordingDuration < config.voice.minRecordingDuration) {
      errors.push('Voice maxRecordingDuration must be greater than minRecordingDuration');
    }

    // Validate storage config
    if (config.storage.dataRetentionDays < 1) {
      errors.push('Storage dataRetentionDays must be at least 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Reset to defaults
  resetToDefaults: () => {
    localStorage.removeItem('living-heirloom-preferences');
    Object.assign(config, createConfig());
  }
};

// Export specific config sections for convenience
export const aiConfig = config.ai;
export const voiceConfig = config.voice;
export const storageConfig = config.storage;
export const uiConfig = config.ui;
export const securityConfig = config.security;
export const performanceConfig = config.performance;