// API Client for Personal Resource Manager Backend

// Interface for dashboard statistics
interface DashboardStats {
  totalResources: number;
  addedThisWeek: number;
  searchesToday: number;
}

// Determine API base URL based on environment and proxy settings
const getApiBaseUrl = () => {
  const proxyUrl = import.meta.env.VITE_PROXY_URL;
  const apiUrl = import.meta.env.VITE_API_URL;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const nodeEnv = import.meta.env.VITE_NODE_ENV;

  // In production, use proxy URL if available
  if (nodeEnv === 'production' && proxyUrl) {
    return proxyUrl;
  }

  // Use full API URL if provided
  if (apiUrl) {
    return apiUrl;
  }

  // In development, use relative path to work with Vite proxy
  if (nodeEnv !== 'production') {
    return '/api';
  }

  // Fallback to base URL + /api
  return `${apiBaseUrl || 'http://localhost:3001'}/api`;
};

export const API_BASE_URL = getApiBaseUrl();

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}

interface Resource {
  id: string;
  title: string;
  description?: string;
  url?: string;
  type: 'note' | 'video' | 'link' | 'document';
  content?: string;
  file_path?: string;
  metadata?: Record<string, any>;
  tags: { id: string; name: string }[];
  created_at: string;
  updated_at: string;
}

interface MCPToolResult {
  serverUrl: string;
  toolName: string;
  result: any;
  success: boolean;
  error?: string;
}

interface SearchResponse {
  resources: Resource[];
  total: number;
  has_more: boolean;
  webResults?: WebSearchResult[];
  ai?: {
    enhancedQuery: string;
    searchTerms: string[];
    appliedFilters: {
      type: string | null;
      tags: string[] | null;
    };
    mcpResults?: MCPToolResult[];
    mcpSummary?: string;
  };
}

interface CreateResourceRequest {
  title: string;
  description?: string;
  url?: string;
  type: 'note' | 'video' | 'link' | 'document';
  content?: string;
  file_path?: string;
  metadata?: Record<string, any>;
  tag_names?: string[];
}

interface UrlReaderRequest {
  url: string;
  returnRaw?: boolean;
  maxRetries?: number;
  startChar?: number;
  maxLength?: number;
  section?: string;
  paragraphRange?: string;
  readHeadings?: boolean;
}

interface UrlReaderResponse {
  content: string;
  url: string;
  processingTime: number;
}

interface WebSearchRequest {
  query: string;
  pageno?: number;
  time_range?: 'day' | 'week' | 'month' | 'year';
  categories?: string;
  engines?: string;
  enabled_engines?: string;
  disabled_engines?: string;
  language?: string;
  safesearch?: number;
}

interface WebSearchResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  category?: string;
  publishedDate?: string;
}

interface WebSearchResponse {
  query: string;
  number_of_results: number;
  results: WebSearchResult[];
  answers?: any[];
  corrections?: any[];
  infoboxes?: any[];
  suggestions?: string[];
  unresponsive_engines?: string[];
  formatted: string;
  processingTime: number;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('authToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authorization header if token exists
    if (this.token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${this.token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (parseError) {
        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status}: ${text || response.statusText}`,
          };
        }
        return {
          success: false,
          error: `Invalid JSON response: ${text}`,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Generic POST method for flexibility
  async post<T = any>(endpoint: string, data?: any, config?: RequestInit): Promise<{ data: T, status: number }> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: any = {
      ...config?.headers
    };

    // Add authorization if token exists
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    // Only add Content-Type if not FormData
    if (!(data instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: data instanceof FormData ? data : JSON.stringify(data),
      ...config
    });

    if (!response.ok) {
      const text = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(text);
        throw new Error(errorData.error || 'Request failed');
      } catch (parseError) {
        throw new Error(text || 'Request failed');
      }
    }

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return {
        data,
        status: response.status
      };
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${text}`);
    }
  }

