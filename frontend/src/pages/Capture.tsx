import React, { useState, useRef } from 'react';
import { Upload, Link2, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';
import DashboardLayout from '../components/layout/DashboardLayout';

type CaptureMode = 'text' | 'url' | 'file';
type CaptureState = 'idle' | 'processing' | 'success' | 'error';

const Capture: React.FC = () => {
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
            setTimeout(() => {
                setTextContent('');
                setState('idle');
            }, 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to capture text');
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
            setTimeout(() => {
                setUrlContent('');
                setState('idle');
            }, 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to capture URL');
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
            setTimeout(() => {
                setState('idle');
            }, 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to capture file');
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

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto p-6">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">Universal Capture</h1>
                    <p className="text-xl text-slate-600">Drop anything. AI does the rest.</p>
                </div>

                {/* Mode Selector */}
                <div className="flex gap-3 mb-6 justify-center">
                    <button
                        onClick={() => setMode('text')}
                        className={`px-6 py-3 rounded-xl font-medium transition-all ${mode === 'text'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                    >
                        <FileText className="w-5 h-5 inline mr-2" />
                        Text
                    </button>
                    <button
                        onClick={() => setMode('url')}
                        className={`px-6 py-3 rounded-xl font-medium transition-all ${mode === 'url'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                    >
                        <Link2 className="w-5 h-5 inline mr-2" />
                        URL
                    </button>
                    <button
                        onClick={() => setMode('file')}
                        className={`px-6 py-3 rounded-xl font-medium transition-all ${mode === 'file'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                    >
                        <Upload className="w-5 h-5 inline mr-2" />
                        File
                    </button>
                </div>

                {/* Capture Area */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                    {mode === 'text' && (
                        <div>
                            <textarea
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                                placeholder="Paste text, code, notes, or anything..."
                                className="w-full h-64 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
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
                                <strong>Title:</strong> {result.metadata?.title}
                            </p>
                            <div className="flex gap-2 mt-2">
                                {result.metadata?.tags?.map((tag: string, i: number) => (
                                    <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                        {tag}
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

                {/* Info Cards */}
                <div className="grid grid-cols-3 gap-4 mt-8">
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <h3 className="font-semibold text-purple-900 mb-1">Auto-Tagging</h3>
                        <p className="text-sm text-purple-700">AI generates relevant tags</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h3 className="font-semibold text-blue-900 mb-1">Instant Search</h3>
                        <p className="text-sm text-blue-700">Searchable immediately</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <h3 className="font-semibold text-green-900 mb-1">Smart Storage</h3>
                        <p className="text-sm text-green-700">Organized automatically</p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Capture;
