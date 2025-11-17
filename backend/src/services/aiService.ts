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
      return summary || content.substring(0, maxLength);
    } catch (error) {
      console.error('Error summarizing content:', error);
      // Fallback to simple truncation
      return content.length > maxLength ? content.substring(0, maxLength - 3) + '...' : content;
    }
  }

  /**
   * Extract relevant tags from content
   */
  async extractTags(content: string, maxTags: number = 5): Promise<string[]> {
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
      if (tagsText) {
        return tagsText.split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0)
          .slice(0, maxTags);
      }
      return [];
    } catch (error) {
      console.error('Error extracting tags:', error);
      return [];
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
    // For testing with dummy API key, provide mock intent detection
    if (this.config.apiKey === 'dummy-api-key-for-testing') {
      const lowerQuery = userQuery.toLowerCase();
      if (lowerQuery === 'hi' || lowerQuery === 'hello' || lowerQuery === 'hey' ||
          lowerQuery.includes('thank') || lowerQuery === 'who r uh' ||
          lowerQuery === 'who are you' || lowerQuery === 'what can you do') {
        return {
          intent: 'chat',
          enhancedQuery: '',
          searchTerms: [],
          filters: {}
        };
      }
      return {
        intent: 'search',
        enhancedQuery: userQuery,
        searchTerms: [userQuery],
        filters: {}
      };
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
      });

      const content = (response as ChatCompletionResponse).choices[0]?.message?.content?.trim();
      if (content) {
        try {
          const suggestions = JSON.parse(content);
          return Array.isArray(suggestions) ? suggestions.slice(0, 5) : [];
        } catch {
          // Fallback: extract from text
            return content.split(',').map((s: string) => s.trim().replace(/["[\]]/g, '')).filter((s: string) => s.length > 0).slice(0, 5);
        }
      }
      return [];
    } catch (error) {
      console.warn('Error generating search suggestions:', error);
      return [];
    }
  }

  async generateDeepResearchResponse(userQuery: string, context?: string, timezone?: string): Promise<string> {
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

      return (response as ChatCompletionResponse).choices[0]?.message?.content?.trim() || "I'll help you conduct deep research on this topic. Let me gather comprehensive information for you.";
    } catch (error) {
      console.error('Error generating deep research response:', error);
      return "I'm conducting deep research on your query. This may take a moment as I gather comprehensive information from multiple sources.";
    }
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
    Do not mention technical details unless asked.`;

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
      if (content) {
        try {
          const queries = JSON.parse(content);
          return Array.isArray(queries) ? queries.slice(0, 3) : [];
        } catch {
          // Fallback: extract from text
           return content.split(',').map((q: string) => q.trim().replace(/["[\]]/g, '')).filter((q: string) => q.length > 0).slice(0, 3);
        }
      }
      return [];
    } catch (error) {
      console.warn('Error generating research queries:', error);
      return [];
    }
  }

  async suggestUrlsToRead(searchResults: any[], originalQuery: string): Promise<{url: string, title: string, reason: string}[]> {
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
      if (content) {
        try {
          const suggestions = JSON.parse(content);
          return Array.isArray(suggestions) ? suggestions.slice(0, 4) : [];
        } catch (error) {
          console.warn('Error parsing URL suggestions:', error);
          return [];
        }
      }
      return [];
    } catch (error) {
      console.warn('Error generating URL suggestions:', error);
      return [];
    }
  }

  async analyzeUrlContent(content: string, originalQuery: string): Promise<{found: boolean, answer?: string, confidence: number, summary?: string}> {
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
      if (content_response) {
        try {
          const analysis = JSON.parse(content_response);
          return {
            found: analysis.found || false,
            answer: analysis.answer || '',
            confidence: analysis.confidence || 0,
            summary: analysis.summary || ''
          };
        } catch (error) {
          console.warn('Error parsing content analysis:', error);
          return { found: false, confidence: 0 };
        }
      }
      return { found: false, confidence: 0 };
    } catch (error) {
      console.warn('Error analyzing URL content:', error);
      return { found: false, confidence: 0 };
    }
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
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;