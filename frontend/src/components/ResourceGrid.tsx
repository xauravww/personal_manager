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
            fileUrl: resource.file_path,
            metadata: resource.metadata,
          }));

          setResources(transformedResources);
          const totalCount = searchQuery.trim() ? response.data.total : response.data.pagination.total;
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
        return <Video className="w-5 h-5 text-red-500" strokeWidth={1.5} />;
      case 'link':
        return <Link className="w-5 h-5 text-blue-500" strokeWidth={1.5} />;
      case 'document':
        return <FileText className="w-5 h-5 text-green-500" strokeWidth={1.5} />;
      case 'note':
      default:
        return <FileText className="w-5 h-5 text-gray-500" strokeWidth={1.5} />;
    }
  };

  const getTypeColor = (type: Resource['type']) => {
    switch (type) {
      case 'video':
        return 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:from-red-100 hover:to-red-150';
      case 'link':
        return 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-150';
      case 'document':
        return 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:from-green-100 hover:to-green-150';
      case 'note':
      default:
        return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 hover:from-gray-100 hover:to-gray-150';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600" strokeWidth={1.5} />
          <div className="absolute inset-0 rounded-full border-2 border-primary-100 animate-pulse"></div>
        </div>
        <span className="mt-4 text-gray-600 font-medium">Loading your resources...</span>
        <p className="mt-1 text-sm text-gray-500">Please wait while we fetch your content</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to load resources</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <FileText className="w-12 h-12 text-gray-400" strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No resources found</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
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
          className={`group bg-white rounded-xl border ${getTypeColor(resource.type)} shadow-sm hover:shadow-xl transition-all duration-300 p-6 cursor-pointer transform hover:-translate-y-1`}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  {getTypeIcon(resource.type)}
                </div>
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {resource.type}
                </span>
              </div>
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 handleResourceClick(resource);
               }}
               className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity duration-200 p-1 hover:bg-gray-100 rounded"
             >
                 <MoreVertical className="w-4 h-4" strokeWidth={1.5} />
             </button>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 leading-tight">
              {resource.title}
            </h3>

            {/* Content Preview */}
            <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
              {resource.content}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {resource.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200 shadow-sm"
                >
                  <Tag className="w-3 h-3 mr-1" strokeWidth={1.5} />
                  {tag}
                </span>
              ))}
              {resource.tags.length > 3 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  +{resource.tags.length - 3}
                </span>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" strokeWidth={1.5} />
                {new Date(resource.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
              {resource.source && (
                <span className="text-gray-400 truncate max-w-24" title={resource.source}>
                  {resource.source}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Results Summary */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          Showing <span className="font-medium text-gray-900">{paginatedResources.length}</span> of{' '}
          <span className="font-medium text-gray-900">{total}</span> resources
          {total > itemsPerPage && (
            <span className="ml-1">
              • Page <span className="font-medium text-gray-900">{currentPage}</span> of{' '}
              <span className="font-medium text-gray-900">{totalPages}</span>
            </span>
          )}
        </p>
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