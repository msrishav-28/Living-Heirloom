import * as webllm from "@mlc-ai/web-llm";
import { SYSTEM_PROMPTS, QUESTION_TEMPLATES, EMOTIONAL_RESPONSES } from './prompts';

export interface AILoadingProgress {
  progress: number;
  text: string;
  stage: 'downloading' | 'loading' | 'ready' | 'error';
}

export interface AIResponse {
  content: string;
  confidence: number;
  emotionalTone: string;
  suggestions?: string[];
}

class WebLLMManager {
  private engine: webllm.MLCEngine | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private selectedModel = "Llama-3.2-3B-Instruct-q4f32_1-MLC";
  private progressCallbacks: ((progress: AILoadingProgress) => void)[] = [];

  // Subscribe to loading progress
  onProgress(callback: (progress: AILoadingProgress) => void) {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyProgress(progress: AILoadingProgress) {
    this.progressCallbacks.forEach(callback => callback(progress));
    
    // Also emit global event for components that need it
    window.dispatchEvent(new CustomEvent('ai-progress', { detail: progress }));
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      this.notifyProgress({ progress: 0, text: 'Initializing AI...', stage: 'downloading' });

      // Add timeout for initialization
      const initTimeout = 120000; // 2 minutes timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI initialization timed out')), initTimeout);
      });

      const initPromise = webllm.CreateMLCEngine(this.selectedModel, {
        initProgressCallback: (report: webllm.InitProgressReport) => {
          const stage = report.progress < 0.8 ? 'downloading' : 'loading';
          
          // Provide more detailed progress messages
          let progressText = report.text || 'Loading AI model...';
          if (report.progress < 0.2) {
            progressText = 'Downloading AI model files...';
          } else if (report.progress < 0.5) {
            progressText = 'Processing model components...';
          } else if (report.progress < 0.8) {
            progressText = 'Preparing model for use...';
          } else {
            progressText = 'Finalizing AI initialization...';
          }
          
          this.notifyProgress({
            progress: report.progress,
            text: progressText,
            stage
          });
        },
      });

      this.engine = await Promise.race([initPromise, timeoutPromise]) as webllm.MLCEngine;

      this.isInitialized = true;
      this.notifyProgress({ progress: 1, text: 'AI ready for conversations!', stage: 'ready' });
      
      console.log("WebLLM initialized successfully");
      
