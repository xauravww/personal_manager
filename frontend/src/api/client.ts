// API Client for Personal Resource Manager Backend

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

  // Fallback to base URL + /api
  return `${apiBaseUrl || 'http://localhost:3001'}/api`;
};

const API_BASE_URL = getApiBaseUrl();

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
  type: 'note' | 'video' | 'link' | 'document' | 'image';
  content?: string;
  file_path?: string;
  metadata?: Record<string, any>;
  tags: { id: string; name: string }[];
  created_at: string;
  updated_at: string;
}

interface SearchResponse {
  resources: Resource[];
  total: number;
  has_more: boolean;
}

interface CreateResourceRequest {
  title: string;
  description?: string;
  url?: string;
  type: 'note' | 'video' | 'link' | 'document' | 'image';
  content?: string;
  file_path?: string;
  metadata?: Record<string, any>;
  tag_names?: string[];
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
      const data = await response.json();

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
  }): Promise<ApiResponse<SearchResponse>> {
    const searchParams = new URLSearchParams();

    if (params.q) searchParams.set('q', params.q);
    if (params.type) searchParams.set('type', params.type);
    if (params.tags) searchParams.set('tags', params.tags);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());

    return this.request(`/search?${searchParams.toString()}`);
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
}

// Create and export a singleton instance
export const apiClient = new ApiClient();
export type { Resource, SearchResponse, CreateResourceRequest, AuthResponse };