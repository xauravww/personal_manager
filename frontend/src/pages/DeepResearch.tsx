import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Search,
  X,
  BookOpen,
  Zap,
  ChevronDown,
  ExternalLink,
  Loader2,
  Brain,
  Lightbulb,
  Target,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  Settings,
  Paperclip,
  Globe
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
  thoughtProcess: DeepResearchThought[];
  confidence: number;
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
  const [visibleThoughts, setVisibleThoughts] = useState<DeepResearchThought[]>([]);
  const thoughtsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Client-side cleaning of final answer to ensure no research analysis leaks through
  const cleanFinalAnswer = (answer: string): string => {
    if (!answer) return answer;

    let cleaned = answer;

    // Cut off everything after research analysis
    const researchAnalysisIndex = cleaned.toLowerCase().indexOf('research analysis');
    if (researchAnalysisIndex !== -1) {
      cleaned = cleaned.substring(0, researchAnalysisIndex).trim();
    }

    // Cut off everything after step indicators
    const stepPatterns = ['step 1:', 'step 2:', 'step 3:', 'step 4:', 'step 5:', 'step 6:', 'step 7:', 'step 8:', 'step 9:', 'step 10:'];
    for (const pattern of stepPatterns) {
      const index = cleaned.toLowerCase().indexOf(pattern.toLowerCase());
      if (index !== -1) {
        cleaned = cleaned.substring(0, index).trim();
        break;
      }
    }

    // Remove confidence mentions
    cleaned = cleaned.replace(/\d+% confidence.*$/s, '').trim();
    cleaned = cleaned.replace(/research completed with.*$/s, '').trim();

    return cleaned;
  };

  // Clear thoughts when research starts
  useEffect(() => {
    if (researchStatus === 'thinking' && !isLoading) {
      setVisibleThoughts([]);
    }
  }, [researchStatus, isLoading]);

  const scrollToBottom = () => {
    thoughtsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [visibleThoughts]);

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
        return 'Sequential search: Finding targeted information based on previous analysis...';
      case 'thinking':
        return 'Sequential thinking: Planning next research step using accumulated knowledge...';
      case 'reading':
        return 'Sequential reading: Extracting insights that will inform future steps...';
      case 'analyzing':
        return 'Sequential synthesis: Building comprehensive understanding step-by-step...';
      case 'complete':
        return 'Sequential research complete! Each step contributed to the final answer.';
      case 'error':
        return 'Research failed';
      default:
        return 'Ready for sequential deep research';
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
    setFinalResult(null);
    setError(null);

    try {
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new EventSource for streaming - no hardcoded limits
      const eventSource = await apiClient.performDeepResearch({
        query: query
        // maxThoughts is now dynamic based on research needs
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

             // Don't display the final thought as current thought - it will be shown in final result
             if (!thought.nextThoughtNeeded) {
               setResearchStatus('complete');
               return;
             }

              // Update latest total thoughts estimate
              setLatestTotalThoughts(prev => Math.max(prev, thought.totalThoughts));

              // Immediately add thought to visible list (live streaming)
              setVisibleThoughts(prev => {
                // Keep only the last 5 thoughts visible for context
                const newThoughts = [...prev, thought].slice(-5);
                return newThoughts;
              });

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
    setVisibleThoughts([]);
    setFinalResult(null);
    setError(null);
    setSourcesExpanded(false);
    setResearchAnalysisExpanded(false);
    setLatestTotalThoughts(0);
    setResearchStatus('idle');
    setQuery('');
  };



  return (
    <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen text-white">
      {/* Header */}
      <header className="backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <Brain className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Deep Research</h1>
                <p className="text-sm text-slate-400">Sequential AI analysis with real-time insights</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium border border-purple-500/30">
                <Zap className="w-4 h-4" strokeWidth={1.5} />
                Sequential Mode
              </div>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Settings className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Interface */}
      <div className="backdrop-blur-xl bg-white/5 border-b border-white/10 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && startDeepResearch()}
              placeholder="Explore any topic with AI-powered sequential research..."
              disabled={isLoading}
              className="w-full bg-white/5 border border-white/20 rounded-xl px-6 py-4 text-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-3">
              <button className="p-3 hover:bg-white/10 rounded-lg transition-colors">
                <Paperclip className="w-5 h-5" strokeWidth={1.5} />
              </button>
              {(currentThought || finalResult) && (
                <button
                  onClick={clearResearch}
                  disabled={isLoading}
                  className="p-3 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Clear research"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              )}
              <button
                onClick={startDeepResearch}
                disabled={isLoading || !query.trim()}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Search className="w-5 h-5" strokeWidth={1.5} />
                )}
                {isLoading ? 'Researching...' : 'Start Research'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm text-slate-400">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" strokeWidth={1.5} />
              Real-time streaming
            </span>
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4" strokeWidth={1.5} />
              Web exploration
            </span>
            <span className="flex items-center gap-2">
              <Brain className="w-4 h-4" strokeWidth={1.5} />
              Sequential reasoning
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {!currentThought && !isLoading && researchStatus === 'idle' && (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-12 text-center border border-white/10 shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Brain className="w-10 h-10 text-purple-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-semibold mb-4 tracking-tight">Ready for Deep Research</h3>
            <p className="text-slate-400 max-w-lg mx-auto leading-relaxed">
              Enter any research topic and watch as AI performs sequential analysis,
              explores the web, reads content, and synthesizes insights in real-time.
            </p>
          </div>
        )}

        {/* Research Progress - Live Streaming */}
        {(visibleThoughts.length > 0 || isLoading) && (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 mb-8 border border-white/10 shadow-2xl animate-fade-in relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
              <div className="absolute bottom-10 right-10 w-24 h-24 bg-blue-500/20 rounded-full blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" style={{animationDelay: '2s'}}></div>
            </div>

            {/* Header - Minimal and Focused */}
            <div className="relative z-10 mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                  <Brain className="w-8 h-8 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    AI Research in Progress
                  </h2>
                  <p className="text-slate-400 text-sm">Exploring, analyzing, and synthesizing knowledge</p>
                </div>
              </div>

              {/* Status Flow - Visual Hierarchy */}
              <div className="flex items-center gap-6 text-sm">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-500 ${
                  researchStatus === 'searching' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                  researchStatus === 'reading' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                  researchStatus === 'analyzing' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                  'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                }`}>
                  {getStatusIcon(researchStatus)}
                  <span className="font-medium">{getStatusText(researchStatus)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Activity className="w-4 h-4 animate-pulse" strokeWidth={1.5} />
                  <span>Live processing</span>
                </div>
              </div>
            </div>

            {/* Thought Stream - Animated and Persistent */}
            <div className="relative z-10 space-y-3">
              {visibleThoughts.map((thought, index) => (
                <div
                  key={`${thought.timestamp}-${index}`}
                  className="animate-slide-in-up"
                  style={{
                    animationDelay: `${index * 0.5}s`,
                  }}
                >
                  <div className="bg-gradient-to-r from-white/10 to-white/5 rounded-2xl p-6 border border-white/20 shadow-xl">
                    {/* Thought Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        thought.action === 'search' ? 'bg-blue-500/30 border border-blue-500/40' :
                        thought.action === 'read_url' ? 'bg-green-500/30 border border-green-500/40' :
                        thought.action === 'analyze' ? 'bg-orange-500/30 border border-orange-500/40' : 'bg-purple-500/30 border border-purple-500/40'
                      }`}>
                        {getThoughtIcon(thought)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-semibold text-white">
                            {thought.isRevision ? 'Refined Analysis' :
                             thought.action ? `${thought.action.replace('_', ' ').toUpperCase()}` :
                             'Deep Analysis'}
                          </span>
                          {index === visibleThoughts.length - 1 && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30 animate-pulse">
                              Latest
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                            Step {thought.thoughtNumber}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-600/50 text-slate-300 text-xs rounded-full">
                            Live
                          </span>
                        </div>
                        <div className="text-sm text-slate-400">
                          {thought.isRevision ? 'Revising previous insights' : 'Processing new information'}
                        </div>
                      </div>
                    </div>

                    {/* Thought Content - Primary Focus */}
                    <div className="text-slate-200 leading-relaxed mb-4">
                      <ReactMarkdown>
                        {thought.thought}
                      </ReactMarkdown>
                    </div>

                    {/* Action Details - Secondary */}
                    {thought.actionDetails && (
                      <div className="mb-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Technical Details</div>
                        <div className="text-sm text-slate-300 font-mono text-xs break-all">
                          {thought.actionDetails}
                        </div>
                      </div>
                    )}

                    {/* Result - Tertiary */}
                    {thought.result && (
                      <div className="p-4 bg-green-900/20 rounded-xl border border-green-700/30">
                        <div className="text-xs font-medium text-green-400 mb-2 uppercase tracking-wide">Outcome</div>
                        <div className="text-sm text-green-200 whitespace-pre-wrap break-words">
                          {thought.result.length > 300 ? `${thought.result.substring(0, 300)}...` : thought.result}
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="mt-4 text-xs text-slate-500 flex items-center justify-between">
                      <span>{new Date(thought.timestamp).toLocaleTimeString()}</span>
                      {!thought.nextThoughtNeeded && (
                        <span className="text-green-400 font-medium">• Final step</span>
                      )}
                      <span className="text-slate-400">
                        {index === visibleThoughts.length - 1 ? 'Latest' : 'Processed'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator when processing */}
              {isLoading && visibleThoughts.length === 0 && (
                <div className="animate-fade-in-scale">
                  <div className="bg-gradient-to-r from-slate-800/30 to-slate-700/30 rounded-2xl p-6 border border-slate-600/30 border-dashed">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-600/20 border border-slate-500/30 flex items-center justify-center">
                        <div className="w-3 h-3 bg-slate-400 rounded-full animate-pulse"></div>
                      </div>
                      <div className="text-sm text-slate-400 italic">
                        AI is starting deep research...
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Loading State - Live */}
            {visibleThoughts.length === 0 && isLoading && (
              <div className="relative z-10 text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Brain className="w-10 h-10 text-purple-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold mb-2 tracking-tight">Initializing Research</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  AI is preparing to explore your topic with comprehensive analysis and synthesis
                </p>
                <div className="flex justify-center gap-2 mt-6">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Final Result - Hero Layout */}
        {finalResult && (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10 shadow-2xl animate-fade-in relative overflow-hidden">
            {/* Success Background Elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-8 right-8 w-24 h-24 bg-green-500/20 rounded-full blur-xl"></div>
              <div className="absolute bottom-8 left-8 w-32 h-32 bg-emerald-500/20 rounded-full blur-xl"></div>
            </div>

            {/* Header - Prominent */}
            <div className="relative z-10 mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg animate-glow">
                  <CheckCircle className="w-8 h-8 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    Research Complete
                  </h2>
                  <p className="text-slate-400 text-sm">
                    Comprehensive analysis with {finalResult.sources.length} sources • {finalResult.confidence}% confidence
                  </p>
                </div>
              </div>

              {/* Confidence Indicator */}
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-slate-800/50 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${finalResult.confidence}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-green-400">{finalResult.confidence}%</span>
              </div>
            </div>

            {/* Main Answer - Primary Focus */}
            <div className="relative z-10 mb-8">
              <div className="bg-gradient-to-r from-white/10 to-white/5 rounded-2xl p-6 border border-white/20 shadow-xl">
                <div className="prose prose-invert prose-lg max-w-none">
                  <ReactMarkdown>
                    {cleanFinalAnswer(finalResult.finalAnswer)}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            {/* Supporting Information - Secondary Hierarchy */}
            <div className="relative z-10 space-y-4">
              {/* Research Journey Section */}
              <div className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
                <button
                  onClick={() => setResearchAnalysisExpanded(!researchAnalysisExpanded)}
                  className="w-full flex items-center gap-3 hover:bg-white/5 rounded-xl p-5 transition-all duration-300"
                >
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Brain className="w-4 h-4 text-purple-400" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-semibold text-white">Research Journey</span>
                    <p className="text-sm text-slate-400 mt-0.5">The thinking process behind this analysis</p>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${researchAnalysisExpanded ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                </button>
                {researchAnalysisExpanded && (
                  <div className="px-6 pb-6 animate-fade-in">
                    <div className="space-y-3">
                      {finalResult.thoughtProcess.slice(0, 8).map((thought, index) => (
                        <div key={index} className="flex gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            thought.action === 'search' ? 'bg-blue-500/20' :
                            thought.action === 'read_url' ? 'bg-green-500/20' :
                            thought.action === 'analyze' ? 'bg-orange-500/20' : 'bg-purple-500/20'
                          }`}>
                            {getThoughtIcon(thought)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white mb-1">
                              {thought.isRevision ? 'Refined Analysis' :
                               thought.action ? `${thought.action.replace('_', ' ').toUpperCase()}` :
                               'Analysis'}
                            </div>
                            <div className="text-sm text-slate-300 leading-relaxed">
                              {thought.thought.substring(0, 120)}{thought.thought.length > 120 ? '...' : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sources Section */}
              <div className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
                <button
                  onClick={() => setSourcesExpanded(!sourcesExpanded)}
                  className="w-full flex items-center gap-3 hover:bg-white/5 rounded-xl p-5 transition-all duration-300"
                >
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Globe className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-semibold text-white">Source Materials</span>
                    <p className="text-sm text-slate-400 mt-0.5">{finalResult.sources.length} references used in this analysis</p>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${sourcesExpanded ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                </button>
                {sourcesExpanded && (
                  <div className="px-6 pb-6 animate-fade-in">
                    <div className="grid gap-3">
                      {finalResult.sources.slice(0, 6).map((source, index) => (
                        <div key={index} className="flex gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-blue-300">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white mb-1 truncate">{source.title}</h4>
                            <p className="text-sm text-slate-400 mb-2 line-clamp-2">{source.content.substring(0, 150)}...</p>
                            <a href={source.url} target="_blank" rel="noopener noreferrer"
                               className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition-colors">
                              <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                              View source
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="backdrop-blur-xl bg-red-500/10 rounded-2xl p-6 border border-red-500/20 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 text-red-300">
              <AlertCircle className="w-6 h-6" strokeWidth={1.5} />
              <span className="font-medium">Research Error</span>
            </div>
            <p className="text-red-200 mt-2">{error}</p>
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes staggerIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
          50% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.5); }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }

        .animate-stagger-in {
          animation: staggerIn 0.6s ease-out;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-slide-in-up {
          animation: slideInUp 0.6s ease-out;
        }

        .animate-fade-in-scale {
          animation: fadeInScale 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default DeepResearch;