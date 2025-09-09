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

      this.engine = await webllm.CreateMLCEngine(this.selectedModel, {
        initProgressCallback: (report: webllm.InitProgressReport) => {
          const stage = report.progress < 0.8 ? 'downloading' : 'loading';
          this.notifyProgress({
            progress: report.progress,
            text: report.text || 'Loading AI model...',
            stage
          });
        },
      });

      this.isInitialized = true;
      this.notifyProgress({ progress: 1, text: 'AI ready!', stage: 'ready' });
      
      console.log("WebLLM initialized successfully");
    } catch (error) {
      console.error("Failed to initialize WebLLM:", error);
      this.notifyProgress({ progress: 0, text: 'AI unavailable', stage: 'error' });
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

      const context = this.buildInterviewContext(previousResponses, emotionalState, questionCategory);
      const systemPrompt = SYSTEM_PROMPTS.INTERVIEW_CONDUCTOR;
      
      const userPrompt = `Based on our conversation so far, generate the next thoughtful question for this person's time capsule interview.

Context: ${context}
Current emotional state: ${emotionalState}
Question category: ${questionCategory}
Question number: ${currentQuestionIndex + 1}

Generate a single, empathetic question that builds naturally on their previous responses. The question should feel personal and help them share something meaningful.`;

      const response = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      const content = response.choices[0]?.message?.content || this.getFallbackQuestion(questionCategory);
      
      return {
        content: content.replace(/^["']|["']$/g, ''), // Clean quotes
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

      const systemPrompt = SYSTEM_PROMPTS.MESSAGE_WRITER;
      const responseText = Object.entries(responses)
        .map(([q, a]) => `Q: ${q}\nA: ${a}`)
        .join('\n\n');

      const userPrompt = `Transform these interview responses into a beautiful, ${tone} time capsule message of ${length} length:

${responseText}

Create a message that:
- Preserves their authentic voice and personality
- Flows naturally and emotionally
- Includes specific memories and details they shared
- Ends with hope and love
- Feels timeless and meaningful

Also suggest a title that captures the essence of the message.`;

      const response = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 800,
      });

      const fullResponse = response.choices[0]?.message?.content || "";
      const { content, title } = this.parseGeneratedContent(fullResponse);
      
      return {
        content,
        title,
        emotionalTone: tone,
        wordCount: content.split(' ').length
      };
    } catch (error) {
      console.error("Error generating time capsule content:", error);
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
    const responseText = Object.values(responses).join(' ');
    const content = `Dear Future Reader,

${responseText}

These words come from my heart, carrying with them all the love and hope I have for you and for tomorrow. May they serve as a reminder of the connection we share across time.

With all my love,
[Your Name]`;

    return {
      content,
      title: "A Message from the Heart",
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