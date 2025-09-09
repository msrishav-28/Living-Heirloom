// Data sanitization utilities for Living Heirloom

/**
 * Sanitizes text input by removing potentially harmful content
 * while preserving the emotional and meaningful content
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Basic HTML entity encoding for safety
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  let sanitized = input.replace(/[&<>"'/]/g, (match) => htmlEntities[match] || match);

  // Remove excessive whitespace while preserving intentional formatting
  sanitized = sanitized
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple newlines to double newline max
    .trim();

  return sanitized;
}

/**
 * Sanitizes user names and titles
 */
export function sanitizeName(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[^\w\s'-]/g, '') // Only allow word characters, spaces, hyphens, apostrophes
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .substring(0, 100); // Reasonable length limit
}

/**
 * Sanitizes voice model names
 */
export function sanitizeVoiceName(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[^a-zA-Z0-9\s'-]/g, '') // Only allow alphanumeric, spaces, hyphens, apostrophes
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .substring(0, 50); // Voice name length limit
}

/**
 * Sanitizes interview responses while preserving emotional content
 */
export function sanitizeInterviewResponse(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // More lenient sanitization for interview responses to preserve emotional content
  let sanitized = input
    .trim()
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/\n\s*\n\s*\n/g, '\n\n'); // Multiple newlines to double newline max

  // Remove only obviously problematic patterns while preserving punctuation and emotion
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers

  return sanitized.substring(0, 5000); // Reasonable length limit for responses
}

/**
 * Sanitizes file names for voice samples
 */
export function sanitizeFileName(input: string): string {
  if (!input || typeof input !== 'string') {
    return 'untitled';
  }

  return input
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid filename characters with underscore
    .replace(/_{2,}/g, '_') // Multiple underscores to single underscore
    .substring(0, 100); // Reasonable filename length
}

/**
 * Validates and sanitizes email addresses
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const email = input.trim().toLowerCase();
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return '';
  }

  return email.substring(0, 254); // RFC 5321 email length limit
}

/**
 * Sanitizes URLs for sharing features
 */
export function sanitizeUrl(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const url = input.trim();
  
  // Only allow http and https protocols
  if (!url.match(/^https?:\/\//i)) {
    return '';
  }

  try {
    const urlObj = new URL(url);
    // Only allow certain domains if needed for security
    return urlObj.toString();
  } catch {
    return '';
  }
}

/**
 * Removes potentially sensitive information from error messages
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unknown error occurred';
  }

  let message = error instanceof Error ? error.message : String(error);

  // Remove file paths and sensitive information
  message = message
    .replace(/\/[^\s]+/g, '[path]') // Remove file paths
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]') // Remove IP addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]') // Remove emails
    .replace(/\b[A-Za-z0-9]{20,}\b/g, '[token]'); // Remove potential tokens/keys

  return message.substring(0, 200); // Limit error message length
}

/**
 * Sanitizes metadata objects
 */
export function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Sanitize key
    const sanitizedKey = sanitizeName(key);
    if (!sanitizedKey) continue;

    // Sanitize value based on type
    if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeText(value);
    } else if (typeof value === 'number' && isFinite(value)) {
      sanitized[sanitizedKey] = value;
    } else if (typeof value === 'boolean') {
      sanitized[sanitizedKey] = value;
    } else if (value instanceof Date) {
      sanitized[sanitizedKey] = value;
    } else if (Array.isArray(value)) {
      // Recursively sanitize array elements
      sanitized[sanitizedKey] = value
        .filter(item => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')
        .map(item => typeof item === 'string' ? sanitizeText(item) : item)
        .slice(0, 100); // Limit array size
    }
    // Skip other types for security
  }

  return sanitized;
}

/**
 * Deep sanitization for complex objects
 */
export function deepSanitize<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const sanitized: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      (sanitized as any)[key] = sanitizeText(value);
    } else if (typeof value === 'number' && isFinite(value)) {
      (sanitized as any)[key] = value;
    } else if (typeof value === 'boolean') {
      (sanitized as any)[key] = value;
    } else if (value instanceof Date) {
      (sanitized as any)[key] = value;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      (sanitized as any)[key] = deepSanitize(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      (sanitized as any)[key] = value
        .map(item => {
          if (typeof item === 'string') return sanitizeText(item);
          if (typeof item === 'number' && isFinite(item)) return item;
          if (typeof item === 'boolean') return item;
          if (item instanceof Date) return item;
          if (item && typeof item === 'object') return deepSanitize(item as Record<string, unknown>);
          return null;
        })
        .filter(item => item !== null)
        .slice(0, 100); // Limit array size
    }
  }

  return sanitized;
}