      // Warm up the model with a simple test
      try {
        await this.engine.chat.completions.create({
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 5,
          temperature: 0.1
        });
        console.log("AI model warmed up successfully");
      } catch (warmupError) {
        console.warn("AI model warmup failed, but initialization succeeded:", warmupError);
      }
      
    } catch (error) {
      console.error("Failed to initialize WebLLM:", error);
      
      let errorText = 'AI unavailable';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorText = 'AI initialization timed out';
        } else if (error.message.includes('network')) {
          errorText = 'Network error loading AI';
        } else if (error.message.includes('memory')) {
          errorText = 'Insufficient memory for AI';
        }
      }
      
      this.notifyProgress({ progress: 0, text: errorText, stage: 'error' });
      throw error;
    }
  }

  async generateInterviewQuestion(
    previousResponses: Record<string, string>,
    emotionalState: string,
    questionCategory: string,
    currentQuestionIndex: number
  ): Promise<AIResponse> {
    try {
      await this.initialize();
      if (!this.engine) throw new Error("AI not initialized");

      // Validate inputs
      if (!emotionalState || !questionCategory) {
        throw new Error("Missing required parameters for question generation");
      }

      const context = this.buildInterviewContext(previousResponses, emotionalState, questionCategory);
      const systemPrompt = SYSTEM_PROMPTS.INTERVIEW_CONDUCTOR;
      
      const userPrompt = `Based on our conversation so far, generate the next thoughtful question for this person's living heirloom interview.

Context: ${context}
Current emotional state: ${emotionalState}
Question category: ${questionCategory}
Question number: ${currentQuestionIndex + 1}

Generate a single, empathetic question that builds naturally on their previous responses. The question should feel personal and help them share something meaningful for their family legacy.

Requirements:
- One question only
- 10-50 words
- Emotionally appropriate
- Builds on previous responses
- Helps preserve family memories`;

      const response = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      const rawContent = response.choices[0]?.message?.content;
      
      if (!rawContent || rawContent.trim().length === 0) {
        throw new Error("AI returned empty response");
      }

      // Clean and validate the content
      let content = rawContent.replace(/^["']|["']$/g, '').trim();
      
      // Ensure it's a question
      if (!content.endsWith('?')) {
        content += '?';
      }

      // Validate length
      if (content.length < 10) {
        throw new Error("Generated question is too short");
      }

      if (content.length > 300) {
        content = content.substring(0, 297) + '...';
      }
      
      return {
        content,
        confidence: 0.8,
        emotionalTone: emotionalState,
        suggestions: this.generateFollowUpSuggestions(emotionalState)
      };
    } catch (error) {
      console.error("Error generating interview question:", error);
      return {
        content: this.getFallbackQuestion(questionCategory),
        confidence: 0.3,
        emotionalTone: emotionalState
      };
    }
  }

  async generateTimeCapsuleContent(
    responses: Record<string, string>,
    tone: string = "heartfelt",
    length: string = "medium"
  ): Promise<{
    content: string;
    title: string;
    emotionalTone: string;
    wordCount: number;
  }> {
    try {
      await this.initialize();
      if (!this.engine) throw new Error("AI not initialized");

      // Validate inputs
      if (!responses || Object.keys(responses).length === 0) {
        throw new Error("No interview responses provided");
      }

      const systemPrompt = SYSTEM_PROMPTS.MESSAGE_WRITER;
      const responseText = Object.entries(responses)
        .filter(([q, a]) => q && a && a.trim().length > 0)
        .map(([q, a]) => `Q: ${q}\nA: ${a}`)
        .join('\n\n');

      if (!responseText.trim()) {
        throw new Error("No valid interview responses found");
      }

      // Determine target word count based on length
      let targetWords = 300;
      if (length === 'short') targetWords = 150;
      if (length === 'long') targetWords = 500;

      const userPrompt = `Transform these interview responses into a beautiful, ${tone} living heirloom message of ${length} length (approximately ${targetWords} words):

${responseText}

Create a message that:
- Preserves their authentic voice and personality
- Flows naturally and emotionally
- Includes specific memories and details they shared
- Ends with hope and love for future generations
- Feels timeless and meaningful as a family legacy
- Uses warm, personal language appropriate for family

Format:
Title: [Meaningful title]

[Message content]

Requirements:
- Target ${targetWords} words
- Include specific details from their responses
- Maintain ${tone} tone throughout
- End with love and hope`;

      const response = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: Math.min(1000, targetWords * 2), // Allow some buffer
      });

      const fullResponse = response.choices[0]?.message?.content;
      
      if (!fullResponse || fullResponse.trim().length === 0) {
        throw new Error("AI returned empty content");
      }

      const { content, title } = this.parseGeneratedContent(fullResponse);
      
      // Validate generated content
      if (!content || content.trim().length < 50) {
        throw new Error("Generated content is too short");
      }

      return {
        content,
        title,
        emotionalTone: tone,
        wordCount: content.split(' ').length
      };
    } catch (error) {
      console.error("Error generating living heirloom content:", error);
      return this.getFallbackContent(responses, tone);
    }
  }

  async analyzeEmotionalState(text: string): Promise<string> {
    try {
      await this.initialize();
      if (!this.engine) throw new Error("AI not initialized");

      const systemPrompt = SYSTEM_PROMPTS.EMOTIONAL_ANALYST;
      const userPrompt = `Analyze the emotional state of this person based on their response. Respond with a single word that best describes their current emotional state:

"${text}"

Choose from: joyful, nostalgic, melancholic, hopeful, grateful, reflective, loving, peaceful, excited, contemplative, vulnerable, proud, wistful, serene, passionate, tender, determined, content`;

      const response = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 10,
      });

      const emotion = response.choices[0]?.message?.content?.trim().toLowerCase() || "reflective";
      return this.validateEmotion(emotion);
    } catch (error) {
      console.error("Error analyzing emotional state:", error);
      return this.analyzeEmotionFallback(text);
    }
  }

  // Utility methods
  private buildInterviewContext(responses: Record<string, string>, emotion: string, category: string): string {
    const responseCount = Object.keys(responses).length;
    const recentResponses = Object.entries(responses).slice(-2);
    
    return `
Interview progress: ${responseCount} questions answered
Recent responses: ${recentResponses.map(([q, a]) => `"${a}"`).join(', ')}
Current emotional state: ${emotion}
Focus area: ${category}
    `.trim();
  }

  private parseGeneratedContent(fullResponse: string): { content: string; title: string } {
    const titleMatch = fullResponse.match(/(?:Title|TITLE):\s*(.+?)(?:\n|$)/i);
    const title = titleMatch ? titleMatch[1].trim() : "A Message from the Heart";
    
    // Remove title from content
    const content = fullResponse
      .replace(/(?:Title|TITLE):\s*.+?(?:\n|$)/i, '')
      .trim();
    
    return { content, title };
  }

  private validateEmotion(emotion: string): string {
    const validEmotions = [
      'joyful', 'nostalgic', 'melancholic', 'hopeful', 'grateful', 
      'reflective', 'loving', 'peaceful', 'excited', 'contemplative', 
      'vulnerable', 'proud', 'wistful', 'serene', 'passionate'
    ];
    
    return validEmotions.includes(emotion) ? emotion : 'reflective';
  }

  private analyzeEmotionFallback(text: string): string {
    const emotionKeywords = {
      joyful: ['happy', 'joy', 'excited', 'wonderful', 'amazing', 'love'],
      nostalgic: ['remember', 'used to', 'back then', 'childhood', 'past'],
      grateful: ['thankful', 'blessed', 'appreciate', 'grateful', 'lucky'],
      melancholic: ['sad', 'miss', 'lost', 'gone', 'difficult', 'hard'],
      hopeful: ['hope', 'future', 'dream', 'wish', 'believe', 'will']
    };

    const lowerText = text.toLowerCase();
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return emotion;
      }
    }
    
    return 'reflective';
  }

  private generateFollowUpSuggestions(emotionalState: string): string[] {
    return EMOTIONAL_RESPONSES[emotionalState as keyof typeof EMOTIONAL_RESPONSES]?.followUp 
      ? [EMOTIONAL_RESPONSES[emotionalState as keyof typeof EMOTIONAL_RESPONSES].followUp]
      : [];
  }

  private getFallbackQuestion(category: string): string {
    const templates = QUESTION_TEMPLATES[category.toUpperCase() as keyof typeof QUESTION_TEMPLATES] || QUESTION_TEMPLATES.OPENING;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private getFallbackContent(responses: Record<string, string>, tone: string): {
    content: string;
    title: string;
    emotionalTone: string;
    wordCount: number;
  } {
    const responseEntries = Object.entries(responses);
    
    if (responseEntries.length === 0) {
      const content = `Dear Future Reader,

I wanted to create this living heirloom to share something meaningful with you. Though I may not have had the chance to share all my thoughts in detail, please know that you are deeply loved and cherished.

The memories we create, the love we share, and the wisdom we pass down are the true treasures of life. May this message serve as a reminder of the connection we share across time.

With all my love and hope for your future,
[Your Name]`;

      return {
        content,
        title: "A Message of Love",
        emotionalTone: tone,
        wordCount: content.split(' ').length
      };
    }

    // Create a more structured fallback based on actual responses
    let content = `My Dear One,

I wanted to share some thoughts with you that I hope will stay with you always.

`;

    // Add each response in a meaningful way
    responseEntries.forEach(([question, answer], index) => {
      if (answer && answer.trim()) {
        if (question.toLowerCase().includes('moment') || question.toLowerCase().includes('memory')) {
          content += `When I think about precious moments, ${answer.trim()}\n\n`;
        } else if (question.toLowerCase().includes('wisdom') || question.toLowerCase().includes('advice')) {
          content += `Something I've learned that I want to share with you: ${answer.trim()}\n\n`;
        } else if (question.toLowerCase().includes('remember') || question.toLowerCase().includes('legacy')) {
          content += `I hope you'll remember this about me: ${answer.trim()}\n\n`;
        } else if (question.toLowerCase().includes('future') || question.toLowerCase().includes('hope')) {
          content += `For your future, I hope: ${answer.trim()}\n\n`;
        } else {
          content += `${answer.trim()}\n\n`;
        }
      }
    });

    content += `These words come from my heart, carrying with them all the love and hope I have for you. May they serve as a reminder of the precious connection we share across time and generations.

With endless love,
[Your Name]`;

    // Generate appropriate title based on tone
    let title = "A Message from the Heart";
    if (tone === 'wise' || tone === 'thoughtful') {
      title = "Wisdom for Tomorrow";
    } else if (tone === 'poetic' || tone === 'inspiring') {
      title = "A Legacy of Love";
    } else if (tone === 'conversational') {
      title = "Thoughts to Share";
    }

    return {
      content,
      title,
      emotionalTone: tone,
      wordCount: content.split(' ').length
    };
  }

  async isReady(): Promise<boolean> {
    return this.isInitialized && this.engine !== null;
  }

  async unload(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
      this.isInitialized = false;
      this.initPromise = null;
    }
  }
}

export const webLLMManager = new WebLLMManager();