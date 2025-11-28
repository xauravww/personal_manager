import React, { useMemo, useState, useEffect } from 'react';
import { FileText, Video, Link, Tag, Calendar, MoreVertical, Loader2 } from 'lucide-react';
import { apiClient, Resource as ApiResource } from '../api/client';
import ResourceDetailModal from './ResourceDetailModal';

interface Resource {
  id: string;
  title: string;
  type: 'note' | 'video' | 'link' | 'document';
  content: string;
  description?: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  source?: string;
  url?: string;
  fileUrl?: string;
  metadata?: Record<string, any>;
}

interface ResourceGridProps {
  currentPage?: number;
  itemsPerPage?: number;
  searchQuery?: string;
  typeFilter?: string;
  tagFilter?: string;
  sortBy?: string;
  onTotalChange?: (total: number) => void;
}

const ResourceGrid: React.FC<ResourceGridProps> = React.memo(({
  currentPage = 1,
  itemsPerPage = 12,
  searchQuery = '',
  typeFilter = 'all',
  tagFilter = 'all',
  sortBy = 'recent',
  onTotalChange
}) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch resources from API
  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      setError(null);

      try {
        let response;

        if (searchQuery.trim()) {
          // Use search API for search queries
          const params: any = {
            q: searchQuery.trim(),
            limit: itemsPerPage,
            offset: (currentPage - 1) * itemsPerPage,
          };

          if (typeFilter !== 'all') {
            params.type = typeFilter;
          }

          if (tagFilter !== 'all') {
            params.tags = tagFilter;
          }

          response = await apiClient.searchResources(params);
        } else {
          // Use regular resources API for browsing
          const params: any = {
            page: currentPage,
            limit: itemsPerPage,
          };

          if (typeFilter !== 'all') {
            params.type = typeFilter;
          }

          if (tagFilter !== 'all') {
            params.tags = tagFilter;
          }

          response = await apiClient.getResources(params);
        }

        if (response.success && response.data) {
          // Transform API response to component format
          const transformedResources: Resource[] = response.data.resources.map((resource: ApiResource) => ({
            id: resource.id,
            title: resource.title,
            type: resource.type as Resource['type'],
            content: resource.content || '',
            description: resource.description,
            tags: resource.tags.map(tag => tag.name),
            createdAt: resource.created_at,
            updatedAt: resource.updated_at,
            source: resource.url,
            url: resource.url,
            fileUrl: resource.file_path,
            metadata: resource.metadata,
          }));

          setResources(transformedResources);

          // Handle different response structures (SearchResponse vs standard list)
          let totalCount = 0;
          if ('total' in response.data) {
            totalCount = response.data.total;
          } else if ('pagination' in response.data) {
            totalCount = response.data.pagination.total;
          }

          setTotal(totalCount);
          onTotalChange?.(totalCount);
        } else {
          setError(response.error || 'Failed to fetch resources');
        }
      } catch (err) {
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [currentPage, itemsPerPage, searchQuery, typeFilter, tagFilter, onTotalChange]);

  // Sort resources (search is now server-side)
  const sortedResources = useMemo(() => {
    const sorted = [...resources];

    // Sort
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'a-z':
          return a.title.localeCompare(b.title);
        case 'z-a':
          return b.title.localeCompare(a.title);
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return sorted;
  }, [resources, sortBy]);

  // Resources are already paginated from server
  const paginatedResources = sortedResources;

  const totalPages = Math.ceil(total / itemsPerPage);

  const handleResourceClick = (resource: Resource) => {
    setSelectedResource(resource);
    setIsDetailModalOpen(true);
  };

  const handleResourceUpdate = async (id: string, updates: Partial<Resource>) => {
    try {
      // Transform updates to match API format
      const apiUpdates: any = {};
      if (updates.title) apiUpdates.title = updates.title;
      if (updates.description) apiUpdates.description = updates.description;
      if (updates.content) apiUpdates.content = updates.content;
      if (updates.tags) apiUpdates.tag_names = updates.tags;
      if (updates.source) apiUpdates.url = updates.source;
      if (updates.fileUrl) apiUpdates.file_path = updates.fileUrl;
      if (updates.metadata) apiUpdates.metadata = updates.metadata;

      await apiClient.updateResource(id, apiUpdates);

      // Refresh the current view
      window.location.reload();
    } catch (error) {
      console.error('Failed to update resource:', error);
      throw error;
    }
  };

  const handleResourceDelete = async (id: string) => {
    try {
      await apiClient.deleteResource(id);
      // Refresh the page to update the view
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete resource:', error);
      throw error;
    }
  };

  const getTypeIcon = (type: Resource['type']) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5 text-red-400" strokeWidth={1.5} />;
      case 'link':
        return <Link className="w-5 h-5 text-neon-blue" strokeWidth={1.5} />;
      case 'document':
        return <FileText className="w-5 h-5 text-neon-green" strokeWidth={1.5} />;
      case 'note':
      default:
        return <FileText className="w-5 h-5 text-starlight-400" strokeWidth={1.5} />;
    }
  };

  const getTypeColor = (type: Resource['type']) => {
    switch (type) {
      case 'video':
        return 'bg-void-900 border-red-500/10 hover:border-red-500/30 shadow-lg shadow-red-500/5 hover:shadow-red-500/10';
      case 'link':
        return 'bg-void-900 border-neon-blue/10 hover:border-neon-blue/30 shadow-lg shadow-neon-blue/5 hover:shadow-neon-blue/10';
      case 'document':
        return 'bg-void-900 border-neon-green/10 hover:border-neon-green/30 shadow-lg shadow-neon-green/5 hover:shadow-neon-green/10';
      case 'note':
      default:
        return 'bg-void-900 border-starlight-100/5 hover:border-starlight-100/20 shadow-lg shadow-void-950/50';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-neon-blue" strokeWidth={1.5} />
          <div className="absolute inset-0 rounded-full border-2 border-neon-blue/20 animate-pulse"></div>
        </div>
        <span className="mt-4 text-starlight-400 font-medium">Loading your resources...</span>
        <p className="mt-1 text-sm text-starlight-500">Please wait while we fetch your content</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-starlight-100 mb-2">Unable to load resources</h3>
        <p className="text-starlight-400 mb-6 max-w-md mx-auto">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 font-medium rounded-lg hover:bg-red-500/20 transition-colors duration-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-24 h-24 bg-void-900 rounded-full flex items-center justify-center mb-6 border border-starlight-100/10">
          <FileText className="w-12 h-12 text-starlight-600" strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-semibold text-starlight-100 mb-2">No resources found</h3>
        <p className="text-starlight-400 mb-6 max-w-md mx-auto">
          {searchQuery || typeFilter !== 'all' || tagFilter !== 'all'
            ? "Try adjusting your search or filters to find what you're looking for."
            : "Start building your knowledge base by adding your first resource."
          }
        </p>

      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedResources.map((resource) => (
          <div
            key={resource.id}
            onClick={() => handleResourceClick(resource)}
            className={`group rounded-2xl border shadow-lg hover:shadow-2xl transition-all duration-300 p-6 cursor-pointer transform hover:-translate-y-1 relative overflow-hidden ${getTypeColor(resource.type)}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Header */}
            <div className="relative flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-void-950/50 rounded-xl shadow-inner border border-starlight-100/5 group-hover:scale-110 transition-transform duration-300">
                  {getTypeIcon(resource.type)}
                </div>
                <span className="text-xs font-bold text-starlight-400 uppercase tracking-wider">
                  {resource.type}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleResourceClick(resource);
                }}
                className="opacity-0 group-hover:opacity-100 text-starlight-400 hover:text-starlight-100 transition-all duration-200 p-1.5 hover:bg-void-800 rounded-lg"
              >
                <MoreVertical className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Title */}
            <h3 className="relative text-lg font-bold text-starlight-100 mb-3 line-clamp-2 leading-tight group-hover:text-neon-blue transition-colors font-display">
              {resource.title}
            </h3>

            {/* Content Preview */}
            <p className="relative text-starlight-400 text-sm mb-5 line-clamp-3 leading-relaxed">
              {resource.content}
            </p>

            {/* Tags */}
            <div className="relative flex flex-wrap gap-2 mb-5">
              {resource.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-void-950/50 text-starlight-300 border border-starlight-100/5 group-hover:border-starlight-100/10 transition-colors"
                >
                  <Tag className="w-3 h-3 mr-1.5 opacity-70" strokeWidth={1.5} />
                  {tag}
                </span>
              ))}
              {resource.tags.length > 3 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-void-950/50 text-starlight-500 border border-starlight-100/5">
                  +{resource.tags.length - 3}
                </span>
              )}
            </div>

            {/* Footer */}
            <div className="relative flex items-center justify-between text-xs text-starlight-500 pt-4 border-t border-starlight-100/5">
              <div className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
                {new Date(resource.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
              {resource.source && (
                <span className="text-starlight-600 truncate max-w-[100px] hover:text-neon-blue transition-colors" title={resource.source}>
                  {new URL(resource.source).hostname.replace('www.', '')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>



      {/* Resource Detail Modal */}
      <ResourceDetailModal
        resource={selectedResource}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onUpdate={handleResourceUpdate}
        onDelete={handleResourceDelete}
      />
    </>
  );
});

ResourceGrid.displayName = 'ResourceGrid';

export default ResourceGrid;