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
      model: process.env.AI_MODEL || 'gpt-3.5-turbo',
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

  /**
   * Enhanced search using AI to understand natural language queries
   */
  async enhanceSearchQuery(userQuery: string): Promise<{
    enhancedQuery: string;
    searchTerms: string[];
    filters: {
      type?: string;
      tags?: string[];
    };
  }> {
    const systemPrompt = `You are a helpful assistant that enhances search queries for a personal resource manager.
    The user has resources like notes, documents, videos, links, and images.
    Convert natural language queries into structured search terms and filters.

    Respond with JSON in this format:
    {
      "enhancedQuery": "improved search query",
      "searchTerms": ["term1", "term2"],
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
        enhancedQuery: parsed.enhancedQuery || userQuery,
        searchTerms: parsed.searchTerms || [userQuery],
        filters: parsed.filters || {},
      };
    } catch (error) {
      console.error('Error enhancing search query:', error);
      // Fallback to basic search
      return {
        enhancedQuery: userQuery,
        searchTerms: [userQuery],
        filters: {},
      };
    }
  }

  /**
   * Generate content summary using AI
   */
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

  /**
   * Extract keywords/tags from content using AI
   */
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
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;