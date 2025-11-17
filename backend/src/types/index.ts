import {
  User,
  Resource,
  Tag,
  ResourceType,
  LearningSubject,
  LearningModule,
  LearningProgress,
  Assignment,
  AssignmentSubmission,
  WeakPoint,
  MindMap
} from '@prisma/client';

export {
  User,
  Resource,
  Tag,
  LearningSubject,
  LearningModule,
  LearningProgress,
  Assignment,
  AssignmentSubmission,
  WeakPoint,
  MindMap
};
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

// Learning API Types
export interface CreateLearningSubjectRequest {
  name: string;
  description?: string;
  goals?: string[];
}

export interface UpdateLearningSubjectRequest extends Partial<CreateLearningSubjectRequest> {
  id: string;
}

export interface CreateLearningModuleRequest {
  subject_id: string;
  title: string;
  description?: string;
  content?: string;
  order_index?: number;
  prerequisites?: string[];
  estimated_time?: number;
  difficulty?: string;
  is_optional?: boolean;
}

export interface UpdateLearningModuleRequest extends Partial<CreateLearningModuleRequest> {
  id: string;
}

export interface SubmitAssignmentRequest {
  assignment_id: string;
  content: string;
}

export interface LearningProgressResponse {
  subject: LearningSubject & {
    modules: (LearningModule & {
      progress?: LearningProgress;
      assignments: Assignment[];
    })[];
    progress: LearningProgress[];
  };
  overall_progress: {
    completed_modules: number;
    total_modules: number;
    percentage: number;
    time_spent: number;
    weak_points: WeakPoint[];
  };
}

export interface GenerateCourseRequest {
  subject_name: string;
  user_resources?: string[]; // resource IDs to analyze
  current_level?: string;
  goals?: string[];
}

export interface MindMapResponse {
  id: string;
  title: string;
  content: any; // JSON structure
  type: string;
  generated_at: Date;
}