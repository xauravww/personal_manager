import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Search,
  Menu,
  X,
  History,
  BookOpen,
  Zap,
  GraduationCap,
  ChevronDown,
  ExternalLink,
  FileText,
  Image,
  StickyNote,
  Tag,
  Loader2,
  Bot,
  User,
  Plus,
  Brain,
  Lightbulb,
  Target,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { apiClient } from '../api/client';

interface DeepResearchThought {
  thoughtNumber: number;
  totalThoughts: number;
  thought: string;
  action?: string;
  actionDetails?: string;
  result?: string;
  nextThoughtNeeded: boolean;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
  timestamp: string;
}

interface DeepResearchResult {
  finalAnswer: string;
  confidence: number;
  sourcesCount: number;
  thoughtsCount: number;
  sources: Array<{
    url: string;
    title: string;
    content: string;
    relevance: number;
  }>;
}

type ResearchStatus = 'idle' | 'searching' | 'thinking' | 'reading' | 'analyzing' | 'complete' | 'error';

const DeepResearch: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [researchStatus, setResearchStatus] = useState<ResearchStatus>('idle');
  const [currentThought, setCurrentThought] = useState<DeepResearchThought | null>(null);
  const [completedThoughts, setCompletedThoughts] = useState<DeepResearchThought[]>([]);
  const [finalResult, setFinalResult] = useState<DeepResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourcesExpanded, setSourcesExpanded] = useState<boolean>(false);
  const [latestTotalThoughts, setLatestTotalThoughts] = useState<number>(5);
  const thoughtsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = () => {
    thoughtsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentThought, completedThoughts]);

  const getStatusIcon = (status: ResearchStatus) => {
    switch (status) {
      case 'searching':
        return <Search className="w-5 h-5 text-blue-500 animate-pulse" strokeWidth={1.5} />;
      case 'thinking':
        return <Brain className="w-5 h-5 text-purple-500 animate-pulse" strokeWidth={1.5} />;
      case 'reading':
        return <BookOpen className="w-5 h-5 text-green-500 animate-pulse" strokeWidth={1.5} />;
      case 'analyzing':
        return <Target className="w-5 h-5 text-orange-500 animate-pulse" strokeWidth={1.5} />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600" strokeWidth={1.5} />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" strokeWidth={1.5} />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" strokeWidth={1.5} />;
    }
  };

  const getStatusText = (status: ResearchStatus) => {
    switch (status) {
      case 'searching':
        return 'Searching the web...';
      case 'thinking':
        return 'Analyzing and planning...';
      case 'reading':
        return 'Reading content...';
      case 'analyzing':
        return 'Synthesizing information...';
      case 'complete':
        return 'Research complete!';
      case 'error':
        return 'Research failed';
      default:
        return 'Ready to research';
    }
  };

  const getThoughtIcon = (thought: DeepResearchThought) => {
    if (thought.isRevision) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" strokeWidth={1.5} />;
    }
    if (thought.action === 'search') {
      return <Search className="w-4 h-4 text-blue-500" strokeWidth={1.5} />;
    }
    if (thought.action === 'read_url') {
      return <BookOpen className="w-4 h-4 text-green-500" strokeWidth={1.5} />;
    }
    if (thought.action === 'analyze') {
      return <Target className="w-4 h-4 text-orange-500" strokeWidth={1.5} />;
    }
    return <Lightbulb className="w-4 h-4 text-purple-500" strokeWidth={1.5} />;
  };

  const startDeepResearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setResearchStatus('thinking');
    setCurrentThought(null);
    setCompletedThoughts([]);
    setFinalResult(null);
    setError(null);

    try {
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new EventSource for streaming
      const eventSource = await apiClient.performDeepResearch({
        query: query,
        maxThoughts: 10
      });

      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'start') {
            setResearchStatus('searching');
          } else if (data.type === 'thought') {
            const thought = data.thought;

            // Check if this is an intermediate status thought (decimal thought number)
            const isIntermediate = thought.thoughtNumber % 1 !== 0;

            if (isIntermediate) {
              // Update status based on intermediate thought
              if (thought.action === 'search') {
                setResearchStatus('searching');
              } else if (thought.action === 'read_url') {
                setResearchStatus('reading');
              } else if (thought.action === 'analyze') {
                setResearchStatus('analyzing');
              } else {
                setResearchStatus('thinking');
              }
              // Don't add intermediate thoughts to the main thoughts list
              return;
            }

            // Update latest total thoughts estimate
            setLatestTotalThoughts(prev => Math.max(prev, thought.totalThoughts));

            // Move current thought to completed and set new current thought
            if (currentThought) {
              setCompletedThoughts(prev => [...prev, currentThought]);
            }
            setCurrentThought(thought);

            // Update status based on completed thought action
            if (thought.action === 'search') {
              setResearchStatus('searching');
            } else if (thought.action === 'read_url') {
              setResearchStatus('reading');
            } else if (thought.action === 'analyze') {
              setResearchStatus('analyzing');
            } else {
              setResearchStatus('thinking');
            }
          } else if (data.type === 'complete') {
            setFinalResult(data.result);
            setResearchStatus('complete');
            setIsLoading(false);
            eventSource.close();
          } else if (data.type === 'error') {
            setError(data.message);
            setResearchStatus('error');
            setIsLoading(false);
            eventSource.close();
          }
        } catch (err) {
          console.error('Error parsing SSE data:', err);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        setError('Connection lost during research');
        setResearchStatus('error');
        setIsLoading(false);
        eventSource.close();
      };

    } catch (error) {
      console.error('Error starting deep research:', error);
      setError('Failed to start deep research');
      setResearchStatus('error');
      setIsLoading(false);
    }
  };

  const clearResearch = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setCurrentThought(null);
    setCompletedThoughts([]);
    setFinalResult(null);
    setError(null);
    setSourcesExpanded(false);
    setLatestTotalThoughts(5);
    setResearchStatus('idle');
    setQuery('');
  };



  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 lg:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Deep Research</h1>
                <p className="text-sm text-gray-600">Sequential thinking with web exploration</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(researchStatus)}
              <span className="text-sm text-gray-600">{getStatusText(researchStatus)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Search Input */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 lg:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && startDeepResearch()}
              placeholder="What would you like to research deeply? (e.g., 'latest developments in quantum computing')"
              disabled={isLoading}
              className="w-full px-6 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex gap-2">
              {(currentThought || completedThoughts.length > 0 || finalResult) && (
                <button
                  onClick={clearResearch}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Clear research"
                >
                  <X className="w-6 h-6" strokeWidth={1.5} />
                </button>
              )}
              <button
                onClick={startDeepResearch}
                disabled={isLoading || !query.trim()}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Search className="w-5 h-5" strokeWidth={1.5} />
                )}
                {isLoading ? 'Researching...' : 'Start Deep Research'}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" strokeWidth={1.5} />
                <span className="font-medium">Research Error</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Research Results */}
      <div className="flex-1 px-4 py-6 lg:px-6">
        <div className="max-w-4xl mx-auto">
          {!currentThought && completedThoughts.length === 0 && !isLoading && researchStatus === 'idle' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-purple-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready for Deep Research</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Enter a research query above and watch as the AI performs sequential thinking,
                searches the web, reads content, and synthesizes information step by step.
              </p>
            </div>
          )}

          {/* Current Research Progress */}
          {(currentThought || isLoading) && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Live Research Progress</h2>
                <span className="text-sm text-gray-600">
                  {completedThoughts.length + (currentThought ? 1 : 0)} steps completed
                </span>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                {currentThought ? (
                  <div className="animate-fade-in">
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Step {currentThought.thoughtNumber} of {latestTotalThoughts}</span>
                        <span>{Math.round((currentThought.thoughtNumber / latestTotalThoughts) * 100)}% complete</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${Math.min((currentThought.thoughtNumber / latestTotalThoughts) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Current Thought Content */}
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getThoughtIcon(currentThought)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {currentThought.isRevision ? 'Revision' : currentThought.action ? `${currentThought.action.replace('_', ' ').toUpperCase()}` : 'Analysis'}
                          </h3>
                          {currentThought.isRevision && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                              Revising step {currentThought.revisesThought}
                            </span>
                          )}
                        </div>

                        <div className="prose prose-lg max-w-none text-gray-700 mb-4">
                          <ReactMarkdown>{currentThought.thought}</ReactMarkdown>
                        </div>

                        {currentThought.actionDetails && (
                          <div className="mb-4 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-400">
                            <div className="text-sm text-gray-600 mb-2">Action Details:</div>
                            <div className="text-sm font-mono text-gray-800 break-all">
                              {currentThought.actionDetails}
                            </div>
                          </div>
                        )}

                        {currentThought.result && (
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="text-sm text-green-700 mb-2 font-medium">Result:</div>
                            <div className="text-sm text-green-800 whitespace-pre-wrap break-words">
                              {currentThought.result.length > 500 ? `${currentThought.result.substring(0, 500)}...` : currentThought.result}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 text-xs text-gray-500 flex items-center gap-4">
                          <span>{new Date(currentThought.timestamp).toLocaleTimeString()}</span>
                          {!currentThought.nextThoughtNeeded && (
                            <span className="text-green-600 font-medium">Final step</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Loader2 className="w-6 h-6 text-white animate-spin" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Initializing Research</h3>
                    <p className="text-gray-600">Setting up the research process...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Completed Thoughts History */}
          {completedThoughts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Research History</h2>
                <span className="text-sm text-gray-600">{completedThoughts.length} completed steps</span>
              </div>

              <div className="space-y-3">
                {completedThoughts.map((thought, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getThoughtIcon(thought)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            Step {thought.thoughtNumber}: {thought.isRevision ? 'Revision' : thought.action ? `${thought.action.replace('_', ' ').toUpperCase()}` : 'Analysis'}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {new Date(thought.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 line-clamp-2">
                          {thought.thought}
                        </div>
                        {thought.result && (
                          <div className="mt-2 text-xs text-green-700">
                            ✓ Result: {thought.result.substring(0, 100)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div ref={thoughtsEndRef} />
            </div>
          )}

          {/* Final Result */}
          {finalResult && (
            <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" strokeWidth={1.5} />
                <h3 className="text-xl font-semibold text-gray-900">Research Complete</h3>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                  {finalResult.confidence}% confidence
                </span>
              </div>

              <div className="prose prose-lg max-w-none text-gray-800 mb-4">
                <ReactMarkdown>{finalResult.finalAnswer}</ReactMarkdown>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-600">
                <span>{finalResult.sourcesCount} sources explored</span>
                <span>{finalResult.thoughtsCount} research steps</span>
              </div>
            </div>
          )}

          {/* Sources Dropdown */}
          {finalResult && finalResult.sources && finalResult.sources.length > 0 && (
            <div className="mt-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setSourcesExpanded(!sourcesExpanded)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                  <span className="font-medium text-gray-900">Sources & Citations</span>
                  <span className="text-sm text-gray-600">({finalResult.sources.length})</span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 transition-transform ${sourcesExpanded ? 'rotate-180' : ''}`}
                  strokeWidth={1.5}
                />
              </button>

              {sourcesExpanded && (
                <div className="border-t border-gray-200">
                  <div className="max-h-96 overflow-y-auto">
                    {finalResult.sources.map((source, index) => (
                      <div key={index} className="px-6 py-4 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                            <span className="text-xs font-medium text-blue-700">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-gray-900 truncate">{source.title}</h4>
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                {Math.round(source.relevance * 100)}% relevant
                              </span>
                            </div>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2 break-all"
                            >
                              {source.url}
                              <ExternalLink className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />
                            </a>
                            <p className="text-sm text-gray-700 line-clamp-3">
                              {source.content.length > 200 ? `${source.content.substring(0, 200)}...` : source.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}


        </div>
      </div>
    </div>
  );
};

export default DeepResearch;