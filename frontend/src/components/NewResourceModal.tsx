import React, { useState, useRef } from 'react';
import { X, Upload, Link, FileText, Loader2, UploadCloud, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { apiClient } from '../api/client';

interface NewResourceData {
  title: string;
  description: string;
  type: 'note' | 'video' | 'link' | 'document' | 'file';
  tags: string[];
  content: string;
  source?: string;
  files?: File[];
}

interface NewResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewResourceData) => void;
}

const NewResourceModal: React.FC<NewResourceModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<NewResourceData>({
    title: '',
    description: '',
    type: 'note',
    tags: [],
    content: '',
    source: '',
    files: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiResults, setAiResults] = useState<{
    summary?: string;
    suggestedTags?: string[];
  } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: keyof NewResourceData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Reset AI results if content changes significantly
    if (field === 'content' && aiResults) {
      setAiResults(null);
    }
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData(prev => ({ ...prev, tags }));
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError(`File ${file.name} exceeds 10MB limit`);
        return false;
      }
      const allowedTypes = ['video/', 'audio/', 'application/pdf', 'text/'];
      if (!allowedTypes.some(type => file.type.startsWith(type))) {
        setError(`File type ${file.type} not allowed for ${file.name}`);
        return false;
      }
      return true;
    });

    setSelectedFiles(validFiles);
    setFormData(prev => ({ ...prev, files: validFiles }));
    setError('');
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setFormData(prev => ({ ...prev, files: newFiles }));
  };

  const processContentWithAI = async () => {
    if (!formData.content || formData.content.length < 50) return;

    setIsAIProcessing(true);
    try {
      // For now, we'll simulate AI processing since we don't have a direct AI endpoint in frontend
      // In a real implementation, you'd call an AI service here
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

      // Mock AI results - in real implementation, this would come from the AI service
      const mockSummary = formData.content.length > 100
        ? formData.content.substring(0, 100) + "..."
        : formData.content;

      const mockTags = ["ai-processed", "content", "resource"];

      setAiResults({
        summary: mockSummary,
        suggestedTags: mockTags
      });
    } catch (error) {
      console.error('AI processing failed:', error);
    } finally {
      setIsAIProcessing(false);
    }
  };

  const applyAISuggestions = () => {
    if (!aiResults) return;

    if (aiResults.summary && !formData.description) {
      handleInputChange('description', aiResults.summary);
    }

    if (aiResults.suggestedTags && formData.tags.length === 0) {
      const combinedTags = [...formData.tags, ...aiResults.suggestedTags];
      setFormData(prev => ({ ...prev, tags: combinedTags }));
    }

    setAiResults(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title) {
      setError('Title is required');
      return;
    }

    if (formData.type === 'file' && selectedFiles.length === 0) {
      setError('At least one file is required');
      return;
    }

    if (formData.type !== 'file' && formData.type !== 'note' && !formData.content) {
      setError('Content is required');
      return;
    }

    if (formData.type === 'note' && !formData.content) {
      setError('Note content is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Transform form data to API format
      const resourceData = {
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type === 'file' ? 'document' : formData.type, // Map 'file' to 'document' for API
        content: formData.type === 'note' ? formData.content : undefined,
        url: (formData.type !== 'note' && formData.type !== 'file') ? formData.content : undefined,
        tag_names: formData.tags,
        metadata: formData.source ? { source: formData.source } : undefined
      };

      const response = await apiClient.createResource(resourceData);

      if (response.success) {
        onSubmit(formData);
        // Reset form
        setFormData({
          title: '',
          description: '',
          type: 'note',
          tags: [],
          content: '',
          source: '',
          files: []
        });
        setSelectedFiles([]);
        setError('');
      } else {
        setError(`Failed to create resource: ${response.error}`);
      }
    } catch (error) {
      setError('An error occurred while creating the resource');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <UploadCloud className="w-4 h-4" strokeWidth={1.5} />;
      case 'video':
        return <Upload className="w-4 h-4" strokeWidth={1.5} />;
      case 'link':
        return <Link className="w-4 h-4" strokeWidth={1.5} />;
      case 'document':
        return <Upload className="w-4 h-4" strokeWidth={1.5} />;
      case 'note':
      default:
        return <FileText className="w-4 h-4" strokeWidth={1.5} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add New Resource</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter resource title"
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resource Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'note', label: 'Text Note' },
                { value: 'file', label: 'File Upload' },
                { value: 'link', label: 'Link' },
                { value: 'document', label: 'Document' },
                { value: 'video', label: 'Video' }
              ].map(({ value, label }) => (
                <label key={value} className="flex items-center">
                  <input
                    type="radio"
                    name="type"
                    value={value}
                    checked={formData.type === value}
                    onChange={(e) => handleInputChange('type', e.target.value as NewResourceData['type'])}
                    className="mr-2"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Content */}
          {formData.type === 'file' ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">File Upload *</label>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <UploadCloud className="w-8 h-8 mx-auto mb-2 text-gray-400" strokeWidth={1.5} />
                <p className="text-sm text-gray-600 mb-1">Drag and drop files here or click to select</p>
                <p className="text-xs text-gray-500">Supports videos, documents (max 10MB each)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* File List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm">
                          <p className="font-medium">{file.name}</p>
                          <p className="text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Content *
              </label>
              {formData.type === 'note' ? (
                <textarea
                  id="content"
                  rows={6}
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your note content..."
                  required
                />
              ) : (
                <input
                  type={formData.type === 'link' ? 'url' : 'text'}
                  id="content"
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={
                    formData.type === 'link'
                      ? 'https://example.com'
                      : formData.type === 'document'
                      ? 'Document URL or file path'
                      : 'Resource URL or content'
                  }
                  required
                />
              )}

              {/* Character Count Indicator */}
              <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                <span>{formData.content.length} characters</span>
                <span className={formData.content.length >= 50 ? 'text-green-600' : 'text-gray-400'}>
                  {formData.content.length >= 50 ? '✓ AI ready' : `${50 - formData.content.length} more for AI`}
                </span>
              </div>
            </div>
          )}

          {/* AI Processing */}
          {formData.type !== 'file' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={processContentWithAI}
                disabled={!formData.content || formData.content.length < 50 || isAIProcessing || !!aiResults}
                title={!formData.content || formData.content.length < 50 ? "Enter at least 50 characters of content" : "Process content with AI to generate summary and tags"}
                className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
                  !formData.content || formData.content.length < 50
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 cursor-pointer'
                }`}
              >
                <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-sm font-medium">Process with AI</span>
                <span className="text-xs text-purple-600">Generate summary & tags</span>
              </button>

              {isAIProcessing && (
                <div className="flex items-center space-x-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-medium text-purple-700">AI Processing...</p>
                    <p className="text-xs text-purple-600">Analyzing content for summary and tags</p>
                  </div>
                </div>
              )}

              {aiResults && (
                <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" strokeWidth={1.5} />
                      <span className="text-sm font-medium text-green-700">AI Analysis Complete</span>
                    </div>
                    <button
                      type="button"
                      onClick={applyAISuggestions}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                    >
                      Apply All
                    </button>
                  </div>

                  {aiResults.summary && (
                    <div>
                      <p className="text-xs font-medium text-green-700 mb-1">AI-Generated Summary:</p>
                      <p className="text-sm text-gray-700 bg-white p-2 rounded border italic">{aiResults.summary}</p>
                    </div>
                  )}

                  {aiResults.suggestedTags && aiResults.suggestedTags.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-700 mb-1">Suggested Tags:</p>
                      <div className="flex flex-wrap gap-1">
                        {aiResults.suggestedTags.map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional description..."
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="tags"
              value={formData.tags.join(', ')}
              onChange={(e) => handleTagsChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., work, personal, important"
            />
          </div>

          {/* Source */}
          <div>
            <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-2">
              Source
            </label>
            <input
              type="text"
              id="source"
              value={formData.source}
              onChange={(e) => handleInputChange('source', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., YouTube, MDN, Personal Notes"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              ) : (
                getTypeIcon(formData.type)
              )}
              <span>{isSubmitting ? 'Adding...' : 'Add Resource'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewResourceModal;