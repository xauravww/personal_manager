import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Edit3,
  Trash2,
  Share2,
  Download,
  Check,
  Calendar,
  Tag,
  Link as LinkIcon,
  FileText,
  Video,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Save
} from 'lucide-react';
import InstagramVideoPlayer from './InstagramVideoPlayer';

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

interface ResourceDetailModalProps {
  resource: Resource | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Resource>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({
  resource,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editData, setEditData] = useState<Partial<Resource>>({});
  const [copied, setCopied] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resource) {
      setEditData(resource);
    }
  }, [resource]);

  const handleClose = useCallback(() => {
    if (isEditing) {
      setIsEditing(false);
    } else {
      onClose();
    }
  }, [isEditing, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleClose]);

  const handleSave = async () => {
    if (!resource) return;

    setIsLoading(true);
    try {
      await onUpdate(resource.id, editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update resource:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!resource) return;

    setIsLoading(true);
    try {
      await onDelete(resource.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete resource:', error);
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleShare = async () => {
    if (!resource) return;

    const shareData = {
      title: resource.title,
      text: resource.description || resource.content,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copy URL
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!resource?.fileUrl) return;

    const link = document.createElement('a');
    link.href = resource.fileUrl;
    link.download = resource.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeIcon = (type: Resource['type']) => {
    switch (type) {
      case 'video':
        return <Video className="w-6 h-6 text-red-400" strokeWidth={1.5} />;
      case 'link':
        return <LinkIcon className="w-6 h-6 text-neon-blue" strokeWidth={1.5} />;
      case 'document':
        return <FileText className="w-6 h-6 text-neon-green" strokeWidth={1.5} />;
      case 'note':
      default:
        return <FileText className="w-6 h-6 text-starlight-400" strokeWidth={1.5} />;
    }
  };

  const renderContent = () => {
    if (!resource) return null;

    switch (resource.type) {
      case 'video':
        return (
          <InstagramVideoPlayer
            resource={resource}
            videoUrl={videoUrl}
            videoLoading={videoLoading}
            videoError={videoError}
            onLoadVideo={handleLoadInstagramVideo}
          />
        );
      case 'link':
        return (
          <div className="space-y-4">
            <a
              href={resource.content}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-neon-blue hover:text-neon-blue/80 transition-colors"
            >
              <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
              <span>Open Link</span>
            </a>
            <iframe
              src={resource.content}
              className="w-full h-64 border border-starlight-100/10 rounded-lg bg-void-950"
              title={resource.title}
            />
          </div>
        );
      case 'document':
        return resource.fileUrl ? (
          <div className="text-center py-8">
            <FileText className="w-16 h-16 mx-auto text-starlight-500 mb-4" strokeWidth={1.5} />
            <p className="text-starlight-400 mb-4">Document preview not available</p>
            <button
              onClick={handleDownload}
              className="inline-flex items-center space-x-2 bg-neon-blue text-white px-4 py-2 rounded-lg hover:bg-neon-blue/90 transition-colors shadow-lg shadow-neon-blue/20"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              <span>Download</span>
            </button>
          </div>
        ) : (
          <div className="text-starlight-500 text-center py-8">Document not available</div>
        );
      case 'note':
      default:
        return (
          <div className="bg-void-950 p-4 rounded-lg border border-starlight-100/10">
            <pre className="whitespace-pre-wrap text-sm text-starlight-200 font-mono">{resource.content}</pre>
          </div>
        );
    }
  };

  const isInstagramVideo = (url?: string) => {
    return url && url.includes('instagram.com');
  };

  const handleLoadInstagramVideo = async () => {
    if (!resource || videoUrl || videoLoading) return;

    setVideoLoading(true);
    setVideoError(null);

    try {
      const { apiClient } = await import('../api/client');
      const response = await apiClient.getInstagramVideoUrl(resource.id);

      if (response.success && response.data) {
        setVideoUrl(response.data.videoUrl);
      } else {
        setVideoError(response.error || 'Failed to load video');
      }
    } catch (error: any) {
      setVideoError(error.message || 'Failed to load video');
    } finally {
      setVideoLoading(false);
    }
  };

  if (!isOpen || !resource) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-void-950/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-void-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-starlight-100/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-starlight-100/10">
          <div className="flex items-center space-x-3">
            {getTypeIcon(resource.type)}
            <div>
              <h2 className="text-xl font-semibold text-starlight-100">
                {isEditing ? 'Edit Resource' : resource.title}
              </h2>
              <p className="text-sm text-starlight-400 capitalize">{resource.type}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-starlight-400 hover:text-starlight-100 hover:bg-void-800 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit3 className="w-5 h-5" strokeWidth={1.5} />
                </button>

                <button
                  onClick={handleShare}
                  className="p-2 text-starlight-400 hover:text-starlight-100 hover:bg-void-800 rounded-lg transition-colors"
                  title="Share"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-neon-green" strokeWidth={1.5} />
                  ) : (
                    <Share2 className="w-5 h-5" strokeWidth={1.5} />
                  )}
                </button>

                {resource.fileUrl && (
                  <button
                    onClick={handleDownload}
                    className="p-2 text-starlight-400 hover:text-starlight-100 hover:bg-void-800 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                )}

                <div className="relative">
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 text-starlight-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>
              </>
            )}

            <button
              onClick={handleClose}
              className="p-2 text-starlight-400 hover:text-starlight-100 hover:bg-void-800 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-starlight-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editData.title || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-void-950 border border-starlight-100/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-blue/50 text-starlight-100 placeholder-starlight-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-starlight-300 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editData.description || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-void-950 border border-starlight-100/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-blue/50 text-starlight-100 placeholder-starlight-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-starlight-300 mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editData.tags?.join(', ') || ''}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                    }))}
                    className="w-full px-3 py-2 bg-void-950 border border-starlight-100/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-blue/50 text-starlight-100 placeholder-starlight-600"
                  />
                </div>

                {resource.type === 'link' && (
                  <div>
                    <label className="block text-sm font-medium text-starlight-300 mb-2">
                      URL
                    </label>
                    <input
                      type="url"
                      value={editData.content || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full px-3 py-2 bg-void-950 border border-starlight-100/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-blue/50 text-starlight-100 placeholder-starlight-600"
                    />
                  </div>
                )}

                {resource.type === 'note' && (
                  <div>
                    <label className="block text-sm font-medium text-starlight-300 mb-2">
                      Content
                    </label>
                    <textarea
                      rows={8}
                      value={editData.content || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full px-3 py-2 bg-void-950 border border-starlight-100/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-blue/50 text-starlight-100 placeholder-starlight-600"
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Description */}
                {resource.description && (
                  <div>
                    <h3 className="text-lg font-medium text-starlight-100 mb-2">Description</h3>
                    <p className="text-starlight-300">{resource.description}</p>
                  </div>
                )}

                {/* Content */}
                <div>
                  <h3 className="text-lg font-medium text-starlight-100 mb-2">Content</h3>
                  {renderContent()}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-starlight-100 mb-3">Details</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-starlight-400">
                        <Calendar className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        Created: {new Date(resource.createdAt).toLocaleDateString()}
                      </div>
                      {resource.updatedAt && (
                        <div className="flex items-center text-sm text-starlight-400">
                          <Calendar className="w-4 h-4 mr-2" strokeWidth={1.5} />
                          Updated: {new Date(resource.updatedAt).toLocaleDateString()}
                        </div>
                      )}
                      {resource.source && (
                        <div className="flex items-center text-sm text-starlight-400">
                          <LinkIcon className="w-4 h-4 mr-2" strokeWidth={1.5} />
                          Source: {resource.source}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-starlight-100 mb-3">Tags</h3>
                    {resource.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {resource.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neon-blue/10 text-neon-blue border border-neon-blue/20"
                          >
                            <Tag className="w-3 h-3 mr-1" strokeWidth={1.5} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-starlight-500">No tags</p>
                    )}
                  </div>
                </div>

                {/* Additional Metadata */}
                {resource.metadata && Object.keys(resource.metadata).length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-starlight-100 mb-3">Metadata</h3>
                    <div className="bg-void-950 p-4 rounded-lg border border-starlight-100/10">
                      <pre className="text-sm text-starlight-300 whitespace-pre-wrap">
                        {JSON.stringify(resource.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-starlight-100/10">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-starlight-300 bg-void-800 hover:bg-void-700 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-neon-blue text-white hover:bg-neon-blue/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-neon-blue/20"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              ) : (
                <Save className="w-4 h-4" strokeWidth={1.5} />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-void-900 rounded-xl p-6 max-w-md w-full border border-starlight-100/10 shadow-2xl">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" strokeWidth={1.5} />
                <h3 className="text-lg font-semibold text-starlight-100">Delete Resource</h3>
              </div>
              <p className="text-starlight-300 mb-6">
                Are you sure you want to delete &quot;{resource.title}&quot;? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-starlight-300 bg-void-800 hover:bg-void-700 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-red-500/20"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  )}
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceDetailModal;