import React, { useState, useRef } from 'react';
import {
  Upload,
  Link,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  UploadCloud
} from 'lucide-react';

type ResourceType = 'file' | 'url' | 'note';

interface UploadData {
  title: string;
  description: string;
  tags: string[];
  metadata: Record<string, any>;
  files?: File[];
  url?: string;
  note?: string;
}

const UploadForm: React.FC = () => {
  const [resourceType, setResourceType] = useState<ResourceType>('file');
  const [uploadData, setUploadData] = useState<UploadData>({
    title: '',
    description: '',
    tags: [],
    metadata: {}
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: keyof UploadData, value: any) => {
    setUploadData(prev => ({ ...prev, [field]: value }));
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
    setUploadData(prev => ({ ...prev, tags }));
  };

  const handleMetadataChange = (metadataString: string) => {
    try {
      const metadata = metadataString ? JSON.parse(metadataString) : {};
      setUploadData(prev => ({ ...prev, metadata }));
      setError('');
    } catch {
      setError('Invalid JSON in metadata');
    }
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
    setUploadData(prev => ({ ...prev, files: validFiles }));
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setUploadData(prev => ({ ...prev, files: newFiles }));
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
    setSuccess(false);

    // Validation
    if (!uploadData.title) {
      setError('Title is required');
      return;
    }

    if (resourceType === 'url' && !uploadData.url) {
      setError('URL is required');
      return;
    }

    if (resourceType === 'note' && !uploadData.note) {
      setError('Text note is required');
      return;
    }

    if (resourceType === 'file' && selectedFiles.length === 0) {
      setError('At least one file is required');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsUploading(false);
          setSuccess(true);
          // Reset form after success
          setTimeout(() => {
            setUploadData({
              title: '',
              description: '',
              tags: [],
              metadata: {}
            });
            setSelectedFiles([]);
            setSuccess(false);
          }, 3000);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const renderFilePreview = (file: File) => {
    if (file.type.startsWith('video/')) {
      return <video src={URL.createObjectURL(file)} controls className="max-w-full max-h-32 rounded" />;
    }
    return <div className="text-gray-500 text-sm">Preview not available</div>;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Upload Resource</h1>
        <p className="text-gray-600">Add a new resource to your personal collection</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        {/* Resource Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Resource Type</label>
          <div className="flex space-x-6">
            {[
              { value: 'file', label: 'File', icon: Upload },
              { value: 'url', label: 'URL', icon: Link },
              { value: 'note', label: 'Text Note', icon: FileText }
            ].map(({ value, label, icon: Icon }) => (
              <label key={value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="resourceType"
                  value={value}
                  checked={resourceType === value}
                  onChange={(e) => setResourceType(e.target.value as ResourceType)}
                  className="mr-2"
                />
                <Icon className="w-4 h-4 mr-2 text-gray-500" strokeWidth={1.5} />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={uploadData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={uploadData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            value={uploadData.tags.join(', ')}
            onChange={(e) => handleTagsChange(e.target.value)}
            placeholder="e.g., work, personal, urgent"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Metadata */}
        <div>
          <label htmlFor="metadata" className="block text-sm font-medium text-gray-700 mb-2">
            Metadata (JSON)
          </label>
          <textarea
            id="metadata"
            rows={2}
            value={JSON.stringify(uploadData.metadata, null, 2)}
            onChange={(e) => handleMetadataChange(e.target.value)}
            placeholder='{"key": "value"}'
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
        </div>

        {/* File Upload Section */}
        {resourceType === 'file' && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">File Upload</label>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <UploadCloud className="w-12 h-12 mx-auto mb-4 text-gray-400" strokeWidth={1.5} />
              <p className="text-gray-600 mb-2">Drag and drop files here or click to select</p>
              <p className="text-sm text-gray-500">Supports videos, documents (max 10MB each)</p>
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
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* File Preview */}
            {selectedFiles.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
                {renderFilePreview(selectedFiles[0])}
              </div>
            )}
          </div>
        )}

        {/* URL Section */}
        {resourceType === 'url' && (
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              URL *
            </label>
            <input
              type="url"
              id="url"
              value={uploadData.url || ''}
              onChange={(e) => handleInputChange('url', e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {uploadData.url && (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
                <iframe
                  src={uploadData.url}
                  className="w-full h-32 border border-gray-300 rounded"
                  title="URL Preview"
                />
              </div>
            )}
          </div>
        )}

        {/* Note Section */}
        {resourceType === 'note' && (
          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
              Text Note *
            </label>
            <textarea
              id="note"
              rows={5}
              value={uploadData.note || ''}
              onChange={(e) => handleInputChange('note', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {uploadData.note && (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
                <pre className="whitespace-pre-wrap text-sm text-gray-800">{uploadData.note}</pre>
              </div>
            )}
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 text-center">Uploading... {uploadProgress}%</p>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-sm">Resource uploaded successfully!</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isUploading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
          ) : (
            <Upload className="w-4 h-4" strokeWidth={1.5} />
          )}
          <span>{isUploading ? 'Uploading...' : 'Upload Resource'}</span>
        </button>
      </form>
    </div>
  );
};

export default UploadForm;