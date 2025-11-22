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
        return <Video className="w-6 h-6 text-red-500" strokeWidth={1.5} />;
      case 'link':
        return <LinkIcon className="w-6 h-6 text-blue-500" strokeWidth={1.5} />;
      case 'document':
        return <FileText className="w-6 h-6 text-green-500" strokeWidth={1.5} />;
      case 'note':
      default:
        return <FileText className="w-6 h-6 text-gray-500" strokeWidth={1.5} />;
    }
  };

  const renderContent = () => {
    if (!resource) return null;

    switch (resource.type) {
      case 'video':
        return resource.fileUrl ? (
          <video
            src={resource.fileUrl}
            controls
            className="max-w-full max-h-96 rounded-lg"
          />
        ) : (
          <div className="text-gray-500 text-center py-8">Video not available</div>
        );
      case 'link':
        return (
          <div className="space-y-4">
            <a
              href={resource.content}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
              <span>Open Link</span>
            </a>
            <iframe
              src={resource.content}
              className="w-full h-64 border border-gray-300 rounded-lg"
              title={resource.title}
            />
          </div>
        );
      case 'document':
        return resource.fileUrl ? (
          <div className="text-center py-8">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" strokeWidth={1.5} />
            <p className="text-gray-600 mb-4">Document preview not available</p>
            <button
              onClick={handleDownload}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              <span>Download</span>
            </button>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">Document not available</div>
        );
      case 'note':
      default:
        return (
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="whitespace-pre-wrap text-sm text-gray-800">{resource.content}</pre>
          </div>
        );
    }
  };

  if (!isOpen || !resource) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getTypeIcon(resource.type)}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Edit Resource' : resource.title}
              </h2>
              <p className="text-sm text-gray-500 capitalize">{resource.type}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Edit"
                >
                  <Edit3 className="w-5 h-5" strokeWidth={1.5} />
                </button>

                <button
                  onClick={handleShare}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Share"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-500" strokeWidth={1.5} />
                  ) : (
                    <Share2 className="w-5 h-5" strokeWidth={1.5} />
                  )}
                </button>

                {resource.fileUrl && (
                  <button
                    onClick={handleDownload}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Download"
                  >
                    <Download className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                )}

                <div className="relative">
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>
              </>
            )}

            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editData.title || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editData.description || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editData.tags?.join(', ') || ''}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {resource.type === 'link' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL
                    </label>
                    <input
                      type="url"
                      value={editData.content || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {resource.type === 'note' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content
                    </label>
                    <textarea
                      rows={8}
                      value={editData.content || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Description */}
                {resource.description && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700">{resource.description}</p>
                  </div>
                )}

                {/* Content */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Content</h3>
                  {renderContent()}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Details</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        Created: {new Date(resource.createdAt).toLocaleDateString()}
                      </div>
                      {resource.updatedAt && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" strokeWidth={1.5} />
                          Updated: {new Date(resource.updatedAt).toLocaleDateString()}
                        </div>
                      )}
                      {resource.source && (
                        <div className="flex items-center text-sm text-gray-600">
                          <LinkIcon className="w-4 h-4 mr-2" strokeWidth={1.5} />
                          Source: {resource.source}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Tags</h3>
                    {resource.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {resource.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            <Tag className="w-3 h-3 mr-1" strokeWidth={1.5} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No tags</p>
                    )}
                  </div>
                </div>

                {/* Additional Metadata */}
                {resource.metadata && Object.keys(resource.metadata).length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Metadata</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
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
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center space-x-2"
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
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" strokeWidth={1.5} />
                <h3 className="text-lg font-semibold text-gray-900">Delete Resource</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete &quot;{resource.title}&quot;? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center space-x-2"
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