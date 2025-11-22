import React, { useState, useRef } from 'react';
import { X, FileText, Link2, Upload, Loader2, Check, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';

type CaptureMode = 'text' | 'url' | 'file';
type CaptureState = 'idle' | 'processing' | 'success' | 'error';

interface NewResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const NewResourceModal: React.FC<NewResourceModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [mode, setMode] = useState<CaptureMode>('text');
  const [state, setState] = useState<CaptureState>('idle');
  const [textContent, setTextContent] = useState('');
  const [urlContent, setUrlContent] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextCapture = async () => {
    if (!textContent.trim()) return;

    setState('processing');
    setError('');

    try {
      const response = await apiClient.post('/capture/text', {
        content: textContent
      });
      setResult(response.data);
      setState('success');
      onSubmit(response.data);
      setTimeout(() => {
        setTextContent('');
        setState('idle');
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to capture text');
      setState('error');
    }
  };

  const handleUrlCapture = async () => {
    if (!urlContent.trim()) return;

    setState('processing');
    setError('');

    try {
      const response = await apiClient.post('/capture/url', {
        url: urlContent
      });
      setResult(response.data);
      setState('success');
      onSubmit(response.data);
      setTimeout(() => {
        setUrlContent('');
        setState('idle');
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to capture URL');
      setState('error');
    }
  };

  const handleFileCapture = async (file: File) => {
    setState('processing');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/capture/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
      setState('success');
      onSubmit(response.data);
      setTimeout(() => {
        setState('idle');
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to capture file');
      setState('error');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileCapture(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileCapture(e.target.files[0]);
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
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Add Resource</h2>
            <p className="text-sm text-slate-600 mt-1">Drop anything. AI does the rest.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 p-4 bg-slate-50 border-b border-slate-200">
          <button
            onClick={() => setMode('text')}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${mode === 'text'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Text
          </button>
          <button
            onClick={() => setMode('url')}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${mode === 'url'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
          >
            <Link2 className="w-4 h-4 inline mr-2" />
            URL
          </button>
          <button
            onClick={() => setMode('file')}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${mode === 'file'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            File
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {mode === 'text' && (
            <div>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste text, code, notes, or anything..."
                className="w-full h-48 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                disabled={state === 'processing'}
              />
              <button
                onClick={handleTextCapture}
                disabled={!textContent.trim() || state === 'processing'}
                className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {state === 'processing' ? (
                  <><Loader2 className="w-5 h-5 inline mr-2 animate-spin" /> Analyzing...</>
                ) : (
                  'Capture Text'
                )}
              </button>
            </div>
          )}

          {mode === 'url' && (
            <div>
              <input
                type="url"
                value={urlContent}
                onChange={(e) => setUrlContent(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                disabled={state === 'processing'}
              />
              <button
                onClick={handleUrlCapture}
                disabled={!urlContent.trim() || state === 'processing'}
                className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {state === 'processing' ? (
                  <><Loader2 className="w-5 h-5 inline mr-2 animate-spin" /> Fetching...</>
                ) : (
                  'Capture URL'
                )}
              </button>
            </div>
          )}

          {mode === 'file' && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-slate-400'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileInput}
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                className="hidden"
              />
              <Upload className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <p className="text-lg font-medium text-slate-700 mb-2">
                {dragActive ? 'Drop it here!' : 'Drag & drop file here'}
              </p>
              <p className="text-sm text-slate-500 mb-4">PDF, DOC, DOCX, TXT, PNG, JPG (max 10MB)</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={state === 'processing'}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {state === 'processing' ? 'Processing...' : 'Browse Files'}
              </button>
            </div>
          )}

          {/* State Messages */}
          {state === 'success' && result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                <Check className="w-5 h-5" />
                Successfully captured!
              </div>
              <p className="text-sm text-green-600">
                <strong>Title:</strong> {result.metadata?.title || result.resource?.title}
              </p>
              <div className="flex gap-2 mt-2">
                {(result.metadata?.tags || result.resource?.tags || []).slice(0, 3).map((tag: any, i: number) => (
                  <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    {typeof tag === 'string' ? tag : tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2 text-red-700 font-medium">
                <AlertCircle className="w-5 h-5" />
                {error || 'Something went wrong'}
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs font-semibold text-purple-900">Auto-Tagging</p>
              <p className="text-xs text-purple-700">AI generates tags</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-900">Instant Search</p>
              <p className="text-xs text-blue-700">Searchable now</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-green-900">Smart Storage</p>
              <p className="text-xs text-green-700">Auto-organized</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewResourceModal;