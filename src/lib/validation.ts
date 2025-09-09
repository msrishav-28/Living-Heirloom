// Validation utilities for Living Heirloom application

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

// Generic validator function
export function validate<T>(value: T, rules: ValidationRule<T>[]): ValidationResult {
  const errors: string[] = [];
  
  for (const rule of rules) {
    if (!rule.validate(value)) {
      errors.push(rule.message);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Common validation rules
export const ValidationRules = {
  // String validation rules
  required: (message = 'This field is required'): ValidationRule<string> => ({
    validate: (value) => value != null && value.trim().length > 0,
    message
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => value != null && value.trim().length >= min,
    message: message || `Must be at least ${min} characters long`
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => value == null || value.trim().length <= max,
    message: message || `Must be no more than ${max} characters long`
  }),

  // Voice name validation
  validVoiceName: (): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return false;
      const trimmed = value.trim();
      return trimmed.length >= 2 && trimmed.length <= 50 && /^[a-zA-Z0-9\s'-]+$/.test(trimmed);
    },
    message: 'Voice name must be 2-50 characters and contain only letters, numbers, spaces, hyphens, and apostrophes'
  }),

  // Interview response validation
  meaningfulResponse: (message = 'Please share something meaningful'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return false;
      const trimmed = value.trim();
      return trimmed.length >= 10 && trimmed.split(' ').length >= 3;
    },
    message
  }),

  // File validation rules
  validAudioBlob: (): ValidationRule<Blob | null> => ({
    validate: (blob) => {
      if (!blob) return false;
      return blob.size > 1000 && blob.size < 10 * 1024 * 1024; // Between 1KB and 10MB
    },
    message: 'Audio recording must be between 1KB and 10MB'
  }),

  // Array validation rules
  minArrayLength: <T>(min: number, message?: string): ValidationRule<T[]> => ({
    validate: (array) => Array.isArray(array) && array.length >= min,
    message: message || `Must have at least ${min} items`
  }),

  // Email validation (if needed for sharing features)
  validEmail: (): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true; // Optional field
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value.trim());
    },
    message: 'Please enter a valid email address'
  }),

  // Date validation
  futureDate: (message = 'Date must be in the future'): ValidationRule<Date | string> => ({
    validate: (value) => {
      if (!value) return true; // Optional field
      const date = value instanceof Date ? value : new Date(value);
      return date > new Date();
    },
    message
  }),

  // Content validation
  noInappropriateContent: (): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true;
      // Basic inappropriate content detection
      const inappropriateWords = ['spam', 'scam', 'phishing']; // Add more as needed
      const lowerValue = value.toLowerCase();
      return !inappropriateWords.some(word => lowerValue.includes(word));
    },
    message: 'Content contains inappropriate material'
  })
};

// Specific validators for common use cases
export const Validators = {
  voiceName: (name: string): ValidationResult => {
    return validate(name, [
      ValidationRules.required('Voice name is required'),
      ValidationRules.validVoiceName()
    ]);
  },

  interviewResponse: (response: string): ValidationResult => {
    return validate(response, [
      ValidationRules.required('Please share your thoughts'),
      ValidationRules.meaningfulResponse('Please share something more detailed and meaningful'),
      ValidationRules.maxLength(2000, 'Response is too long. Please keep it under 2000 characters'),
      ValidationRules.noInappropriateContent()
    ]);
  },

  voiceSamples: (samples: Blob[]): ValidationResult => {
    const result = validate(samples, [
      ValidationRules.minArrayLength(3, 'At least 3 voice samples are required')
    ]);

    if (!result.isValid) return result;

    // Validate each sample
    for (let i = 0; i < samples.length; i++) {
      const sampleResult = validate(samples[i], [ValidationRules.validAudioBlob()]);
      if (!sampleResult.isValid) {
        return {
          isValid: false,
          errors: [`Sample ${i + 1}: ${sampleResult.errors[0]}`]
        };
      }
    }

    return { isValid: true, errors: [] };
  },

  heirloomTitle: (title: string): ValidationResult => {
    return validate(title, [
      ValidationRules.required('Heirloom title is required'),
      ValidationRules.minLength(3, 'Title must be at least 3 characters'),
      ValidationRules.maxLength(100, 'Title must be no more than 100 characters')
    ]);
  },

  recipientName: (name: string): ValidationResult => {
    return validate(name, [
      ValidationRules.required('Recipient name is required'),
      ValidationRules.minLength(2, 'Name must be at least 2 characters'),
      ValidationRules.maxLength(50, 'Name must be no more than 50 characters')
    ]);
  },

  deliveryDate: (date: Date | string | null): ValidationResult => {
    if (!date) return { isValid: true, errors: [] }; // Optional field
    
    return validate(date, [
      ValidationRules.futureDate('Delivery date must be in the future')
    ]);
  }
};

// Helper function to get first error message
export function getFirstError(result: ValidationResult): string | null {
  return result.errors.length > 0 ? result.errors[0] : null;
}

// Helper function to check if any validation results have errors
export function hasValidationErrors(...results: ValidationResult[]): boolean {
  return results.some(result => !result.isValid);
}

// Helper function to collect all errors from multiple validation results
export function collectAllErrors(...results: ValidationResult[]): string[] {
  return results.flatMap(result => result.errors);
}