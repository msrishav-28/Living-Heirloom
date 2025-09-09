import * as webllm from "@mlc-ai/web-llm";

export class GPTOSSClient {
  private engine: webllm.MLCEngine | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      // Use a smaller model for better performance in browser
      const selectedModel = "Llama-3.2-3B-Instruct-q4f32_1-MLC";
      
      this.engine = await webllm.CreateMLCEngine(selectedModel, {
        initProgressCallback: (report: webllm.InitProgressReport) => {
          console.log(`Loading model: ${report.progress * 100}%`);
          // You can emit events here for UI progress updates
          window.dispatchEvent(new CustomEvent('llm-loading', { 
            detail: { progress: report.progress, text: report.text } 
          }));
        },
      });

      this.isInitialized = true;
      console.log("GPT-OSS LLM initialized successfully");
    } catch (error) {
      console.error("Failed to initialize GPT-OSS LLM:", error);
      throw error;
    }
  }

  async generateInterviewQuestion(
    previousResponses: Record<string, string>,
    emotionalState: string,
    questionCategory: string
  ): Promise<string> {
    await this.initialize();
    if (!this.engine) throw new Error("LLM not initialized");

    const systemPrompt = `You are an empathetic AI interviewer helping people create meaningful time capsule messages. Your role is to ask thoughtful, gentle questions that help people express their deepest feelings and memories.

Guidelines:
- Ask one question at a time
- Be emotionally intelligent and sensitive
- Adapt to the person's emotional state: ${emotionalState}
- Focus on category: ${questionCategory}
- Build on previous responses naturally
- Keep questions personal but not invasive
- Use warm, caring language

Previous responses: ${JSON.stringify(previousResponses)}`;

    const userPrompt = `Based on the conversation so far, what would be the most meaningful follow-up question to help this person share their story? The question should be in the category of ${questionCategory} and consider their current emotional state of ${emotionalState}.`;

    try {
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      return response.choices[0]?.message?.content || "What would you like to share about this memory?";
    } catch (error) {
      console.error("Error generating interview question:", error);
      // Fallback to predefined questions
      return this.getFallbackQuestion(questionCategory);
    }
  }

  async generateTimeCapsuleMessage(
    responses: Record<string, string>,
    tone: string = "heartfelt",
    length: string = "medium"
  ): Promise<{
    content: string;
    title: string;
    emotionalTone: string;
  }> {
    await this.initialize();
    if (!this.engine) throw new Error("LLM not initialized");

    const systemPrompt = `You are an expert writer specializing in creating deeply meaningful, emotionally resonant time capsule messages. Your task is to transform interview responses into beautiful, heartfelt messages that preserve the person's authentic voice and emotions.

Guidelines:
- Preserve the person's authentic voice and personality
- Create emotional resonance without being overly sentimental
- Use elegant, timeless language
- Structure the message with natural flow
- Include specific memories and details mentioned
- Maintain the requested tone: ${tone}
- Target length: ${length}
- End with hope and love

The message should feel like it truly came from the person's heart.`;

    const userPrompt = `Please create a beautiful time capsule message based on these interview responses:

${Object.entries(responses).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n\n')}

Create a ${tone} message of ${length} length that captures the essence of what this person wants to communicate. Include a suggested title and identify the emotional tone.`;

    try {
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content || "";
      
      // Extract title and content (simple parsing)
      const lines = content.split('\n');
      const titleMatch = content.match(/Title:\s*(.+)/i);
      const title = titleMatch ? titleMatch[1] : "A Message from the Heart";
      
      // Remove title from content if it exists
      const cleanContent = content.replace(/Title:\s*.+\n?/i, '').trim();
      
      return {
        content: cleanContent,
        title,
        emotionalTone: tone
      };
    } catch (error) {
      console.error("Error generating time capsule message:", error);
      return this.getFallbackMessage(responses);
    }
  }

  async analyzeEmotionalState(text: string): Promise<string> {
    await this.initialize();
    if (!this.engine) throw new Error("LLM not initialized");

    const systemPrompt = `You are an emotional intelligence expert. Analyze the emotional state of the person based on their text and respond with a single word that best describes their current emotional state.

Possible states: joyful, nostalgic, melancholic, hopeful, grateful, reflective, loving, peaceful, excited, contemplative, vulnerable, proud, wistful, serene, passionate

Only respond with one word.`;

    try {
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.3,
        max_tokens: 10,
      });

      return response.choices[0]?.message?.content?.trim().toLowerCase() || "reflective";
    } catch (error) {
      console.error("Error analyzing emotional state:", error);
      return "reflective";
    }
  }

  private getFallbackQuestion(category: string): string {
    const fallbacks = {
      memories: "What's a moment from your life that still brings you joy when you think about it?",
      wisdom: "What's one piece of advice you'd want to share with someone you care about?",
      feelings: "How do you want to be remembered by the people you love?",
      future: "What hopes do you have for the future of those you care about?"
    };
    return fallbacks[category as keyof typeof fallbacks] || fallbacks.memories;
  }

  private getFallbackMessage(responses: Record<string, string>): {
    content: string;
    title: string;
    emotionalTone: string;
  } {
    const responseText = Object.values(responses).join(' ');
    return {
      content: `Dear Future Reader,

${responseText}

These words come from my heart, carrying with them all the love and hope I have for you and for tomorrow. May they serve as a reminder of the connection we share across time.

With all my love,
[Your Name]`,
      title: "A Message from the Heart",
      emotionalTone: "heartfelt"
    };
  }

  async isModelLoaded(): Promise<boolean> {
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

export const gptOSSClient = new GPTOSSClient();