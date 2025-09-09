import { describe, it, expect } from 'vitest';
import { 
  ValidationRules, 
  Validators, 
  validate, 
  getFirstError, 
  hasValidationErrors,
  collectAllErrors 
} from '@/lib/validation';

describe('ValidationRules', () => {
  describe('required', () => {
    const rule = ValidationRules.required();
    
    it('should pass for non-empty strings', () => {
      expect(rule.validate('hello')).toBe(true);
      expect(rule.validate('  hello  ')).toBe(true);
    });
    
    it('should fail for empty or whitespace strings', () => {
      expect(rule.validate('')).toBe(false);
      expect(rule.validate('   ')).toBe(false);
      expect(rule.validate(null as any)).toBe(false);
      expect(rule.validate(undefined as any)).toBe(false);
    });
  });

  describe('minLength', () => {
    const rule = ValidationRules.minLength(5);
    
    it('should pass for strings meeting minimum length', () => {
      expect(rule.validate('hello')).toBe(true);
      expect(rule.validate('hello world')).toBe(true);
    });
    
    it('should fail for strings below minimum length', () => {
      expect(rule.validate('hi')).toBe(false);
      expect(rule.validate('')).toBe(false);
    });
  });

  describe('validVoiceName', () => {
    const rule = ValidationRules.validVoiceName();
    
    it('should pass for valid voice names', () => {
      expect(rule.validate("Mom's Voice")).toBe(true);
      expect(rule.validate('My Voice')).toBe(true);
      expect(rule.validate('John-Doe')).toBe(true);
    });
    
    it('should fail for invalid voice names', () => {
      expect(rule.validate('A')).toBe(false); // Too short
      expect(rule.validate('Voice@Name')).toBe(false); // Invalid character
      expect(rule.validate('')).toBe(false); // Empty
    });
  });

  describe('meaningfulResponse', () => {
    const rule = ValidationRules.meaningfulResponse();
    
    it('should pass for meaningful responses', () => {
      expect(rule.validate('This is a meaningful response with enough words')).toBe(true);
    });
    
    it('should fail for short or meaningless responses', () => {
      expect(rule.validate('Yes')).toBe(false);
      expect(rule.validate('A B')).toBe(false);
      expect(rule.validate('')).toBe(false);
    });
  });
});

describe('Validators', () => {
  describe('voiceName', () => {
    it('should validate correct voice names', () => {
      const result = Validators.voiceName("Mom's Voice");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject invalid voice names', () => {
      const result = Validators.voiceName('');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('interviewResponse', () => {
    it('should validate meaningful responses', () => {
      const response = 'This is a thoughtful response about my childhood memories and the lessons I learned.';
      const result = Validators.interviewResponse(response);
      expect(result.isValid).toBe(true);
    });
    
    it('should reject short responses', () => {
      const result = Validators.interviewResponse('Yes');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please share something more detailed and meaningful');
    });
    
    it('should reject overly long responses', () => {
      const longResponse = 'A'.repeat(2001);
      const result = Validators.interviewResponse(longResponse);
      expect(result.isValid).toBe(false);
    });
  });

  describe('voiceSamples', () => {
    it('should validate sufficient voice samples', () => {
      const samples = [
        new Blob(['sample1'], { type: 'audio/wav' }),
        new Blob(['sample2'], { type: 'audio/wav' }),
        new Blob(['sample3'], { type: 'audio/wav' })
      ];
      
      // Mock blob size
      samples.forEach(blob => {
        Object.defineProperty(blob, 'size', { value: 5000 });
      });
      
      const result = Validators.voiceSamples(samples);
      expect(result.isValid).toBe(true);
    });
    
    it('should reject insufficient samples', () => {
      const samples = [new Blob(['sample1'], { type: 'audio/wav' })];
      const result = Validators.voiceSamples(samples);
      expect(result.isValid).toBe(false);
    });
  });
});

describe('Validation utilities', () => {
  describe('validate', () => {
    it('should apply multiple rules correctly', () => {
      const rules = [
        ValidationRules.required(),
        ValidationRules.minLength(5)
      ];
      
      const validResult = validate('hello world', rules);
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = validate('hi', rules);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getFirstError', () => {
    it('should return first error message', () => {
      const result = { isValid: false, errors: ['Error 1', 'Error 2'] };
      expect(getFirstError(result)).toBe('Error 1');
    });
    
    it('should return null for valid results', () => {
      const result = { isValid: true, errors: [] };
      expect(getFirstError(result)).toBeNull();
    });
  });

  describe('hasValidationErrors', () => {
    it('should detect validation errors', () => {
      const validResult = { isValid: true, errors: [] };
      const invalidResult = { isValid: false, errors: ['Error'] };
      
      expect(hasValidationErrors(validResult)).toBe(false);
      expect(hasValidationErrors(invalidResult)).toBe(true);
      expect(hasValidationErrors(validResult, invalidResult)).toBe(true);
    });
  });

  describe('collectAllErrors', () => {
    it('should collect errors from multiple results', () => {
      const result1 = { isValid: false, errors: ['Error 1'] };
      const result2 = { isValid: false, errors: ['Error 2', 'Error 3'] };
      const result3 = { isValid: true, errors: [] };
      
      const allErrors = collectAllErrors(result1, result2, result3);
      expect(allErrors).toEqual(['Error 1', 'Error 2', 'Error 3']);
    });
  });
});