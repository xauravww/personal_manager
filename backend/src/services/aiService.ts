import axios, { AxiosInstance } from 'axios';

interface AIConfig {
  proxyUrl: string;
  apiKey: string;
  model: string;
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



class AIService {
  private client: AxiosInstance;
  private config: AIConfig;

  constructor() {
    this.config = {
      proxyUrl: process.env.AI_PROXY_URL || 'https://api.openai.com',
      apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '',
      model: process.env.AI_MODEL || '',
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
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    try {
      const response = await this.client.post('/v1/chat/completions', request);
      return response.data;
    } catch (error) {
      console.error('Error creating chat completion:', error);
      throw new Error('Failed to generate AI response');
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

    async enhanceSearchQuery(userQuery: string): Promise<{
      intent: 'search' | 'chat';
      enhancedQuery: string;
      searchTerms: string[];
      filters: {
        type?: string;
        tags?: string[];
      };
    }> {
       const systemPrompt = `You are a helpful assistant that enhances search queries for a personal resource manager.
       The user has resources like notes, documents, videos, links, and images.
       First, determine if the query is a search request or conversational chat.
        Set intent to "chat" ONLY for:
        - Pure greetings without search intent: hi, hello, hey, good morning, etc. (but not "hello, find my notes")
        - Thanks: thank you, thanks, appreciate it
        - Direct questions about the assistant: can you help, what can you do, who are you, etc.
        - Very short single words: hi, help, please (when standalone)
       Set intent to "search" for ALL other queries, especially those that:
       - Ask to find, show, give, get, or retrieve resources
       - Use words like "find", "search", "show me", "give me", "get", "related to", "about", "something", "anything"
       - Mention resource types: notes, books, documents, videos, links, images
       - Ask questions about user's content or resources

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
          "type": "note|document|video|link|image" (optional),
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
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

       // Parse the JSON response
       const parsed = JSON.parse(content);
       return {
         intent: parsed.intent || 'search',
         enhancedQuery: parsed.enhancedQuery || userQuery,
         searchTerms: parsed.searchTerms || [userQuery],
         filters: parsed.filters || {},
       };
    } catch (error) {
      console.error('Error enhancing search query:', error);
      // Fallback to basic search
      return {
        intent: 'search',
        enhancedQuery: userQuery,
        searchTerms: [userQuery],
        filters: {},
      };
    }
  }

  /**
   * Generate search suggestions when no results found
   */
  async generateSearchSuggestions(userQuery: string): Promise<string[]> {
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
        max_tokens: 100,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (content) {
        try {
          const suggestions = JSON.parse(content);
          return Array.isArray(suggestions) ? suggestions.slice(0, 5) : [];
        } catch {
          // Fallback: extract from text
          return content.split(',').map(s => s.trim().replace(/["\[\]]/g, '')).filter(s => s.length > 0).slice(0, 5);
        }
      }
      return [];
    } catch (error) {
      console.warn('Error generating search suggestions:', error);
      return [];
    }
  }

  async generateChatResponse(userQuery: string, context?: string, timezone?: string): Promise<string> {
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

    let systemPrompt = `You are a helpful AI assistant for a personal resource manager application.
    Users can store and search through their notes, documents, videos, links, and other resources.
    Current date and time: ${currentDateTime}
    Always include accurate current date/time information when asked about dates, times, or current status.
    Respond to user queries in a friendly, helpful manner. Keep responses concise but informative.
    If they ask about your capabilities, explain that you help search and organize personal resources.
    If they greet you, respond warmly and offer assistance.
    Do not mention technical details unless asked.`;

    if (context) {
      systemPrompt += `\n\nRecent context: ${context}`;
    }

    try {
      const response = await this.createChatCompletion({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      return response.choices[0]?.message?.content?.trim() || "I'm here to help you with your personal resources!";
    } catch (error) {
      console.error('Error generating chat response:', error);
      return "Hello! I'm your AI assistant for managing personal resources. How can I help you today?";
    }
  }

  async summarizeContent(content: string, maxLength: number = 100): Promise<string> {
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
        max_tokens: 100,
      });

      return response.choices[0]?.message?.content?.trim() || content.substring(0, maxLength);
    } catch (error) {
      console.error('Error summarizing content:', error);
      // Fallback to truncation
      return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
    }
  }

  async extractTags(content: string, maxTags: number = 5): Promise<string[]> {
    try {
      const response = await this.createChatCompletion({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: `Extract ${maxTags} relevant keywords or tags from the given content. Return only a comma-separated list of tags, no other text.`
          },
          {
            role: 'user',
            content: content
          }
        ],
        temperature: 0.3,
        max_tokens: 50,
      });

      const tagsString = response.choices[0]?.message?.content?.trim() || '';
      return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0).slice(0, maxTags);
    } catch (error) {
      console.error('Error extracting tags:', error);
      return [];
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
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;