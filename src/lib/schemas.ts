import { z } from 'zod';

// Base schemas for common types
export const DateSchema = z.union([z.date(), z.string().datetime()]).transform(val => 
  typeof val === 'string' ? new Date(val) : val
);

export const BlobSchema = z.instanceof(Blob).refine(
  blob => blob.size > 0 && blob.size < 50 * 1024 * 1024, // 50MB limit
  'File must be between 1 byte and 50MB'
);

// TimeCapsule schema
export const TimeCapsuleMetadataSchema = z.object({
  tone: z.string().min(1),
  emotionalState: z.string().min(1),
  interviewResponses: z.record(z.string()),
  aiConfidence: z.number().min(0).max(1).optional(),
  generationMethod: z.enum(['ai', 'template', 'manual']),
  voiceCloned: z.boolean()
});

export const TimeCapsuleSchema = z.object({
  id: z.number().optional(),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  recipient: z.string()
    .min(1, 'Recipient is required')
    .max(100, 'Recipient name must be less than 100 characters')
    .trim(),
  type: z.enum(['legacy', 'family', 'future-self']),
  status: z.enum(['draft', 'scheduled', 'delivered', 'locked']),
  content: z.string()
    .min(1, 'Content is required')
    .max(50000, 'Content is too long'),
  encryptedContent: z.string().optional(),
  voiceModelId: z.string().optional(),
  audioUrl: z.string().url().optional(),
  audioBlob: BlobSchema.optional(),
  createdAt: DateSchema,
  deliveryDate: DateSchema.optional(),
  isEncrypted: z.boolean(),
  wordCount: z.number().min(0),
  isAIGenerated: z.boolean(),
  metadata: TimeCapsuleMetadataSchema
});

// VoiceModel schema
export const VoiceModelSchema = z.object({
  id: z.number().optional(),
  modelId: z.string().min(1, 'Model ID is required'),
  name: z.string()
    .min(2, 'Voice name must be at least 2 characters')
    .max(50, 'Voice name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s'-]+$/, 'Voice name contains invalid characters')
    .trim(),
  samples: z.array(z.string()).min(1),
  sampleBlobs: z.array(BlobSchema).min(3, 'At least 3 voice samples required').optional(),
  createdAt: DateSchema,
  isActive: z.boolean(),
  isElevenLabsModel: z.boolean(),
  quality: z.enum(['high', 'medium', 'low'])
});

// InterviewSession schema
export const InterviewSessionSchema = z.object({
  id: z.number().optional(),
  sessionId: z.string().min(1),
  responses: z.record(z.string()),
  emotionalJourney: z.record(z.string()),
  currentQuestionIndex: z.number().min(0),
  emotionalState: z.string().min(1),
  aiEnhanced: z.boolean(),
  createdAt: DateSchema,
  completedAt: DateSchema.optional(),
  totalQuestions: z.number().min(1)
});

// AIModel schema
export const AIModelPerformanceSchema = z.object({
  loadTime: z.number().min(0),
  averageResponseTime: z.number().min(0),
  successRate: z.number().min(0).max(1)
});

export const AIModelSchema = z.object({
  id: z.number().optional(),
  modelName: z.string().min(1),
  isLoaded: z.boolean(),
  loadedAt: DateSchema.optional(),
  performance: AIModelPerformanceSchema
});

// AppSettings schema
export const AppSettingsPreferencesSchema = z.object({
  enableAI: z.boolean(),
  enableVoice: z.boolean(),
  defaultTone: z.string().min(1),
  autoSave: z.boolean(),
  encryptByDefault: z.boolean()
});

export const AppSettingsPrivacySchema = z.object({
  dataRetention: z.number().min(1).max(3650), // 1 day to 10 years
  shareAnalytics: z.boolean(),
  allowTelemetry: z.boolean()
});

export const AppSettingsSchema = z.object({
  id: z.number().optional(),
  userId: z.string().min(1),
  preferences: AppSettingsPreferencesSchema,
  privacy: AppSettingsPrivacySchema,
  updatedAt: DateSchema
});

// Input validation schemas for forms
export const VoiceNameInputSchema = z.string()
  .min(2, 'Voice name must be at least 2 characters')
  .max(50, 'Voice name must be less than 50 characters')
  .regex(/^[a-zA-Z0-9\s'-]+$/, 'Voice name can only contain letters, numbers, spaces, hyphens, and apostrophes')
  .trim();

export const InterviewResponseSchema = z.string()
  .min(10, 'Please share something more detailed')
  .max(2000, 'Response is too long (max 2000 characters)')
  .trim();

export const HeirloomTitleSchema = z.string()
  .min(3, 'Title must be at least 3 characters')
  .max(100, 'Title must be less than 100 characters')
  .trim();

export const RecipientNameSchema = z.string()
  .min(2, 'Recipient name must be at least 2 characters')
  .max(50, 'Recipient name must be less than 50 characters')
  .trim();

export const DeliveryDateSchema = z.union([
  z.date(),
  z.string().datetime()
]).transform(val => typeof val === 'string' ? new Date(val) : val)
  .refine(date => date > new Date(), 'Delivery date must be in the future')
  .optional();

// Validation helper functions
export function validateTimeCapsule(data: unknown) {
  return TimeCapsuleSchema.safeParse(data);
}

export function validateVoiceModel(data: unknown) {
  return VoiceModelSchema.safeParse(data);
}

export function validateInterviewSession(data: unknown) {
  return InterviewSessionSchema.safeParse(data);
}

export function validateAppSettings(data: unknown) {
  return AppSettingsSchema.safeParse(data);
}

// Form validation helpers
export function validateVoiceName(name: string) {
  return VoiceNameInputSchema.safeParse(name);
}

export function validateInterviewResponse(response: string) {
  return InterviewResponseSchema.safeParse(response);
}

export function validateHeirloomTitle(title: string) {
  return HeirloomTitleSchema.safeParse(title);
}

export function validateRecipientName(name: string) {
  return RecipientNameSchema.safeParse(name);
}

export function validateDeliveryDate(date: Date | string | null) {
  if (!date) return { success: true, data: undefined };
  return DeliveryDateSchema.safeParse(date);
}

// Type exports for TypeScript
export type TimeCapsuleInput = z.infer<typeof TimeCapsuleSchema>;
export type VoiceModelInput = z.infer<typeof VoiceModelSchema>;
export type InterviewSessionInput = z.infer<typeof InterviewSessionSchema>;
export type AIModelInput = z.infer<typeof AIModelSchema>;
export type AppSettingsInput = z.infer<typeof AppSettingsSchema>;