  // Authentication methods
  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async signup(email: string, password: string, name: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });

    if (response.success && response.data) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<{ id: string; email: string; name: string }>> {
    return this.request('/auth/me');
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });

    if (response.success) {
      this.clearToken();
    }

    return response;
  }

  // Resource methods
  async getResources(params?: {
    page?: number;
    limit?: number;
    type?: string;
    tags?: string;
  }): Promise<ApiResponse<{ resources: Resource[]; pagination: { total: number; pages: number; page: number; limit: number } }>> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.type) searchParams.set('type', params.type);
    if (params?.tags) searchParams.set('tags', params.tags);

    const query = searchParams.toString();
    return this.request(`/resources${query ? `?${query}` : ''}`);
  }

  // New method to fetch dashboard stats
  async getDashboardStats(): Promise<ApiResponse<{ totalResources: number; addedThisWeek: number; searchesToday: number }>> {
    return this.request('/dashboard/stats');
  }

  async getResource(id: string): Promise<ApiResponse<Resource>> {
    return this.request(`/resources/${id}`);
  }

  async createResource(resource: CreateResourceRequest): Promise<ApiResponse<Resource>> {
    return this.request('/resources', {
      method: 'POST',
      body: JSON.stringify(resource),
    });
  }

  async updateResource(id: string, resource: Partial<CreateResourceRequest>): Promise<ApiResponse<Resource>> {
    return this.request(`/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(resource),
    });
  }

  async deleteResource(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/resources/${id}`, {
      method: 'DELETE',
    });
  }

  // Search methods
  async searchResources(params: {
    q?: string;
    type?: string;
    tags?: string;
    limit?: number;
    offset?: number;
    timezone?: string;
    focusMode?: string;
    stream?: boolean;
    forceWebSearch?: boolean;
    useMCP?: boolean;
    mcpCredentials?: Record<string, string>;
    conversation?: Array<{ type: string, content: string }>;
    learningContext?: any;
  }): Promise<{ success: boolean; data: SearchResponse; ai?: any; error?: string }> {
    const searchParams = new URLSearchParams();

    if (params.q) searchParams.set('q', params.q);
    if (params.type) searchParams.set('type', params.type);
    if (params.tags) searchParams.set('tags', params.tags);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());
    if (params.timezone) searchParams.set('timezone', params.timezone);
    if (params.focusMode) searchParams.set('focusMode', params.focusMode);
    if (params.stream) searchParams.set('stream', '1');
    if (params.forceWebSearch) searchParams.set('forceWebSearch', 'true');
    if (params.useMCP) searchParams.set('useMCP', 'true');
    if (params.mcpCredentials && Object.keys(params.mcpCredentials).length > 0) {
      searchParams.set('mcpCredentials', JSON.stringify(params.mcpCredentials));
    }
    if (params.conversation && params.conversation.length > 0) {
      searchParams.set('conversation', JSON.stringify(params.conversation));
    }
    if (params.learningContext) {
      searchParams.set('learningContext', JSON.stringify(params.learningContext));
    }

    const url = `${API_BASE_URL}/search?${searchParams.toString()}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add authorization header if token exists
    if (this.token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${this.token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (parseError) {
        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status}: ${text || response.statusText}`,
          };
        }
        return {
          success: false,
          error: `Invalid JSON response: ${text}`,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return data; // Return the full response including ai
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async getSearchSuggestions(params: {
    q?: string;
    limit?: number;
  }): Promise<ApiResponse<{ suggestions: string[]; type: string }>> {
    const searchParams = new URLSearchParams();

    if (params.q) searchParams.set('q', params.q);
    if (params.limit) searchParams.set('limit', params.limit.toString());

    return this.request(`/search/suggestions?${searchParams.toString()}`);
  }

  // URL Reader methods
  async readUrlContent(params: UrlReaderRequest): Promise<ApiResponse<UrlReaderResponse>> {
    return this.request('/url-reader', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Web Search methods
  async performWebSearch(params: WebSearchRequest): Promise<ApiResponse<WebSearchResponse>> {
    return this.request('/web-search', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Token management
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Deep Research methods
  async performDeepResearch(params: {
    query: string;
    maxThoughts?: number;
    timezone?: string;
    includeWebSearch?: boolean;
    learningContext?: any;
  }): Promise<EventSource> {
    const searchParams = new URLSearchParams();
    searchParams.set('query', params.query);
    if (params.maxThoughts) searchParams.set('maxThoughts', params.maxThoughts.toString());
    if (params.timezone) searchParams.set('timezone', params.timezone);
    if (params.includeWebSearch !== undefined) searchParams.set('includeWebSearch', params.includeWebSearch.toString());
    if (params.learningContext) searchParams.set('learningContext', JSON.stringify(params.learningContext));
    if (this.token) searchParams.set('token', this.token);

    const url = `${API_BASE_URL}/deep-research?${searchParams.toString()}`;

    const eventSource = new EventSource(url);

    return eventSource;
  }

  // Learning methods
  async getLearningSubjects(): Promise<ApiResponse<any[]>> {
    return this.request('/learning/subjects');
  }

  async createLearningSubject(subject: { name: string; description?: string; goals?: string[] }): Promise<ApiResponse<any>> {
    return this.request('/learning/subjects', {
      method: 'POST',
      body: JSON.stringify(subject),
    });
  }

  async updateLearningSubject(id: string, subject: Partial<{ name: string; description?: string; goals?: string[] }>): Promise<ApiResponse<any>> {
    return this.request(`/learning/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(subject),
    });
  }

  async deleteLearningSubject(id: string): Promise<ApiResponse<any>> {
    return this.request(`/learning/subjects/${id}`, {
      method: 'DELETE',
    });
  }

  async getLearningModules(subjectId: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<{
    modules: any[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request(`/learning/subjects/${subjectId}/modules${query ? `?${query}` : ''}`);
  }

  async createLearningModule(module: {
    subject_id: string;
    title: string;
    description?: string;
    content?: string;
    order_index?: number;
    prerequisites?: string[];
    estimated_time?: number;
    difficulty?: string;
    is_optional?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.request('/learning/modules', {
      method: 'POST',
      body: JSON.stringify(module),
    });
  }

  async updateProgress(progress: {
    module_id: string;
    status: string;
    score?: number;
    time_spent?: number;
    notes?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/learning/progress', {
      method: 'POST',
      body: JSON.stringify(progress),
    });
  }

  async getAssignment(id: string): Promise<ApiResponse<any>> {
    return this.request(`/learning/assignments/${id}`);
  }

  async submitAssignment(submission: {
    assignment_id: string;
    content: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/learning/assignments/submit', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  }

  async getProgressOverview(): Promise<ApiResponse<any[]>> {
    return this.request('/learning/progress/overview');
  }

  async generateCourse(params: {
    subject_name: string;
    user_resources?: string[];
    current_level?: string;
    goals?: string[];
  }): Promise<ApiResponse<any>> {
    return this.request('/learning/generate-course', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getKnowledgeSummary(subjectId: string): Promise<ApiResponse<{
    summary: string;
    strengths: string[];
    areasForImprovement: string[];
    confidence: number;
    nextMilestones: string[];
  }>> {
    return this.request(`/learning/subjects/${subjectId}/knowledge-summary`);
  }

  async getMindmaps(): Promise<ApiResponse<any[]>> {
    return this.request('/learning/mindmaps');
  }

  async generateMindmap(params: {
    subject_id?: string;
    type: 'concept' | 'progress' | 'weak_points';
    context?: any;
  }): Promise<ApiResponse<any>> {
    return this.request('/learning/mindmaps/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async chatWithModule(params: {
    module_id: string;
    message: string;
    conversation_history?: Array<{ role: string, content: string }>;
  }): Promise<ApiResponse<{
    response: string;
    quiz?: { question: string; options: string[]; correctAnswer: number };
    code?: { language: string; snippet: string };
    mastery_achieved?: boolean;
    suggestions?: string[];
    analysis?: {
      score: number;
      strengths: string[];
      weakPoints: Array<{ topic: string, severity: string, suggestions: string[] }>;
    };
    completed?: boolean;
  }>> {
    return this.request('/learning/modules/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Multimodal Learning Methods
  async generateAdaptiveAssignment(params: {
    subject_name: string;
    knowledge_gaps?: string[];
    preferred_modalities?: string[];
  }): Promise<ApiResponse<any>> {
    return this.request('/learning/assignments/generate-adaptive', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async analyzeStepPerformance(params: {
    assignment_id: string;
    step: any;
    user_input: string;
    time_spent: number;
  }): Promise<ApiResponse<any>> {
    return this.request('/learning/assignments/analyze-step', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getLearningDNA(): Promise<ApiResponse<any>> {
    return this.request('/learning/learning-dna');
  }

  // Cross-domain learning
  async analyzeCrossDomainSkills(currentSubject: string, learningHistory?: Array<{
    subject: string;
    skills: string[];
    performance: number;
    timeSpent: number;
  }>): Promise<ApiResponse<{
    analysis: {
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
    };
  }>> {
    return this.request('/learning/cross-domain/analyze', {
      method: 'POST',
      body: JSON.stringify({
        current_subject: currentSubject,
        learning_history: learningHistory
      }),
    });
  }

  // Code execution
  async executeCode(params: {
    code: string;
    language?: string;
    timeout?: number;
  }): Promise<ApiResponse<{
    success: boolean;
    output: string;
    executionTime: number;
    language: string;
  }>> {
    return this.request('/learning/code/execute', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // New Learning Flow Methods
  async assessSkill(topic: string): Promise<ApiResponse<{ questions: Array<{ id: string; question: string; options: string[]; correctAnswer: number }> }>> {
    return this.request('/learning/assess-skill', {
      method: 'POST',
      body: JSON.stringify({ topic }),
    });
  }

  async checkPrerequisites(topic: string): Promise<ApiResponse<{ hasPrerequisites: boolean; prerequisites: string[]; reason: string }>> {
    return this.request('/learning/prerequisites/check', {
      method: 'POST',
      body: JSON.stringify({ topic }),
    });
  }

  async generateCurriculum(topic: string, assessmentResults?: { score: number; weakAreas: string[] }): Promise<ApiResponse<{ subject: any; modules: any[] }>> {
    return this.request('/learning/generate-curriculum', {
      method: 'POST',
      body: JSON.stringify({ topic, assessmentResults }),
    });
  }

  async completeModule(
    moduleId: string,
    sessionData?: {
      chatHistory?: any[];
      quizAttempts?: any[];
      identifiedWeaknesses?: string[];
      codeSnippets?: any[];
    }
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/learning/modules/${moduleId}/complete`, {
      method: 'POST',
      body: sessionData ? JSON.stringify(sessionData) : undefined,
    });
  }

  async archiveSubject(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/learning/subjects/${id}/archive`, {
      method: 'PATCH',
    });
  }

  async deleteSubject(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/learning/subjects/${id}`, {
      method: 'DELETE',
    });
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();
export type { Resource, SearchResponse, CreateResourceRequest, AuthResponse, UrlReaderRequest, UrlReaderResponse, WebSearchRequest, WebSearchResponse };