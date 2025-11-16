import React, { useState } from 'react';
import { ExternalLink, FileText, Loader2, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { apiClient, UrlReaderRequest } from '../api/client';

interface UrlReaderProps {
  onContentRead?: (content: string, url: string) => void;
}

const UrlReader: React.FC<UrlReaderProps> = ({ onContentRead }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    content: string;
    url: string;
    processingTime: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced options
  const [returnRaw, setReturnRaw] = useState(false);
  const [maxRetries, setMaxRetries] = useState(3);
  const [startChar, setStartChar] = useState<number | undefined>();
  const [maxLength, setMaxLength] = useState<number | undefined>();
  const [section, setSection] = useState('');
  const [paragraphRange, setParagraphRange] = useState('');
  const [readHeadings, setReadHeadings] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const params: UrlReaderRequest = {
        url: url.trim(),
        returnRaw,
        maxRetries,
        startChar,
        maxLength,
        section: section.trim() || undefined,
        paragraphRange: paragraphRange.trim() || undefined,
        readHeadings,
      };

      const response = await apiClient.readUrlContent(params);

      if (response.success && response.data) {
        setResult(response.data);
        onContentRead?.(response.data.content, response.data.url);
      } else {
        setError(response.error || 'Failed to read URL content');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setUrl('');
    setResult(null);
    setError(null);
    setReturnRaw(false);
    setMaxRetries(3);
    setStartChar(undefined);
    setMaxLength(undefined);
    setSection('');
    setParagraphRange('');
    setReadHeadings(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <ExternalLink className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900">URL Reader</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            URL to Read
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <Settings className="w-4 h-4" />
            Advanced Options
          </button>

          <div className="flex gap-2">
            {result && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reading...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Read URL
                </>
              )}
            </button>
          </div>
        </div>

        {showAdvanced && (
          <div className="border-t border-gray-200 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Retries
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(parseInt(e.target.value) || 3)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Character
                </label>
                <input
                  type="number"
                  min="0"
                  value={startChar || ''}
                  onChange={(e) => setStartChar(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Length
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxLength || ''}
                  onChange={(e) => setMaxLength(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Unlimited"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section Heading
                </label>
                <input
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="Introduction"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paragraph Range
                </label>
                <input
                  type="text"
                  value={paragraphRange}
                  onChange={(e) => setParagraphRange(e.target.value)}
                  placeholder="1-5 or 3 or 10-"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={returnRaw}
                  onChange={(e) => setReturnRaw(e.target.checked)}
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Return Raw Content</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={readHeadings}
                  onChange={(e) => setReadHeadings(e.target.checked)}
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Extract Headings Only</span>
              </label>
            </div>
          </div>
        )}
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h4 className="text-sm font-medium text-red-800">Error</h4>
          </div>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h4 className="text-sm font-medium text-gray-900">Content Read Successfully</h4>
            <span className="text-xs text-gray-500">
              ({result.processingTime}ms)
            </span>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="text-sm text-gray-600 mb-2">
              <strong>Source:</strong>{' '}
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 inline-flex"
              >
                {result.url}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {result.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrlReader;