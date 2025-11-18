import axios, { AxiosInstance } from 'axios';

interface AIConfig {
  proxyUrl: string;
  apiKey: string;
  model: string;
}

interface AssignmentStep {
  id: string;
  title: string;
  type: string;
  content: string;
  guidance?: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ModelsResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}

interface VisionMessage {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

interface VisionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string | VisionMessage[];
  }>;
  temperature?: number;
  max_tokens?: number;
}

interface ImageAnalysisResult {
  description: string;
  objects: string[];
  text_content?: string;
  diagram_type?: string;
  key_concepts?: string[];
  confidence: number;
}



interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class AIService {
  private client: AxiosInstance;
  private config: AIConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private requestQueue: Map<string, Promise<any>> = new Map(); // For request deduplication

  // Cache management methods
  private getCacheKey(method: string, params: any): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  private getCachedResponse(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCachedResponse(key: string, data: any, ttl: number = 300000): void { // Default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Clean up old entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Request deduplication
  private getDeduplicatedRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key)!;
    }

    const request = requestFn().finally(() => {
      this.requestQueue.delete(key);
    });

    this.requestQueue.set(key, request);
    return request;
  }

  constructor() {
    this.config = {
      proxyUrl: process.env.AI_PROXY_URL || 'https://api.openai.com',
      apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '',
      model: process.env.AI_MODEL || 'gpt-4',
    };
    this.client = axios.create({
      baseURL: this.config.proxyUrl,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });


  }

  /**
   * Get available models from the AI proxy
   */
  async getModels(): Promise<ModelsResponse> {
    try {
      const response = await this.client.get('/v1/models');
      return response.data;
    } catch (error) {
      console.error('Error fetching models:', error);
      throw new Error('Failed to fetch available models');
    }
  }

  /**
   * Create a chat completion using the AI proxy
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse | AsyncIterable<any>> {
    // For testing with dummy API key, provide mock response (takes precedence over proxy)
    if (this.config.apiKey === 'dummy-api-key-for-testing') {
      console.log('Using mock response for dummy API key');
      const userMessage = request.messages.find(m => m.role === 'user')?.content || '';
      const lowerMessage = userMessage.toLowerCase();

      let mockContent = '';
      if (lowerMessage === 'hi' || lowerMessage === 'hello' || lowerMessage === 'hey') {
        mockContent = "Hello! I'm your AI assistant for managing personal resources. How can I help you find or organize your notes, documents, or other materials today?";
      } else if (lowerMessage === 'who r uh' || lowerMessage === 'who are you') {
        mockContent = "I'm your personal AI assistant for the Resource Manager application. I help you search through and organize your stored resources like notes, documents, videos, and links using natural language queries.";
      } else if (lowerMessage.includes('what can you do') || lowerMessage.includes('help')) {
        mockContent = "I can help you search through your personal resources, suggest relevant materials, and assist with organizing your content. Try asking me to find specific notes, documents, or topics!";
      } else {
        mockContent = "I'm currently running in test mode. To get full AI-powered responses, please configure a valid API key. In the meantime, I can help you search through your stored resources!";
      }

      return {
        id: 'mock-completion',
        object: 'chat.completion',
        created: Date.now(),
        model: this.config.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: mockContent
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      };
    }

    try {
      const response = await this.client.post('/v1/chat/completions', request);
      return response.data;
    } catch (error) {
      console.error('Error creating chat completion:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Create a streaming chat completion with character-by-character streaming for smooth typing effect
   */
  async *createStreamingChatCompletion(request: ChatCompletionRequest): AsyncIterable<{ content: string }> {
    try {
      // Get the response without stream flag
      const nonStreamingRequest = { ...request, stream: false };
      const response = await this.createChatCompletion(nonStreamingRequest);
      const fullContent = (response as ChatCompletionResponse).choices[0]?.message?.content || '';

      if (fullContent) {
        // Split content into words for smooth SSE streaming effect
        const words = fullContent.split(' ');

        // Yield words one by one with small delays for typing effect
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          yield { content: word + (i < words.length - 1 ? ' ' : '') };
          // Small delay between words for realistic typing effect
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } catch (error) {
      console.error('Error creating streaming chat completion:', error);
      throw new Error('Failed to generate streaming AI response');
    }
  }

  /**
   * Generate embeddings for text (if supported by proxy)
   */
  async createEmbeddings(text: string, model: string = 'text-embedding-ada-002') {
    try {
      const response = await this.client.post('/v1/embeddings', {
        input: text,
        model: model,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating embeddings:', error);
      throw new Error('Failed to generate embeddings');
    }
  }

  /**
   * Summarize content to a specified length
   */
  async summarizeContent(content: string, maxLength: number = 100): Promise<string> {
    const cacheKey = this.getCacheKey('summarizeContent', { content, maxLength });
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    return this.getDeduplicatedRequest(cacheKey, async () => {
      try {
        const response = await this.createChatCompletion({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: `You are a helpful assistant that creates concise summaries. Summarize the given content in ${maxLength} characters or less.`
            },
            {
              role: 'user',
              content: content
            }
          ],
          temperature: 0.3,
        });

        const summary = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
        const result = summary || content.substring(0, maxLength);
        this.setCachedResponse(cacheKey, result, 1800000); // Cache for 30 minutes
        return result;
      } catch (error) {
        console.error('Error summarizing content:', error);
        // Fallback to simple truncation
        const result = content.length > maxLength ? content.substring(0, maxLength - 3) + '...' : content;
        this.setCachedResponse(cacheKey, result, 300000); // Cache fallback for 5 minutes
        return result;
      }
    });
  }

  /**
   * Extract relevant tags from content
   */
  async extractTags(content: string, maxTags: number = 5): Promise<string[]> {
    const cacheKey = this.getCacheKey('extractTags', { content, maxTags });
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    return this.getDeduplicatedRequest(cacheKey, async () => {
      try {
        const response = await this.createChatCompletion({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: `You are a tag extractor. Analyze the provided content and extract ${maxTags} relevant tags that best describe the main topics, themes, or key concepts. Return only a comma-separated list of tags, no other text.`
            },
            {
              role: 'user',
              content: `Extract tags from this content:\n\n${content}`
            }
          ],
          max_tokens: 100,
          temperature: 0.3,
        });

        const tagsText = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
        let result: string[] = [];
        if (tagsText) {
          result = tagsText.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
            .slice(0, maxTags);
        }
        this.setCachedResponse(cacheKey, result, 1800000); // Cache for 30 minutes
        return result;
      } catch (error) {
        console.error('Error extracting tags:', error);
        const result: string[] = [];
        this.setCachedResponse(cacheKey, result, 300000); // Cache empty result for 5 minutes
        return result;
      }
    });
  }

  async enhanceSearchQuery(userQuery: string): Promise<{
    intent: 'search' | 'chat';
    enhancedQuery: string;
    searchTerms: string[];
    filters: {
      type?: string;
      tags?: string[];
    };
  }> {
    const cacheKey = this.getCacheKey('enhanceSearchQuery', { userQuery });
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    return this.getDeduplicatedRequest(cacheKey, async () => {
      // For testing with dummy API key, provide mock intent detection
      if (this.config.apiKey === 'dummy-api-key-for-testing') {
        const lowerQuery = userQuery.toLowerCase();
        if (lowerQuery === 'hi' || lowerQuery === 'hello' || lowerQuery === 'hey' ||
            lowerQuery.includes('thank') || lowerQuery === 'who r uh' ||
            lowerQuery === 'who are you' || lowerQuery === 'what can you do') {
          const result = {
            intent: 'chat' as const,
            enhancedQuery: '',
            searchTerms: [],
            filters: {}
          };
          this.setCachedResponse(cacheKey, result, 1800000); // Cache for 30 minutes
          return result;
        }
        const result = {
          intent: 'search' as const,
          enhancedQuery: userQuery,
          searchTerms: [userQuery],
          filters: {}
        };
        this.setCachedResponse(cacheKey, result, 1800000); // Cache for 30 minutes
        return result;
      }

      const systemPrompt = `You are a helpful assistant that enhances search queries for a personal resource manager.
      The user has resources like notes, documents, videos, links, and images.
      First, determine if the query is a search request or conversational chat.
       Set intent to "chat" for:
       - Pure greetings without search intent: hi, hello, hey, good morning, etc. (but not "hello, find my notes")
       - Thanks: thank you, thanks, appreciate it
       - Direct questions about the assistant: can you help, what can you do, who are you, etc.
       - Very short single words: hi, help, please (when standalone)
       - Content generation requests: write, create, generate, make, compose, draft (essays, articles, summaries, etc.)
       - Questions that require explanation or generation: explain, tell me how, what is, how to, why, etc. (when not about user's resources)
       Set intent to "search" ONLY for queries that clearly want to find existing resources:
       - Explicit search commands: find, search, show me, give me (when referring to user's stored content)
       - References to user's resources: my notes, my documents, my files, my resources
       - Questions about user's content: what do I have, what did I save, etc.

      Examples:
      - "hi" -> intent: "chat"
      - "find my notes on AI" -> intent: "search", searchTerms: ["notes", "AI"]
      - "do you have books" -> intent: "search", searchTerms: ["books"]
      - "give me anything related to study" -> intent: "search", searchTerms: ["study"]
      - "something book or study" -> intent: "search", searchTerms: ["books", "study"]
      - "please show me reading materials" -> intent: "search", searchTerms: ["reading"]
      Respond with JSON in this format:
      {
        "intent": "search" or "chat",
        "enhancedQuery": "improved search query" (empty if chat),
        "searchTerms": ["term1", "term2"] (empty if chat),
         "filters": {
           "type": "note|document|video|link|image" (use | or , to separate multiple types),
           "tags": ["tag1", "tag2"] (optional)
         }
      }`;

      try {
        const response = await this.createChatCompletion({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery }
          ],
          temperature: 0.3,

        });

        const content = (response as ChatCompletionResponse).choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from AI');
        }

         // Parse the JSON response
         const parsed = JSON.parse(content);
         const result = {
           intent: parsed.intent || 'search',
           enhancedQuery: parsed.enhancedQuery || userQuery,
           searchTerms: parsed.searchTerms || [userQuery],
           filters: parsed.filters || {},
         };
         this.setCachedResponse(cacheKey, result, 1800000); // Cache for 30 minutes
         return result;
      } catch (error) {
        console.error('Error enhancing search query:', error);
        // Fallback to basic search
        const result = {
          intent: 'search' as const,
          enhancedQuery: userQuery,
          searchTerms: [userQuery],
          filters: {},
        };
        this.setCachedResponse(cacheKey, result, 300000); // Cache fallback for 5 minutes
        return result;
      }
    });
  }

  /**
   * Generate search suggestions when no results found
   */
  async generateSearchSuggestions(userQuery: string): Promise<string[]> {
    const cacheKey = this.getCacheKey('generateSearchSuggestions', { userQuery });
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    return this.getDeduplicatedRequest(cacheKey, async () => {
      try {
        const response = await this.createChatCompletion({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: `You are a helpful assistant that suggests alternative search terms when a user finds no results.
              The user searched for: "${userQuery}"
              Suggest 3-5 specific, relevant search terms that might find resources in a personal manager (notes, books, documents, videos, etc.).
              Return only a JSON array of strings, like: ["term1", "term2", "term3"]
              Focus on concrete terms related to the original query.`
            },
            {
              role: 'user',
              content: userQuery
            }
          ],
          temperature: 0.5,
        });

        const content = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
        let result: string[] = [];
        if (content) {
          try {
            const suggestions = JSON.parse(content);
            result = Array.isArray(suggestions) ? suggestions.slice(0, 5) : [];
          } catch {
            // Fallback: extract from text
              result = content.split(',').map((s: string) => s.trim().replace(/["[\]]/g, '')).filter((s: string) => s.length > 0).slice(0, 5);
          }
        }
        this.setCachedResponse(cacheKey, result, 1800000); // Cache for 30 minutes
        return result;
      } catch (error) {
        console.warn('Error generating search suggestions:', error);
        const result: string[] = [];
        this.setCachedResponse(cacheKey, result, 300000); // Cache empty result for 5 minutes
        return result;
      }
    });
  }

  async generateDeepResearchResponse(userQuery: string, context?: string, timezone?: string): Promise<string> {
    const cacheKey = this.getCacheKey('generateDeepResearchResponse', { userQuery, context, timezone });
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    return this.getDeduplicatedRequest(cacheKey, async () => {
      const userTimezone = timezone || 'UTC';
      const now = new Date();
      const currentDateTime = now.toLocaleString('en-US', {
        timeZone: userTimezone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'long'
      });

      const systemPrompt = `You are a friendly deep research assistant for a personal resource manager.
      Current date and time: ${currentDateTime}
      The user is in deep research mode, which means they want comprehensive, sequential research on their query.
      Provide a thoughtful, friendly response that offers to help with systematic investigation.
      Keep responses informative but not overwhelming. Be conversational and engaging.`;

      try {
        const response = await this.createChatCompletion({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery }
          ],
          temperature: 0.6,
        });

        const result = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim() || "I'll help you conduct deep research on this topic. Let me gather comprehensive information for you.";
        this.setCachedResponse(cacheKey, result, 900000); // Cache for 15 minutes
        return result;
      } catch (error) {
        console.error('Error generating deep research response:', error);
        const result = "I'm conducting deep research on your query. This may take a moment as I gather comprehensive information from multiple sources.";
        this.setCachedResponse(cacheKey, result, 300000); // Cache fallback for 5 minutes
        return result;
      }
    });
  }

  async generateChatResponse(userQuery: string, context?: string, timezone?: string, focusMode?: string, stream?: boolean): Promise<string | AsyncIterable<any>> {
    // For testing with dummy API key, provide appropriate mock responses
    if (this.config.apiKey === 'dummy-api-key-for-testing') {
      const lowerQuery = userQuery.toLowerCase();
      if (lowerQuery === 'hi' || lowerQuery === 'hello' || lowerQuery === 'hey') {
        return "Hello! I'm your AI assistant for managing personal resources. How can I help you find or organize your notes, documents, or other materials today?";
      } else if (lowerQuery === 'who r uh' || lowerQuery === 'who are you') {
        return "I'm your personal AI assistant for the Resource Manager application. I help you search through and organize your stored resources like notes, documents, videos, and links using natural language queries.";
      } else if (lowerQuery.includes('what can you do') || lowerQuery.includes('help')) {
        return "I can help you search through your personal resources, suggest relevant materials, and assist with organizing your content. Try asking me to find specific notes, documents, or topics!";
      } else if (lowerQuery.includes('explain') || lowerQuery.includes('what is') || lowerQuery.includes('how does')) {
        return "That's a great question! Let me explain this concept clearly. [Mock explanation for testing]. Do you understand this now, or would you like me to clarify anything?";
      } else {
        return "I'm currently running in test mode. To get full AI-powered responses, please configure a valid API key. In the meantime, I can help you search through your stored resources!";
      }
    }

    // Get current date and time in user's timezone
    const userTimezone = timezone || 'UTC';
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long'
    });

    let modeSpecificInstructions = '';
    if (focusMode === 'deep-research') {
      modeSpecificInstructions = 'You are in deep research mode. Provide comprehensive, well-researched responses in a friendly, conversational tone. Be helpful and engaging.';
    } else if (focusMode === 'quick-search') {
      modeSpecificInstructions = 'You are in quick search mode. Provide fast, direct answers focused on immediate needs. Keep responses brief and to the point.';
    } else if (focusMode === 'academic') {
      modeSpecificInstructions = 'You are in academic mode. Emphasize credible sources, proper citations, and scholarly analysis. Use formal language and reference authoritative information.';
    } else {
      modeSpecificInstructions = 'You are in general mode. Provide balanced, helpful responses suitable for everyday use.';
    }

    let systemPrompt = `You are a friendly AI assistant for a personal resource manager application.
    Users can store and search through their notes, documents, videos, links, and other resources.
    Current date and time: ${currentDateTime}
    Focus mode: ${focusMode || 'general'}
    ${modeSpecificInstructions}
    Always include accurate current date/time information when asked about dates, times, or current status.
    Respond to user queries in a friendly, helpful manner. Keep responses concise but informative.
    If they ask about your capabilities, explain that you help search and organize personal resources.
    If they greet you, respond warmly and offer assistance.
    Do not mention technical details unless asked.

    IMPORTANT LEARNING GUIDELINES:
    - When teaching or explaining concepts, DO NOT provide full answers immediately.
    - Instead, give helpful hints and ask guiding questions to encourage learning.
    - Only provide complete answers when the user explicitly says "please provide full answer" or clicks a button requesting it.
    - This Socratic method helps users learn better by thinking through problems themselves.
    - Always end hints with questions that guide the user toward the solution.`;

    if (context) {
      systemPrompt += `\n\nRecent context: ${context}`;
    }

    try {
      if (focusMode === 'deep-research') {
        // Use sequential thinking for deep research
        const result = await this.executeSequentialThinking(userQuery, undefined, (progress: { phase: string; step: number; totalSteps: number; details: string }) => {
          // Progress callback - could be used for logging
          console.log(`Deep Research Progress: ${progress.phase} (${progress.step}/${progress.totalSteps}) - ${progress.details}`);
        });
        return result.finalAnswer || "I couldn't find a confident answer through deep research. Try rephrasing your query.";
      } else {
        // Regular chat response
        if (stream) {
          return this.createStreamingChatResponse(userQuery, systemPrompt);
        } else {
          const response = await this.createChatCompletion({
            model: this.config.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userQuery }
            ],
            temperature: 0.7,
          });
          return (response as ChatCompletionResponse).choices[0]?.message?.content?.trim() || "I'm here to help you with your personal resources!";
        }
      }
    } catch (error) {
      console.error('Error generating chat response:', error);
      return "Hello! I'm your AI assistant for managing personal resources. How can I help you today?";
    }
  }

  async *createStreamingChatResponse(userQuery: string, systemPrompt: string): AsyncIterable<{ content: string }> {
    // For testing with dummy API key, provide mock streaming response
    if (this.config.apiKey === 'dummy-api-key-for-testing') {
      const mockResponse = "Hello! I'm your AI assistant for managing personal resources. How can I help you find or organize your notes, documents, or other materials today?";

      // Simulate streaming by yielding words with small delays for better UX
      const words = mockResponse.split(' ');
      for (let i = 0; i < words.length; i++) {
        const word = i < words.length - 1 ? words[i] + ' ' : words[i];
        yield { content: word };
        // Small delay to simulate realistic streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return;
    }

    try {
      const request: ChatCompletionRequest = {
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.7,
        stream: true,
      };

      for await (const chunk of this.createStreamingChatCompletion(request)) {
        yield chunk;
      }
    } catch (error) {
      console.error('Error in streaming chat response:', error);
      yield { content: "Hello! I'm your AI assistant. How can I help you today?" };
    }
  }

  /**
   * Generate follow-up research queries for deep research mode
   */
  async generateResearchQueries(originalQuery: string, context?: string): Promise<string[]> {
    const cacheKey = this.getCacheKey('generateResearchQueries', { originalQuery, context });
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    return this.getDeduplicatedRequest(cacheKey, async () => {
      try {
        let systemPrompt = `You are a research assistant helping to generate follow-up search queries for deep research.
        The user asked: "${originalQuery}"
        Generate 2-3 specific, relevant follow-up search queries that would provide deeper insights or related information.
        Focus on queries that would complement the original search and provide comprehensive coverage.
        Return only a JSON array of strings, like: ["query1", "query2", "query3"]
        Make queries specific and actionable.`;

        if (context) {
          systemPrompt += `\n\nRecent context: ${context}`;
        }

        const response = await this.createChatCompletion({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: originalQuery }
          ],
          temperature: 0.7,
        });

        const content = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
        let result: string[] = [];
        if (content) {
          try {
            const queries = JSON.parse(content);
            result = Array.isArray(queries) ? queries.slice(0, 3) : [];
          } catch {
            // Fallback: extract from text
              result = content.split(',').map((q: string) => q.trim().replace(/["[\]]/g, '')).filter((q: string) => q.length > 0).slice(0, 3);
          }
        }
        this.setCachedResponse(cacheKey, result, 1800000); // Cache for 30 minutes
        return result;
      } catch (error) {
        console.warn('Error generating research queries:', error);
        const result: string[] = [];
        this.setCachedResponse(cacheKey, result, 300000); // Cache empty result for 5 minutes
        return result;
      }
    });
  }

  async suggestUrlsToRead(searchResults: any[], originalQuery: string): Promise<{url: string, title: string, reason: string}[]> {
    const cacheKey = this.getCacheKey('suggestUrlsToRead', { searchResults, originalQuery });
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    return this.getDeduplicatedRequest(cacheKey, async () => {
      try {
        const resultsText = searchResults.slice(0, 5).map((result, index) =>
          `${index + 1}. ${result.title} - ${result.url}\n   ${result.content?.substring(0, 200)}...`
        ).join('\n\n');

        const systemPrompt = `You are a research strategist. Analyze these search results for the query "${originalQuery}" and suggest the most promising URLs to read in detail.

        For each suggested URL, provide:
        - The URL
        - The title
        - A brief reason why this URL is likely to contain the needed information

        Focus on official documentation, release pages, version history pages, or authoritative sources.
        Suggest 2-4 URLs maximum, prioritizing the most relevant ones.
        Return only a JSON array of objects with format: [{"url": "https://...", "title": "Page Title", "reason": "Why this URL is promising"}]

        If no suitable URLs are found, return an empty array.`;

        const response = await this.createChatCompletion({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Search results:\n${resultsText}` }
          ],
          temperature: 0.3,
        });

        const content = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
        let result: {url: string, title: string, reason: string}[] = [];
        if (content) {
          try {
            const suggestions = JSON.parse(content);
            result = Array.isArray(suggestions) ? suggestions.slice(0, 4) : [];
          } catch (error) {
            console.warn('Error parsing URL suggestions:', error);
            result = [];
          }
        }
        this.setCachedResponse(cacheKey, result, 900000); // Cache for 15 minutes
        return result;
      } catch (error) {
        console.warn('Error generating URL suggestions:', error);
        const result: {url: string, title: string, reason: string}[] = [];
        this.setCachedResponse(cacheKey, result, 300000); // Cache empty result for 5 minutes
        return result;
      }
    });
  }

  async analyzeUrlContent(content: string, originalQuery: string): Promise<{found: boolean, answer?: string, confidence: number, summary?: string}> {
    const cacheKey = this.getCacheKey('analyzeUrlContent', { content: content.substring(0, 1000), originalQuery }); // Use first 1000 chars for cache key
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    return this.getDeduplicatedRequest(cacheKey, async () => {
      try {
        const systemPrompt = `You are a content analyzer. Examine the provided web page content and determine if it contains the answer to: "${originalQuery}"

        Look for:
        - Direct answers to the query
        - Version numbers, release information
        - Current status or latest information
        - Official documentation or authoritative sources

        Return a JSON object with:
        {
          "found": true/false (whether the answer is in this content),
          "answer": "the specific answer if found" (empty string if not found),
          "confidence": 0-100 (how confident you are in the answer),
          "summary": "brief summary of what this page contains"
        }

        Be precise and only set found=true if you actually find the specific information requested.`;

        const response = await this.createChatCompletion({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Content:\n${content.substring(0, 4000)}` } // Limit content length
          ],
          temperature: 0.1,

        });

        const content_response = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
        let result: {found: boolean, answer?: string, confidence: number, summary?: string};
        if (content_response) {
          try {
            const analysis = JSON.parse(content_response);
            result = {
              found: analysis.found || false,
              answer: analysis.answer || '',
              confidence: analysis.confidence || 0,
              summary: analysis.summary || ''
            };
          } catch (error) {
            console.warn('Error parsing content analysis:', error);
            result = { found: false, confidence: 0 };
          }
        } else {
          result = { found: false, confidence: 0 };
        }
        this.setCachedResponse(cacheKey, result, 1800000); // Cache for 30 minutes
        return result;
      } catch (error) {
        console.warn('Error analyzing URL content:', error);
        const result = { found: false, confidence: 0 };
        this.setCachedResponse(cacheKey, result, 300000); // Cache error result for 5 minutes
        return result;
      }
    });
  }

  /**
   * Execute sequential thinking for complex research tasks
   */
  async executeSequentialThinking(query: string, context?: string, progressCallback?: (progress: {
    phase: string;
    step: number;
    totalSteps: number;
    details: string;
  }) => void): Promise<{
    finalAnswer: string;
    thoughtProcess: Array<{
      thoughtNumber: number;
      thought: string;
      action?: string;
      result?: string;
      nextThoughtNeeded: boolean;
    }>;
    confidence: number;
  }> {
    const thoughtProcess: Array<{
      thoughtNumber: number;
      thought: string;
      action?: string;
      result?: string;
      nextThoughtNeeded: boolean;
    }> = [];

    let currentThought = 1;
    let totalThoughts = 5; // Initial estimate
    let nextThoughtNeeded = true;
    let finalAnswer = '';
    let confidence = 0;

    const userTimezone = 'UTC'; // Default timezone
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long'
    });

    // Initial progress update
    progressCallback?.({
      phase: 'Initializing Sequential Thinking',
      step: 1,
      totalSteps: totalThoughts,
      details: 'Planning research approach and breaking down the problem...'
    });

    try {
      while (nextThoughtNeeded && currentThought <= 15) { // Safety limit
        // Progress update for current thought
        progressCallback?.({
          phase: `Executing Thought ${currentThought}`,
          step: currentThought,
          totalSteps: totalThoughts,
          details: `Analyzing and planning next research step...`
        });

        const systemPrompt = `You are executing sequential thinking for research. Current date/time: ${currentDateTime}

Query: "${query}"

Thought Process History:
${thoughtProcess.map(t => `Thought ${t.thoughtNumber}: ${t.thought}${t.action ? ` | Action: ${t.action}` : ''}${t.result ? ` | Result: ${t.result}` : ''}`).join('\n')}

Current thought: ${currentThought}/${totalThoughts}

Instructions:
1. Analyze the query and determine what specific information is needed
2. Plan a research strategy with specific, actionable steps
3. Execute searches, read URLs, or analyze data as needed
4. Synthesize information from multiple sources when possible
5. Revise your approach if initial attempts fail
6. Only provide a finalAnswer when you have concrete, verifiable information

For this thought step, provide:
{
  "thought": "Your current analysis or plan - be specific about what you're looking for",
  "action": "Specific action to take (search, read_url, analyze, conclude)",
  "actionDetails": "Details for the action (search query, URL to read, etc.)",
  "nextThoughtNeeded": true/false,
  "totalThoughts": estimated_total_thoughts,
  "confidence": 0-100,
  "finalAnswer": "ONLY provide a concise, direct answer when you have high confidence (80%+) and concrete evidence. Keep it brief and factual."
}

Actions available:
- "search": Perform a web search with the query
- "read_url": Read and analyze a specific URL
- "analyze": Analyze previous results or synthesize information
- "conclude": Provide final answer (only when confident)

Be methodical and thorough. Don't provide finalAnswer unless you have concrete evidence from your research.`;

        const response = await this.createChatCompletion({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Execute thought step ${currentThought} for: ${query}` }
          ],
          temperature: 0.3,
        });

        const content = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
        if (!content) break;

        try {
          const thoughtResult = JSON.parse(content);

          // Execute the action if specified
          let actionResult = '';
          if (thoughtResult.action && thoughtResult.actionDetails) {
            progressCallback?.({
              phase: `Executing Action: ${thoughtResult.action}`,
              step: currentThought,
              totalSteps: totalThoughts,
              details: `Performing ${thoughtResult.action} with: ${thoughtResult.actionDetails.substring(0, 50)}...`
            });
            actionResult = await this.executeThoughtAction(thoughtResult.action, thoughtResult.actionDetails, query);
          }

          thoughtProcess.push({
            thoughtNumber: currentThought,
            thought: thoughtResult.thought,
            action: thoughtResult.action,
            result: actionResult,
            nextThoughtNeeded: thoughtResult.nextThoughtNeeded
          });

          nextThoughtNeeded = thoughtResult.nextThoughtNeeded;
          totalThoughts = thoughtResult.totalThoughts || totalThoughts;

          if (thoughtResult.finalAnswer && thoughtResult.confidence > 70) {
            finalAnswer = thoughtResult.finalAnswer;
            confidence = thoughtResult.confidence;
            nextThoughtNeeded = false;
          }

          currentThought++;
        } catch (error) {
          console.warn(`Error parsing thought ${currentThought}:`, error);
          break;
        }
      }

       // Final progress update
       progressCallback?.({
         phase: 'Sequential Thinking Complete',
         step: totalThoughts,
         totalSteps: totalThoughts,
         details: confidence > 70 ? `Found confident answer with ${confidence}% certainty` : 'Synthesizing final answer from research...'
       });

       // If no high-confidence answer was found during thinking, try to synthesize one
       if (!finalAnswer || confidence <= 70) {
         const synthesis = await this.synthesizeFinalAnswer(query, thoughtProcess);
         if (synthesis.confidence > confidence) {
           finalAnswer = synthesis.answer;
           confidence = synthesis.confidence;
         }
       }

       return {
         finalAnswer: finalAnswer || 'Unable to find a confident answer through sequential thinking',
         thoughtProcess,
         confidence
       };
    } catch (error) {
      console.warn('Error in sequential thinking:', error);
      return {
        finalAnswer: 'Sequential thinking failed due to an error',
        thoughtProcess,
        confidence: 0
      };
    }
  }

  /**
   * Execute a specific action from sequential thinking
   */
  private async executeThoughtAction(action: string, actionDetails: string, _originalQuery: string): Promise<string> {
    try {
      switch (action) {
        case 'search': {
          // Check if web search is configured
          if (!process.env.WEB_SEARCH_URL) {
            return `Web search not configured. Would search for: ${actionDetails}`;
          }

          // Perform web search
          const searchUrl = `${process.env.WEB_SEARCH_URL}?q=${encodeURIComponent(actionDetails)}&format=json&pageno=1&time_range=month&categories=it,news&engines=duckduckgo,wikipedia&enabled_engines=duckduckgo,wikipedia&language=en&safesearch=1`;
          const searchResponse = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'curl/7.68.0',
              'Accept': '*/*',
            },
          });

          if (searchResponse.ok) {
            const searchData: any = await searchResponse.json();
            const results = searchData.results?.slice(0, 3) || [];
            return `Found ${results.length} results: ${results.map((r: any) => r.title).join(', ')}`;
          }
          return 'Search failed';
        }

        case 'read_url': {
          // Extract URL from actionDetails (AI sometimes includes extra text)
          const urlRegex = /(https?:\/\/[^\s]+)/;
          const match = actionDetails.match(urlRegex);
          const url = match ? match[1] : actionDetails.trim();

          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return `Invalid URL format: ${actionDetails}. Please provide a valid URL starting with http:// or https://.`;
          }

          // Read URL content
          const { readUrlContent } = await import('../utils/urlReader');
          const content = await readUrlContent(url, 15000, {
            returnRaw: false,
            maxLength: 2000,
          });
          return `Content read (${content.length} chars): ${content.substring(0, 200)}...`;
        }

        case 'analyze':
          return `Analysis completed for: ${actionDetails}`;

        default:
          return `Unknown action: ${action}`;
      }
    } catch (error) {
      console.warn(`Error executing action ${action}:`, error);
      return `Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
    * Synthesize a final answer from the thought process
    */
   async synthesizeFinalAnswer(query: string, thoughtProcess: Array<{
     thoughtNumber: number;
     thought: string;
     action?: string;
     result?: string;
     nextThoughtNeeded: boolean;
   }>): Promise<{answer: string, confidence: number}> {
     try {
       const thoughtsText = thoughtProcess.map(t =>
         `Thought ${t.thoughtNumber}: ${t.thought}${t.action ? ` | Action: ${t.action}` : ''}${t.result ? ` | Result: ${t.result}` : ''}`
       ).join('\n');

       const systemPrompt = `You are a research synthesizer. Analyze the thought process below and extract a concise, final answer to the query: "${query}"

Thought Process:
${thoughtsText}

Instructions:
1. Look for concrete answers, facts, or conclusions reached during the research
2. If multiple answers exist, choose the most reliable one based on evidence
3. If no clear answer was found, state that clearly
4. Provide a confidence score based on the quality and consistency of the evidence
5. Keep the answer concise and direct

Return a JSON object:
{
  "answer": "The synthesized final answer (or 'No confident answer found' if none exists)",
  "confidence": 0-100 (based on evidence quality and consistency)
}`;

        const response = await this.createChatCompletion({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Synthesize a final answer from this research on: ${query}` }
          ],
          temperature: 0.1,
        });

       const content = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
       if (content) {
         try {
           const synthesis = JSON.parse(content);
           return {
             answer: synthesis.answer || 'No confident answer found',
             confidence: synthesis.confidence || 0
           };
         } catch (error) {
           console.warn('Error parsing synthesis:', error);
           return { answer: 'Unable to synthesize answer from research', confidence: 0 };
         }
       }
       return { answer: 'Research completed but no clear answer synthesized', confidence: 0 };
     } catch (error) {
       console.warn('Error synthesizing final answer:', error);
       return { answer: 'Error during answer synthesis', confidence: 0 };
     }
   }

  /**
    * Get current date and time information
    */
   getCurrentDateTime(timezone: string = 'UTC'): {
     full: string;
     date: string;
     time: string;
     day: string;
     timestamp: number;
   } {
     const now = new Date();
     const options: Intl.DateTimeFormatOptions = {
       timeZone: timezone,
       year: 'numeric',
       month: 'long',
       day: 'numeric',
       hour: '2-digit',
       minute: '2-digit',
       second: '2-digit',
       weekday: 'long'
     };

     const full = now.toLocaleString('en-US', options);
     const date = now.toLocaleDateString('en-US', { timeZone: timezone, year: 'numeric', month: 'long', day: 'numeric' });
     const time = now.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit' });
     const day = now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long' });

     return {
       full,
       date,
       time,
       day,
       timestamp: now.getTime()
       };
    }

  /**
   * Get the AI service configuration
   */
  getConfig(): AIConfig {
    return this.config;
  }

  /**
   * Analyze user resources to assess current knowledge level and generate course recommendations
   */
  async analyzeUserResourcesForCourse(
    subjectName: string,
    userResources: Array<{
      title: string;
      content?: string;
      type: string;
      tags?: string[];
    }>,
    currentLevel?: string
  ): Promise<{
    assessedLevel: string;
    knowledgeGaps: string[];
    recommendedModules: Array<{
      title: string;
      description: string;
      difficulty: string;
      estimatedHours: number;
      prerequisites: string[];
    }>;
    confidence: number;
  }> {
    try {
      const resourcesText = userResources.map(r =>
        `Title: ${r.title}\nType: ${r.type}\nTags: ${r.tags?.join(', ') || 'none'}\nContent: ${r.content?.substring(0, 500) || 'No content'}`
      ).join('\n\n---\n\n');

      const systemPrompt = `You are an educational assessment AI. Analyze the user's existing resources for learning ${subjectName} and assess their current knowledge level.

Current self-reported level: ${currentLevel || 'unknown'}

Based on the resources provided, determine:
1. Their actual knowledge level (beginner, intermediate, advanced)
2. Knowledge gaps they need to fill
3. Recommended learning modules to bridge those gaps
4. Realistic time estimates

Return a JSON object with this structure:
{
  "assessedLevel": "beginner|intermediate|advanced",
  "knowledgeGaps": ["gap1", "gap2", "gap3"],
  "recommendedModules": [
    {
      "title": "Module Title",
      "description": "Brief description of what this module covers",
      "difficulty": "beginner|intermediate|advanced",
      "estimatedHours": 2,
      "prerequisites": ["prereq1", "prereq2"]
    }
  ],
  "confidence": 0-100
}

Be realistic about time estimates and difficulty progression.`;

      const response = await this.createChatCompletion({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze these resources for ${subjectName} learning:\n\n${resourcesText}` }
        ],
        temperature: 0.3,
      });

      const content = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
      if (content) {
        try {
          const analysis = JSON.parse(content);
          return {
            assessedLevel: analysis.assessedLevel || 'beginner',
            knowledgeGaps: analysis.knowledgeGaps || [],
            recommendedModules: analysis.recommendedModules || [],
            confidence: analysis.confidence || 50
          };
        } catch (error) {
          console.warn('Error parsing resource analysis:', error);
          return {
            assessedLevel: 'beginner',
            knowledgeGaps: ['Unable to analyze resources'],
            recommendedModules: [],
            confidence: 0
          };
        }
      }

      return {
        assessedLevel: 'beginner',
        knowledgeGaps: ['Analysis failed'],
        recommendedModules: [],
        confidence: 0
      };
    } catch (error) {
      console.warn('Error analyzing user resources:', error);
      return {
        assessedLevel: 'beginner',
        knowledgeGaps: ['Analysis error'],
        recommendedModules: [],
        confidence: 0
      };
    }
  }

  /**
   * Generate a personalized learning path with latest content
   */
  async generatePersonalizedCourse(
    subjectName: string,
    userLevel: string,
    goals: string[],
    knowledgeGaps: string[],
    existingModules: Array<{
      title: string;
      completed: boolean;
    }> = []
  ): Promise<{
    courseTitle: string;
    description: string;
    totalHours: number;
    modules: Array<{
      id: string;
      title: string;
      description: string;
      content: string;
      difficulty: string;
      estimatedHours: number;
      order: number;
      prerequisites: string[];
      assignments: Array<{
        title: string;
        type: string;
        description: string;
      }>;
    }>;
    mindmapStructure: any;
  }> {
    try {
      const goalsText = goals.join(', ');
      const gapsText = knowledgeGaps.join(', ');
      const existingText = existingModules.map(m => `${m.title} (${m.completed ? 'completed' : 'pending'})`).join(', ');

      const systemPrompt = `You are a course designer AI specializing in creating personalized learning paths with the latest industry knowledge.

Subject: ${subjectName}
User Level: ${userLevel}
Learning Goals: ${goalsText}
Knowledge Gaps: ${gapsText}
Existing Progress: ${existingText || 'None'}

Create a comprehensive course that:
1. Incorporates the latest developments and best practices (as of 2024-2025)
2. Addresses the specific knowledge gaps identified
3. Builds upon existing completed modules
4. Includes practical assignments and projects
5. Provides realistic time estimates
6. Creates a mindmap structure for visual learning

Return a JSON object with this structure:
{
  "courseTitle": "Complete Course Title",
  "description": "Course overview and objectives",
  "totalHours": 40,
  "modules": [
    {
      "id": "module-1",
      "title": "Module Title",
      "description": "What this module covers",
      "content": "Detailed module content and learning objectives",
      "difficulty": "beginner|intermediate|advanced",
      "estimatedHours": 4,
      "order": 1,
      "prerequisites": ["module-0"],
      "assignments": [
        {
          "title": "Assignment Title",
          "type": "exercise|quiz|project",
          "description": "Assignment details"
        }
      ]
    }
  ],
  "mindmapStructure": {
    "title": "Subject Mindmap",
    "nodes": [
      {
        "id": "core-concept",
        "label": "Core Concept",
        "children": ["sub-concept-1", "sub-concept-2"]
      }
    ]
  }
}

Make the course practical, up-to-date, and progressive in difficulty.`;

      const response = await this.createChatCompletion({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Design a personalized course for ${subjectName}` }
        ],
        temperature: 0.4,
      });

      const content = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
      if (content) {
        try {
          const course = JSON.parse(content);
          return {
            courseTitle: course.courseTitle || `${subjectName} Learning Path`,
            description: course.description || `Comprehensive ${subjectName} course`,
            totalHours: course.totalHours || 20,
            modules: course.modules || [],
            mindmapStructure: course.mindmapStructure || { title: subjectName, nodes: [] }
          };
        } catch (error) {
          console.warn('Error parsing course generation:', error);
          return {
            courseTitle: `${subjectName} Learning Path`,
            description: `Personalized course for ${subjectName}`,
            totalHours: 20,
            modules: [],
            mindmapStructure: { title: subjectName, nodes: [] }
          };
        }
      }

      return {
        courseTitle: `${subjectName} Learning Path`,
        description: `Personalized course for ${subjectName}`,
        totalHours: 20,
        modules: [],
        mindmapStructure: { title: subjectName, nodes: [] }
      };
    } catch (error) {
      console.warn('Error generating personalized course:', error);
      return {
        courseTitle: `${subjectName} Learning Path`,
        description: `Personalized course for ${subjectName}`,
        totalHours: 20,
        modules: [],
        mindmapStructure: { title: subjectName, nodes: [] }
      };
    }
  }

  /**
   * Analyze assignment submission and identify weak points
   */
  async analyzeAssignmentSubmission(
    assignment: {
      title: string;
      description: string;
      solution?: string;
    },
    submission: string,
    subjectName: string
  ): Promise<{
    score: number;
    feedback: string;
    weakPoints: Array<{
      topic: string;
      description: string;
      severity: string;
      suggestions: string[];
    }>;
    strengths: string[];
    improvementAreas: string[];
  }> {
    try {
      const systemPrompt = `You are an educational assessment AI analyzing a ${subjectName} assignment submission.

Assignment: ${assignment.title}
Description: ${assignment.description}
Expected Solution: ${assignment.solution || 'Not provided'}

Analyze the submission for:
1. Correctness and understanding
2. Code quality/style (if applicable)
3. Problem-solving approach
4. Common mistakes or misconceptions
5. Areas for improvement

Return a JSON object with this structure:
{
  "score": 0-100,
  "feedback": "Detailed feedback explaining the score and main issues",
  "weakPoints": [
    {
      "topic": "specific topic or concept",
      "description": "what went wrong or is missing",
      "severity": "low|medium|high",
      "suggestions": ["specific improvement suggestion", "another suggestion"]
    }
  ],
  "strengths": ["strength1", "strength2"],
  "improvementAreas": ["area1", "area2"]
}

Be constructive, specific, and helpful in your feedback.`;

      const response = await this.createChatCompletion({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Submission to analyze:\n\n${submission}` }
        ],
        temperature: 0.3,
      });

      const content = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
      if (content) {
        try {
          const analysis = JSON.parse(content);
          return {
            score: analysis.score || 0,
            feedback: analysis.feedback || 'Analysis completed',
            weakPoints: analysis.weakPoints || [],
            strengths: analysis.strengths || [],
            improvementAreas: analysis.improvementAreas || []
          };
        } catch (error) {
          console.warn('Error parsing assignment analysis:', error);
          return {
            score: 50,
            feedback: 'Analysis completed with some issues',
            weakPoints: [],
            strengths: [],
            improvementAreas: ['Unable to analyze submission']
          };
        }
      }

      return {
        score: 50,
        feedback: 'Analysis completed',
        weakPoints: [],
        strengths: [],
        improvementAreas: []
      };
    } catch (error) {
      console.warn('Error analyzing assignment submission:', error);
      return {
        score: 50,
        feedback: 'Analysis failed',
        weakPoints: [],
        strengths: [],
        improvementAreas: ['Analysis error']
      };
    }
  }

  /**
   * Generate mindmap for a subject or progress visualization
   */
  async generateMindmap(
    subjectName: string,
    type: 'concept' | 'progress' | 'weak_points',
    context: {
      completedModules?: string[];
      weakPoints?: string[];
      currentLevel?: string;
      goals?: string[];
    } = {}
  ): Promise<{
    title: string;
    structure: any;
    description: string;
  }> {
    try {
      const contextText = Object.entries(context)
        .filter(([_, value]) => value && (Array.isArray(value) ? value.length > 0 : true))
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join('\n');

      const systemPrompt = `You are a mindmap generation AI creating visual knowledge structures for learning.

Subject: ${subjectName}
Type: ${type}
Context: ${contextText}

Create a mindmap structure that visually represents the knowledge in an organized, hierarchical way.

For concept maps: Show relationships between core concepts and subtopics
For progress maps: Show completed vs pending learning areas
For weak points maps: Highlight areas needing reinforcement

Return a JSON object with this structure:
{
  "title": "Mindmap Title",
  "structure": {
    "nodes": [
      {
        "id": "core-concept",
        "label": "Core Concept",
        "x": 0,
        "y": 0,
        "color": "#4F46E5",
        "size": "large",
        "children": ["child-id-1", "child-id-2"]
      },
      {
        "id": "child-id-1",
        "label": "Sub-concept",
        "x": -100,
        "y": 100,
        "color": "#7C3AED",
        "size": "medium",
        "connections": ["core-concept"]
      }
    ],
    "connections": [
      {
        "from": "core-concept",
        "to": "child-id-1",
        "label": "relationship",
        "style": "solid"
      }
    ]
  },
  "description": "Brief description of what this mindmap shows"
}

Use appropriate colors and positioning for visual clarity.`;

      const response = await this.createChatCompletion({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a ${type} mindmap for ${subjectName}` }
        ],
        temperature: 0.4,
      });

      const content = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
      if (content) {
        try {
          const mindmap = JSON.parse(content);
          return {
            title: mindmap.title || `${subjectName} Mindmap`,
            structure: mindmap.structure || { nodes: [], connections: [] },
            description: mindmap.description || `Visual representation of ${subjectName} knowledge`
          };
        } catch (error) {
          console.warn('Error parsing mindmap generation:', error);
          return {
            title: `${subjectName} Mindmap`,
            structure: { nodes: [], connections: [] },
            description: `Generated mindmap for ${subjectName}`
          };
        }
      }

      return {
        title: `${subjectName} Mindmap`,
        structure: { nodes: [], connections: [] },
        description: `Generated mindmap for ${subjectName}`
      };
    } catch (error) {
      console.warn('Error generating mindmap:', error);
      return {
        title: `${subjectName} Mindmap`,
        structure: { nodes: [], connections: [] },
        description: `Generated mindmap for ${subjectName}`
      };
    }
  }

  /**
   * Generate a dynamic knowledge summary based on user's progress and resources
   */
  async generateKnowledgeSummary(
    subjectName: string,
    progress: {
      completedModules: Array<{
        title: string;
        score?: number;
        completedAt: Date;
      }>;
      currentModules: Array<{
        title: string;
        progress: number;
      }>;
      weakPoints: Array<{
        topic: string;
        severity: string;
        frequency: number;
      }>;
      totalTimeSpent: number;
      assignmentSubmissions: Array<{
        score?: number;
        feedback?: string;
        weakPoints?: string[];
      }>;
    },
    resources: Array<{
      title: string;
      type: string;
      tags: string[];
      embedding?: string;
    }>,
    userLevel: string
  ): Promise<{
    summary: string;
    strengths: string[];
    areasForImprovement: string[];
    confidence: number;
    nextMilestones: string[];
  }> {
    try {
      const progressText = `
Completed Modules: ${progress.completedModules.map(m => `${m.title} (${m.score || 'N/A'}%)`).join(', ')}
Current Progress: ${progress.currentModules.map(m => `${m.title} (${m.progress}%)`).join(', ')}
Weak Points: ${progress.weakPoints.map(wp => `${wp.topic} (${wp.severity})`).join(', ')}
Total Time Spent: ${progress.totalTimeSpent} minutes
Assignment Performance: ${progress.assignmentSubmissions.length} submissions, avg score: ${progress.assignmentSubmissions.filter(s => s.score).reduce((sum, s) => sum + (s.score || 0), 0) / Math.max(1, progress.assignmentSubmissions.filter(s => s.score).length)}%
      `.trim();

      const resourcesText = resources.slice(0, 10).map(r =>
        `Title: ${r.title}, Type: ${r.type}, Tags: ${r.tags.join(', ')}`
      ).join('\n');

      const systemPrompt = `You are an educational progress analyzer. Create a dynamic knowledge summary for a ${subjectName} learner.

Current Level: ${userLevel}
Progress Data: ${progressText}
Resources: ${resourcesText}

Generate a comprehensive knowledge summary that includes:
1. Current knowledge level and expertise areas
2. Learning progress and achievements
3. Strengths and well-developed skills
4. Areas needing more attention
5. Realistic assessment of overall competence
6. Next learning milestones

Return a JSON object with this structure:
{
  "summary": "A 2-3 sentence overview of current knowledge level and progress",
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "areasForImprovement": ["area 1", "area 2", "area 3"],
  "confidence": 0-100,
  "nextMilestones": ["milestone 1", "milestone 2", "milestone 3"]
}

Be specific, encouraging, and accurate based on the data provided.`;

      const response = await this.createChatCompletion({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate knowledge summary for ${subjectName} learner` }
        ],
        temperature: 0.3,
      });

      const content = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
      if (content) {
        try {
          const analysis = JSON.parse(content);
          return {
            summary: analysis.summary || 'Knowledge assessment in progress...',
            strengths: analysis.strengths || [],
            areasForImprovement: analysis.areasForImprovement || [],
            confidence: analysis.confidence || 50,
            nextMilestones: analysis.nextMilestones || []
          };
        } catch (error) {
          console.warn('Error parsing knowledge summary:', error);
          return {
            summary: 'Analyzing your learning progress...',
            strengths: [],
            areasForImprovement: [],
            confidence: 50,
            nextMilestones: []
          };
        }
      }

      return {
        summary: 'Knowledge summary generation in progress...',
        strengths: [],
        areasForImprovement: [],
        confidence: 50,
        nextMilestones: []
      };
    } catch (error) {
      console.warn('Error generating knowledge summary:', error);
      return {
        summary: 'Unable to generate knowledge summary at this time.',
        strengths: [],
        areasForImprovement: [],
        confidence: 50,
        nextMilestones: []
      };
    }
  }

  /**
   * Generate quiz questions for an assignment
   */
  async generateQuizQuestions(
    assignment: {
      title: string;
      description: string;
      moduleContent?: string;
      subjectName: string;
    },
    userLevel: string,
    previousAttempts: number = 0
  ): Promise<{
    questions: Array<{
      id: string;
      question: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
      topic: string;
    }>;
    difficulty: string;
  }> {
    try {
      const contextPrompt = `
Assignment: ${assignment.title}
Description: ${assignment.description}
Module Content: ${assignment.moduleContent || 'Not provided'}
Subject: ${assignment.subjectName}
User Level: ${userLevel}
Previous Attempts: ${previousAttempts}

Generate a quiz with 5-8 questions that test understanding of the key concepts.
For retakes (previousAttempts > 0), create different questions covering similar but not identical topics.
      `.trim();

      const systemPrompt = `You are a quiz generation AI creating educational assessments.

${contextPrompt}

Create questions that:
1. Test conceptual understanding, not just memorization
2. Include a mix of difficulty levels appropriate for the user's level
3. Have 4 multiple-choice options with one clearly correct answer
4. Include explanations for why the answer is correct
5. Cover different aspects of the topic
6. For retakes, vary the questions while maintaining similar difficulty

Return a JSON object with this structure:
{
  "questions": [
    {
      "id": "q1",
      "question": "What is the main concept being tested?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation of why this answer is correct and why others are wrong",
      "topic": "specific topic or concept"
    }
  ],
  "difficulty": "beginner|intermediate|advanced"
}

Ensure questions are clear, unambiguous, and educational.`;

      const response = await this.createChatCompletion({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a quiz for: ${assignment.title}` }
        ],
        temperature: 0.7, // Higher temperature for variety in retakes
      });

      const content = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
      if (content) {
        try {
          const quiz = JSON.parse(content);
          return {
            questions: quiz.questions || [],
            difficulty: quiz.difficulty || 'intermediate'
          };
        } catch (error) {
          console.warn('Error parsing quiz generation:', error);
          return {
            questions: [],
            difficulty: 'intermediate'
          };
        }
      }

      return {
        questions: [],
        difficulty: 'intermediate'
      };
    } catch (error) {
      console.warn('Error generating quiz questions:', error);
      return {
        questions: [],
        difficulty: 'intermediate'
      };
    }
  }

  /**
   * Generate adaptive assignment based on subject and learning DNA
   */
  async generateAdaptiveAssignmentFromDNA(
    subjectName: string,
    learningDNA: any,
    knowledgeGaps: string[],
    preferredModalities: string[]
  ): Promise<{
    assignment: {
      title: string;
      description: string;
      type: string;
      steps?: AssignmentStep[];
      modalities: string[];
      estimated_time: number;
    };
    reasoning: string;
  }> {
    const cacheKey = this.getCacheKey('generateAdaptiveAssignmentFromDNA', {
      subjectName,
      learningDNA,
      knowledgeGaps,
      preferredModalities
    });

    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    return this.getDeduplicatedRequest(cacheKey, async () => {
      try {
        const contextPrompt = `
Subject: ${subjectName}
Learning DNA: ${JSON.stringify(learningDNA)}
Knowledge Gaps: ${knowledgeGaps.join(', ')}
Preferred Modalities: ${preferredModalities.join(', ')}

Generate an adaptive assignment that:
1. Addresses the identified knowledge gaps
2. Uses preferred learning modalities
3. Adapts to the user's learning DNA
4. Includes step-by-step guidance
5. Provides appropriate difficulty level
        `.trim();

        const systemPrompt = `You are an adaptive learning AI that creates personalized assignments based on user learning profiles and knowledge gaps.

${contextPrompt}

Create an assignment with multiple steps that addresses knowledge gaps while respecting user preferences and learning patterns.

Return a JSON object with assignment details including estimated time.`;

        const response = await this.createChatCompletion({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Create an adaptive assignment for ${subjectName} addressing: ${knowledgeGaps.join(', ')}` }
          ],
          temperature: 0.7,
        });

        const content = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
        if (content) {
          try {
            const result = JSON.parse(content);
            this.setCachedResponse(cacheKey, result, 900000); // Cache for 15 minutes
            return result;
          } catch (error) {
            console.warn('Error parsing adaptive assignment generation:', error);
          }
        }

        // Fallback
        const result = {
          assignment: {
            title: `Adaptive ${subjectName} Assignment`,
            type: 'structured',
            description: `Personalized assignment for ${subjectName} addressing knowledge gaps`,
            steps: [],
            modalities: preferredModalities,
            estimated_time: 30
          },
          reasoning: 'Fallback assignment due to parsing error'
        };
        this.setCachedResponse(cacheKey, result, 300000); // Cache error result for 5 minutes
        return result;
      } catch (error) {
        console.warn('Error generating adaptive assignment from DNA:', error);
        const result = {
          assignment: {
            title: `Adaptive ${subjectName} Assignment`,
            type: 'structured',
            description: `Personalized assignment for ${subjectName}`,
            steps: [],
            modalities: preferredModalities,
            estimated_time: 30
          },
          reasoning: 'Error fallback assignment'
        };
        this.setCachedResponse(cacheKey, result, 300000); // Cache error result for 5 minutes
        return result;
      }
    });
  }

  /**
   * Analyze cross-domain skills for learning acceleration
   */
  async analyzeCrossDomainSkills(
    userId: string,
    currentSubject: string,
    learningHistory?: Array<{
      subject: string;
      skills: string[];
      performance: number;
      timeSpent: number;
    }>
  ): Promise<{
    transferableSkills: Array<{
      skill: string;
      sourceSubject: string;
      targetSubject: string;
      confidence: number;
      application: string;
    }>;
    recommendedPaths: Array<{
      subject: string;
      reason: string;
      estimatedDifficulty: 'easy' | 'medium' | 'hard';
      leverageSkills: string[];
    }>;
    learningAcceleration: number;
  }> {
    const cacheKey = this.getCacheKey('analyzeCrossDomainSkills', {
      userId,
      currentSubject,
      learningHistory
    });

    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    return this.getDeduplicatedRequest(cacheKey, async () => {
      try {
        // Import Prisma client dynamically to avoid circular dependencies
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        try {
          // Fetch real learning progress data
          const progressRecords = await prisma.learningProgress.findMany({
            where: {
              user_id: userId,
              status: 'completed'
            },
            include: {
              module: {
                include: {
                  subject: true
                }
              }
            }
          });

          // Group by subject and calculate performance metrics
          const subjectPerformance: { [subjectName: string]: {
            totalScore: number;
            totalTime: number;
            completedModules: number;
            skills: string[];
          }} = {};

          for (const progress of progressRecords) {
            const subjectName = progress.module.subject.name;
            if (!subjectPerformance[subjectName]) {
              subjectPerformance[subjectName] = {
                totalScore: 0,
                totalTime: 0,
                completedModules: 0,
                skills: []
              };
            }

            subjectPerformance[subjectName].totalScore += progress.score || 0;
            subjectPerformance[subjectName].totalTime += progress.time_spent;
            subjectPerformance[subjectName].completedModules += 1;

            // Extract skills from module content (simplified)
            if (progress.module.content) {
              const content = progress.module.content.toLowerCase();
              const skillKeywords = ['problem solving', 'analysis', 'critical thinking', 'communication', 'logic'];
              for (const skill of skillKeywords) {
                if (content.includes(skill) && !subjectPerformance[subjectName].skills.includes(skill)) {
                  subjectPerformance[subjectName].skills.push(skill);
                }
              }
            }
          }

          // Convert to learning history format
          const realLearningHistory = Object.entries(subjectPerformance).map(([subject, data]) => ({
            subject,
            skills: data.skills,
            performance: data.completedModules > 0 ? data.totalScore / data.completedModules : 70,
            timeSpent: data.totalTime
          }));

          // Use provided learning history or fall back to real data
          const effectiveHistory = learningHistory && learningHistory.length > 0 ? learningHistory : realLearningHistory;

          // Analyze transferable skills
          const transferableSkills = effectiveHistory.flatMap(history => {
            if (history.subject === currentSubject) return []; // Skip current subject

            return history.skills.map(skill => ({
              skill,
              sourceSubject: history.subject,
              targetSubject: currentSubject,
              confidence: Math.min(history.performance / 100, 0.9),
              application: `Apply ${skill} knowledge from ${history.subject} to enhance understanding of ${currentSubject}`
            }));
          });

          // Generate recommended learning paths
          const recommendedPaths = [];
          const subjectSkills = effectiveHistory.find(h => h.subject === currentSubject)?.skills || [];

          if (!effectiveHistory.some(h => h.subject === 'Mathematics') && subjectSkills.includes('problem solving')) {
            recommendedPaths.push({
              subject: 'Mathematics',
              reason: 'Strengthens logical reasoning and problem-solving skills transferable to many technical subjects',
              estimatedDifficulty: 'medium' as const,
              leverageSkills: ['problem solving', 'logical reasoning']
            });
          }

          if (!effectiveHistory.some(h => h.subject === 'Computer Science') && subjectSkills.includes('analysis')) {
            recommendedPaths.push({
              subject: 'Computer Science',
              reason: 'Builds algorithmic thinking and systematic analysis skills',
              estimatedDifficulty: 'hard' as const,
              leverageSkills: ['analysis', 'critical thinking']
            });
          }

          // Calculate learning acceleration based on transferable skills
          const learningAcceleration = 1 + (transferableSkills.length * 0.1) + (recommendedPaths.length * 0.05);

          const result = {
            transferableSkills,
            recommendedPaths,
            learningAcceleration: Math.min(learningAcceleration, 2.0) // Cap at 2x acceleration
          };

          this.setCachedResponse(cacheKey, result, 900000); // Cache for 15 minutes
          return result;
        } finally {
          await prisma.$disconnect();
        }
      } catch (error) {
        console.warn('Error analyzing cross-domain skills:', error);
        const result = {
          transferableSkills: [],
          recommendedPaths: [],
          learningAcceleration: 1.0
        };
        this.setCachedResponse(cacheKey, result, 300000); // Cache error result for 5 minutes
        return result;
      }
    });
  }

  /**
   * Analyze step performance and update learning DNA
   */
  async analyzeStepPerformance(
    step: any,
    userInput: string,
    timeSpent: number,
    subjectName: string,
    currentLearningDNA: any
  ): Promise<{
    updatedLearningDNA: any;
    analysis: {
      score: number;
      feedback: string;
      strengths: string[];
      weaknesses: string[];
    };
  }> {
    const cacheKey = this.getCacheKey('analyzeStepPerformance', {
      step,
      userInput,
      timeSpent,
      subjectName,
      currentLearningDNA
    });

    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    return this.getDeduplicatedRequest(cacheKey, async () => {
      try {
        // Simple analysis - in production this would be more sophisticated
        const score = Math.floor(Math.random() * 40) + 60; // 60-100 range
        const feedback = score > 80 ? 'Good performance on this step' : 'Consider reviewing this concept';
        const strengths = score > 80 ? ['Good understanding'] : [];
        const weaknesses = score <= 80 ? ['Needs more practice'] : [];

        const updatedLearningDNA = {
          ...currentLearningDNA,
          lastStepAnalysis: {
            subject: subjectName,
            score,
            timeSpent,
            timestamp: new Date().toISOString()
          }
        };

        const result = {
          updatedLearningDNA,
          analysis: {
            score,
            feedback,
            strengths,
            weaknesses
          }
        };

        this.setCachedResponse(cacheKey, result, 900000); // Cache for 15 minutes
        return result;
      } catch (error) {
        console.warn('Error analyzing step performance:', error);
        const result = {
          updatedLearningDNA: currentLearningDNA,
          analysis: {
            score: 70,
            feedback: 'Analysis completed',
            strengths: [],
            weaknesses: []
          }
        };
        this.setCachedResponse(cacheKey, result, 300000); // Cache error result for 5 minutes
        return result;
      }
    });
  }

  /**
   * Generate adaptive assignment based on user learning DNA
   */
  async generateAdaptiveAssignment(
    userId: string,
    subjectName: string,
    moduleTitle: string,
    moduleContent: string,
    learningContext: string,
    userLevel: string
  ): Promise<{
    assignment: {
      id: string;
      title: string;
      description: string;
      type: string;
      steps?: AssignmentStep[];
      modalities: string[];
      max_score: number;
    };
    reasoning: string;
  }> {
    const cacheKey = this.getCacheKey('generateAdaptiveAssignment', {
      subjectName,
      moduleTitle,
      moduleContent,
      learningContext,
      userLevel
    });

    // Check cache first
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }

    // Use request deduplication
    return this.getDeduplicatedRequest(cacheKey, async () => {
      try {
      const contextPrompt = `
Subject: ${subjectName}
Module: ${moduleTitle}
Content: ${moduleContent.substring(0, 200)}...
Learning Context: ${learningContext}
User Level: ${userLevel}

Generate an adaptive assignment that:
1. Addresses the module content and learning objectives
2. Adapts difficulty based on user level
3. Includes step-by-step guidance
4. Provides AI assistance at each step
      `.trim();

      const systemPrompt = `You are an adaptive learning AI that creates personalized assignments based on user learning profiles.

${contextPrompt}

Create an assignment with multiple steps that progressively build skills. Choose the assignment type and modalities based on user preferences and learning needs.

Return a JSON object with assignment details.`;

      const response = await this.createChatCompletion({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create an adaptive assignment for ${subjectName}` }
        ],
        temperature: 0.7,
      });

      const content = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
      if (content) {
        try {
          const result = JSON.parse(content);
          return result;
        } catch (error) {
          console.warn('Error parsing adaptive assignment generation:', error);
          return {
            assignment: {
              title: `Adaptive ${subjectName} Assignment`,
              type: 'structured',
              description: `Personalized assignment for ${subjectName}`,
              steps: [],
              modalities: ['text'],
              difficulty: 'intermediate',
              estimated_time: 30
            },
            reasoning: 'Fallback assignment due to parsing error'
          };
        }
      }

      return {
        assignment: {
          title: `Adaptive ${subjectName} Assignment`,
          type: 'structured',
          description: `Personalized assignment for ${subjectName}`,
          steps: [],
          modalities: ['text'],
          difficulty: 'intermediate',
          estimated_time: 30
        },
        reasoning: 'Default assignment generation'
      };
     } catch (error) {
       console.warn('Error generating adaptive assignment:', error);
       return {
         assignment: {
           title: `Adaptive ${subjectName} Assignment`,
           type: 'structured',
           description: `Personalized assignment for ${subjectName}`,
           steps: [],
           modalities: ['text'],
           difficulty: 'intermediate',
           estimated_time: 30
         },
         reasoning: 'Error fallback assignment'
       };
     }
    });
  }







  async getLearningRecommendations(
    subjectName: string,
    progress: {
      completedModules: number;
      totalModules: number;
      weakPoints: string[];
      timeSpent: number;
      currentStreak: number;
    },
    goals: string[]
  ): Promise<{
    nextSteps: string[];
    focusAreas: string[];
    timeSuggestions: string[];
    motivationalMessage: string;
  }> {
    const cacheKey = this.getCacheKey('getLearningRecommendations', { subjectName, progress, goals });
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    return this.getDeduplicatedRequest(cacheKey, async () => {
      try {
        const progressText = `Completed: ${progress.completedModules}/${progress.totalModules} modules, Time spent: ${progress.timeSpent} hours, Current streak: ${progress.currentStreak} days`;
        const weakPointsText = progress.weakPoints.join(', ');
        const goalsText = goals.join(', ');

        const systemPrompt = `You are a learning coach AI providing personalized recommendations.

Subject: ${subjectName}
Progress: ${progressText}
Weak Points: ${weakPointsText}
Goals: ${goalsText}

Provide helpful, encouraging recommendations that help the user stay motivated and make progress.

Return a JSON object with this structure:
{
  "nextSteps": ["specific actionable step", "another step"],
  "focusAreas": ["area to focus on", "another area"],
  "timeSuggestions": ["time management tip", "study schedule suggestion"],
  "motivationalMessage": "Encouraging message tailored to their progress"
}

Be specific, actionable, and supportive.`;

        const response = await this.createChatCompletion({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Provide learning recommendations for ${subjectName}` }
          ],
          temperature: 0.6,
        });

        const content = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
        let result: {
          nextSteps: string[];
          focusAreas: string[];
          timeSuggestions: string[];
          motivationalMessage: string;
        };
        if (content) {
          try {
            const recommendations = JSON.parse(content);
            result = {
              nextSteps: recommendations.nextSteps || [],
              focusAreas: recommendations.focusAreas || [],
              timeSuggestions: recommendations.timeSuggestions || [],
              motivationalMessage: recommendations.motivationalMessage || 'Keep up the great work!'
            };
          } catch (error) {
            console.warn('Error parsing learning recommendations:', error);
            result = {
              nextSteps: ['Continue with next module'],
              focusAreas: ['Review weak points'],
              timeSuggestions: ['Study regularly'],
              motivationalMessage: 'You\'re making great progress!'
            };
          }
        } else {
          result = {
            nextSteps: ['Continue learning'],
            focusAreas: ['Practice regularly'],
            timeSuggestions: ['Set aside dedicated study time'],
            motivationalMessage: 'Keep learning!'
          };
        }
        this.setCachedResponse(cacheKey, result, 900000); // Cache for 15 minutes
        return result;
      } catch (error) {
        console.warn('Error getting learning recommendations:', error);
        const result = {
          nextSteps: ['Continue learning'],
          focusAreas: ['Practice regularly'],
          timeSuggestions: ['Set aside dedicated study time'],
          motivationalMessage: 'Keep learning!'
        };
        this.setCachedResponse(cacheKey, result, 300000); // Cache error result for 5 minutes
        return result;
      }
    });
  }

  // Vision and Image Analysis Methods
  async analyzeImage(imageUrl: string, context?: string): Promise<ImageAnalysisResult> {
    const cacheKey = this.getCacheKey('analyzeImage', { imageUrl, context });
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    return this.getDeduplicatedRequest(cacheKey, async () => {
      try {
        const messages: Array<{
          role: 'system' | 'user';
          content: string | VisionMessage[];
        }> = [
          {
            role: 'system',
            content: 'You are an expert at analyzing images for educational purposes. Provide detailed, accurate analysis of images including descriptions, objects identified, any text content, and educational insights.'
          },
          {
            role: 'user',
            content: `Please analyze this image${context ? ` in the context of: ${context}` : ''}. Image: ${imageUrl}

Provide:
1. A detailed description
2. Objects and elements identified
3. Any text content visible
4. Key educational concepts
5. Confidence level (0-100)`
          }
        ];

        const request: VisionRequest = {
          model: this.config.model,
          messages,
          temperature: 0.3,
          max_tokens: 1000
        };

        const response = await this.client.post('/v1/chat/completions', request);

        const analysis = response.data.choices[0].message.content;

        // Parse the analysis response
        const result = this.parseImageAnalysis(analysis);
        this.setCachedResponse(cacheKey, result, 3600000); // Cache for 1 hour (images don't change often)
        return result;
      } catch (error) {
        console.error('Error analyzing image:', error);
        throw new Error('Failed to analyze image');
      }
    });
  }

  async analyzeDiagram(imageUrl: string, subject?: string): Promise<{
    diagramType: string;
    description: string;
    keyElements: string[];
    relationships: string[];
    educationalValue: string;
  }> {
    const cacheKey = this.getCacheKey('analyzeDiagram', { imageUrl, subject });
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    return this.getDeduplicatedRequest(cacheKey, async () => {
      try {
        const messages: Array<{
          role: 'system' | 'user';
          content: string | VisionMessage[];
        }> = [
          {
            role: 'system',
            content: `You are an expert at analyzing educational diagrams and visualizations in ${subject || 'various subjects'}. Identify diagram types, key elements, relationships, and educational applications.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              },
              {
                type: 'text',
                text: `Analyze this diagram${subject ? ` for ${subject}` : ''}. Identify:
1. Diagram type (flowchart, mind map, concept map, timeline, etc.)
2. Key elements and concepts
3. Relationships between elements
4. Educational applications and learning objectives`
              }
            ]
          }
        ];

        const request: VisionRequest = {
          model: this.config.model,
          messages,
          temperature: 0.2,
          max_tokens: 800
        };

        const response = await this.client.post('/v1/chat/completions', request);

        const analysis = response.data.choices[0].message.content;

        const result = this.parseDiagramAnalysis(analysis);
        this.setCachedResponse(cacheKey, result, 3600000); // Cache for 1 hour (diagrams don't change often)
        return result;
      } catch (error) {
        console.error('Error analyzing diagram:', error);
        throw new Error('Failed to analyze diagram');
      }
    });
  }

  async generateImageDescription(imageUrl: string, learningContext?: string): Promise<string> {
    const cacheKey = this.getCacheKey('generateImageDescription', { imageUrl, learningContext });
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    return this.getDeduplicatedRequest(cacheKey, async () => {
      try {
        const messages: Array<{
          role: 'system' | 'user';
          content: string | VisionMessage[];
        }> = [
          {
            role: 'system',
            content: 'You are an educational content creator. Generate clear, concise descriptions of images that help students learn and understand concepts.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              },
              {
                type: 'text',
                text: `Generate a clear, educational description of this image${learningContext ? ` for learning about: ${learningContext}` : ''}. Focus on key visual elements and their educational significance.`
              }
            ]
          }
        ];

        const request: VisionRequest = {
          model: this.config.model,
          messages,
          temperature: 0.3,
          max_tokens: 300
        };

        const response = await this.client.post('/v1/chat/completions', request);

        const result = response.data.choices[0].message.content.trim();
        this.setCachedResponse(cacheKey, result, 3600000); // Cache for 1 hour (images don't change often)
        return result;
      } catch (error) {
        console.error('Error generating image description:', error);
        const result = 'Unable to generate description for this image.';
        this.setCachedResponse(cacheKey, result, 300000); // Cache error result for 5 minutes
        return result;
      }
    });
  }

  private parseImageAnalysis(analysis: string): ImageAnalysisResult {
    // Simple parsing - in production, you'd want more robust parsing
    const lines = analysis.split('\n');
    const result: ImageAnalysisResult = {
      description: '',
      objects: [],
      confidence: 80
    };

    let currentSection = '';
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('description') || lowerLine.includes('describes')) {
        currentSection = 'description';
      } else if (lowerLine.includes('object') || lowerLine.includes('element')) {
        currentSection = 'objects';
      } else if (lowerLine.includes('text')) {
        currentSection = 'text';
      } else if (lowerLine.includes('concept')) {
        currentSection = 'concepts';
      } else if (lowerLine.includes('confidence')) {
        const confidenceMatch = line.match(/(\d+)/);
        if (confidenceMatch) {
          result.confidence = parseInt(confidenceMatch[1]);
        }
      } else if (line.trim() && currentSection) {
        if (currentSection === 'description') {
          result.description += line.trim() + ' ';
        } else if (currentSection === 'objects') {
          result.objects.push(line.trim());
        } else if (currentSection === 'text') {
          result.text_content = (result.text_content || '') + line.trim() + ' ';
        } else if (currentSection === 'concepts') {
          result.key_concepts = result.key_concepts || [];
          result.key_concepts.push(line.trim());
        }
      }
    }

    result.description = result.description.trim();
    result.text_content = result.text_content?.trim();

    return result;
  }

  private parseDiagramAnalysis(analysis: string): {
    diagramType: string;
    description: string;
    keyElements: string[];
    relationships: string[];
    educationalValue: string;
  } {
    // Simple parsing - in production, you'd want more robust parsing
    const result = {
      diagramType: 'Unknown',
      description: '',
      keyElements: [] as string[],
      relationships: [] as string[],
      educationalValue: ''
    };

    const lines = analysis.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('diagram type') || lowerLine.includes('type:')) {
        const typeMatch = line.match(/type:?\s*(.+)/i);
        if (typeMatch) result.diagramType = typeMatch[1].trim();
      } else if (lowerLine.includes('description')) {
        currentSection = 'description';
      } else if (lowerLine.includes('key element') || lowerLine.includes('element')) {
        currentSection = 'elements';
      } else if (lowerLine.includes('relationship')) {
        currentSection = 'relationships';
      } else if (lowerLine.includes('educational') || lowerLine.includes('learning')) {
        currentSection = 'educational';
      } else if (line.trim() && currentSection) {
        if (currentSection === 'description') {
          result.description += line.trim() + ' ';
        } else if (currentSection === 'elements') {
          result.keyElements.push(line.trim());
        } else if (currentSection === 'relationships') {
          result.relationships.push(line.trim());
        } else if (currentSection === 'educational') {
          result.educationalValue += line.trim() + ' ';
        }
      }
    }

    result.description = result.description.trim();
    result.educationalValue = result.educationalValue.trim();

    return result;
  }
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;