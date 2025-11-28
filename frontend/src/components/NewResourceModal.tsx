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
        className="absolute inset-0 bg-void-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-void-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-starlight-100/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-starlight-100/10">
          <div>
            <h2 className="text-2xl font-bold text-starlight-100 font-display">Add Resource</h2>
            <p className="text-sm text-starlight-400 mt-1">Drop anything. AI does the rest.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-starlight-500 hover:text-starlight-100 hover:bg-void-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 p-4 bg-void-950/50 border-b border-starlight-100/10">
          <button
            onClick={() => setMode('text')}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${mode === 'text'
              ? 'bg-neon-blue text-white shadow-lg shadow-neon-blue/20'
              : 'bg-void-900 text-starlight-400 hover:bg-void-800 hover:text-starlight-100 border border-starlight-100/5'
              }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Text
          </button>
          <button
            onClick={() => setMode('url')}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${mode === 'url'
              ? 'bg-neon-blue text-white shadow-lg shadow-neon-blue/20'
              : 'bg-void-900 text-starlight-400 hover:bg-void-800 hover:text-starlight-100 border border-starlight-100/5'
              }`}
          >
            <Link2 className="w-4 h-4 inline mr-2" />
            URL
          </button>
          <button
            onClick={() => setMode('file')}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${mode === 'file'
              ? 'bg-neon-blue text-white shadow-lg shadow-neon-blue/20'
              : 'bg-void-900 text-starlight-400 hover:bg-void-800 hover:text-starlight-100 border border-starlight-100/5'
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
                className="w-full h-48 p-4 bg-void-950 border border-starlight-100/10 rounded-xl focus:ring-2 focus:ring-neon-blue/50 focus:border-transparent resize-none font-mono text-sm text-starlight-100 placeholder-starlight-600"
                disabled={state === 'processing'}
              />
              <button
                onClick={handleTextCapture}
                disabled={!textContent.trim() || state === 'processing'}
                className="mt-4 w-full bg-neon-blue text-white py-3 rounded-xl font-medium hover:bg-neon-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-neon-blue/20"
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
                className="w-full p-4 bg-void-950 border border-starlight-100/10 rounded-xl focus:ring-2 focus:ring-neon-blue/50 focus:border-transparent text-lg text-starlight-100 placeholder-starlight-600"
                disabled={state === 'processing'}
              />
              <button
                onClick={handleUrlCapture}
                disabled={!urlContent.trim() || state === 'processing'}
                className="mt-4 w-full bg-neon-blue text-white py-3 rounded-xl font-medium hover:bg-neon-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-neon-blue/20"
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
                ? 'border-neon-blue bg-neon-blue/10'
                : 'border-starlight-100/10 hover:border-starlight-100/30 hover:bg-void-950'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileInput}
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                className="hidden"
              />
              <Upload className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-neon-blue' : 'text-starlight-500'}`} />
              <p className="text-lg font-medium text-starlight-200 mb-2">
                {dragActive ? 'Drop it here!' : 'Drag & drop file here'}
              </p>
              <p className="text-sm text-starlight-500 mb-4">PDF, DOC, DOCX, TXT, PNG, JPG (max 10MB)</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={state === 'processing'}
                className="px-6 py-2 bg-starlight-100 text-void-950 rounded-lg hover:bg-white transition-all disabled:opacity-50 font-medium"
              >
                {state === 'processing' ? 'Processing...' : 'Browse Files'}
              </button>
            </div>
          )}

          {/* State Messages */}
          {state === 'success' && result && (
            <div className="mt-4 p-4 bg-neon-green/10 border border-neon-green/20 rounded-xl">
              <div className="flex items-center gap-2 text-neon-green font-medium mb-2">
                <Check className="w-5 h-5" />
                Successfully captured!
              </div>
              <p className="text-sm text-starlight-300">
                <strong>Title:</strong> {result.metadata?.title || result.resource?.title}
              </p>
              <div className="flex gap-2 mt-2">
                {(result.metadata?.tags || result.resource?.tags || []).slice(0, 3).map((tag: any, i: number) => (
                  <span key={i} className="px-2 py-1 bg-neon-green/20 text-neon-green rounded text-xs border border-neon-green/30">
                    {typeof tag === 'string' ? tag : tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-red-400 font-medium">
                <AlertCircle className="w-5 h-5" />
                {error || 'Something went wrong'}
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-4 bg-void-950/50 border-t border-starlight-100/10">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs font-semibold text-neon-purple">Auto-Tagging</p>
              <p className="text-xs text-starlight-500">AI generates tags</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-neon-blue">Instant Search</p>
              <p className="text-xs text-starlight-500">Searchable now</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-neon-green">Smart Storage</p>
              <p className="text-xs text-starlight-500">Auto-organized</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewResourceModal;