import { User, Resource, Tag, ResourceType } from '@prisma/client';

export { User, Resource, Tag };
export type { ResourceType };

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  category?: string;
  publishedDate?: string;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  token: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateResourceRequest {
  title: string;
  description?: string;
  url?: string;
  type: ResourceType;
  content?: string;
  file_path?: string;
  metadata?: Record<string, any>;
  tag_names?: string[];
}

export interface UpdateResourceRequest extends Partial<CreateResourceRequest> {
  id: string;
}

export interface SearchRequest {
  query?: string;
  type?: ResourceType;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  resources: (Resource & { tags: Pick<Tag, 'id' | 'name'>[] })[];
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
  };
}