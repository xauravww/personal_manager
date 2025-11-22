import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Search, Zap, GraduationCap, Loader2, Plus, Brain, CheckCircle,
  ArrowRight, Globe, Command, LayoutGrid, MessageSquare, Trash2, Menu, X
} from 'lucide-react';
import { apiClient } from '../api/client';

// --- Types ---
interface SearchResult {
  id: string;
  title: string;
  type: 'document' | 'note' | 'task';
  content: string;
  tags: string[];
  createdAt: string;
  relevance: number;
  url?: string;
}

interface Citation {
  id: string;
  title: string;
  url: string;
  snippet: string;
}

interface ConversationMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  results?: SearchResult[];
  citations?: Citation[];
  structuredAnswer?: string;
  suggestions?: string[];
}

interface ConversationSummary {
  id: string;
  title: string;
  updated_at: string;
  _count?: {
    messages: number;
  };
}

type FocusMode = 'general' | 'quick-search' | 'academic' | 'deep-research';
type SearchMode = 'normal' | 'deep-research';
type TabType = 'all' | 'quick' | 'web' | 'academic' | 'analysis';

const SearchInterface: React.FC = () => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [focusMode, setFocusMode] = useState<FocusMode>('general');
  const [searchMode, setSearchMode] = useState<SearchMode>('normal');
  const [includeWebSearch, setIncludeWebSearch] = useState<boolean>(false);
  const [userTimezone, setUserTimezone] = useState<string>('UTC');

  const [query, setQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Learning Context
  const [learningContext, setLearningContext] = useState<any>(null);

  // Deep Research State
  const [deepResearchProgress, setDeepResearchProgress] = useState<{
    current: number;
    total: number;
    currentStep: string;
    status: 'idle' | 'searching' | 'thinking' | 'reading' | 'analyzing' | 'complete' | 'error';
    currentThought?: any;
    actionLog?: string[];
  } | null>(null);
  const [deepResearchEventSource, setDeepResearchEventSource] = useState<EventSource | null>(null);

  // Conversation State
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isInitialState, setIsInitialState] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- Effects ---

  // Load conversations list
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await apiClient.getConversations();
        if (response.success && response.data) {
          setConversations(response.data);
        }
      } catch (error) {
        console.warn('Failed to fetch conversations', error);
      }
    };
    fetchConversations();
  }, [currentConversationId]); // Refresh list when conversation changes (e.g. new one created)

  // Load specific conversation
  useEffect(() => {
    const loadConversation = async () => {
      if (!currentConversationId) {
        setConversation([]);
        setIsInitialState(true);
        return;
      }

      try {
        const response = await apiClient.getConversation(currentConversationId);
        if (response.success && response.data) {
          const messages = response.data.messages.map((msg: any) => ({
            id: msg.id,
            type: msg.role === 'user' ? 'user' : 'ai',
            content: msg.content,
            timestamp: new Date(msg.created_at),
            citations: msg.citations ? JSON.parse(msg.citations) : undefined,
            suggestions: msg.suggestions ? JSON.parse(msg.suggestions) : undefined
          }));
          setConversation(messages);
          setIsInitialState(messages.length === 0);
        }
      } catch (error) {
        console.warn('Failed to load conversation', error);
      }
    };
    loadConversation();
  }, [currentConversationId]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, isLoading, deepResearchProgress]);

  // Timezone
  useEffect(() => {
    setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  // Fetch Learning Context
  useEffect(() => {
    const fetchLearningContext = async () => {
      try {
        // Fetch subjects and potentially progress
        const subjectsResponse = await apiClient.getLearningSubjects();
        if (subjectsResponse.success && subjectsResponse.data) {
          // Simplified context for now - just subjects
          // In a real app, we'd fetch completed modules, weaknesses, etc.
          setLearningContext({
            subjects: subjectsResponse.data.map((s: any) => s.name),
            // Mock data for now as we don't have a direct endpoint for all details yet
            completedModules: [],
            weaknesses: [],
            recentTopics: []
          });
        }
      } catch (error) {
        console.warn('Failed to fetch learning context', error);
      }
    };
    fetchLearningContext();
  }, []);

  // Handle Tab Switching
  useEffect(() => {
    switch (activeTab) {
      case 'all':
        setFocusMode('general');
        setSearchMode('normal');
        setIncludeWebSearch(true); // Default to include web for 'All'
        break;
      case 'quick':
        setFocusMode('quick-search');
        setSearchMode('normal');
        setIncludeWebSearch(false); // Default to local only for 'Quick'
        break;
      case 'web':
        setFocusMode('general');
        setSearchMode('normal');
        setIncludeWebSearch(true);
        break;
      case 'academic':
        setFocusMode('academic');
        setSearchMode('normal');
        setIncludeWebSearch(true);
        break;
      case 'analysis':
        setFocusMode('deep-research');
        setSearchMode('deep-research');
        setIncludeWebSearch(true);
        break;
    }
  }, [activeTab]);

  // --- Handlers ---

  const createNewChat = useCallback(() => {
    setCurrentConversationId(null);
    setConversation([]);
    setIsInitialState(true);
    // On mobile, close sidebar
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, []);

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
      try {
        await apiClient.deleteConversation(id);
        setConversations(prev => prev.filter(c => c.id !== id));
        if (currentConversationId === id) {
          createNewChat();
        }
      } catch (error) {
        console.error('Failed to delete conversation', error);
      }
    }
  };

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsInitialState(false);
    setIsLoading(true);
    setQuery(''); // Clear input immediately

    // Add user message locally first
    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: searchQuery,
      timestamp: new Date()
    };
    setConversation(prev => [...prev, userMessage]);

    try {
      // Create conversation if it doesn't exist
      let conversationId = currentConversationId;
      if (!conversationId) {
        const newConv = await apiClient.createConversation(
          searchQuery.substring(0, 30) + (searchQuery.length > 30 ? '...' : ''),
          searchQuery
        );
        if (newConv.success && newConv.data) {
          conversationId = newConv.data.id;
          setCurrentConversationId(conversationId);
          // Refresh list
          const listResp = await apiClient.getConversations();
          if (listResp.success && listResp.data) setConversations(listResp.data);
        }
      } else {
        // Save user message to existing conversation
        await apiClient.addMessage(conversationId, {
          role: 'user',
          content: searchQuery
        });
      }

      // 1. Deep Research Mode (Analysis Tab)
      if (searchMode === 'deep-research') {
        setDeepResearchProgress({
          current: 0,
          total: 0,
          currentStep: 'Initializing research...',
          status: 'thinking',
          actionLog: []
        });

        const eventSource = await apiClient.performDeepResearch({
          query: searchQuery,
          maxThoughts: 10, // Allow more thoughts for real research
          timezone: userTimezone,
          includeWebSearch,
          learningContext
        });
        setDeepResearchEventSource(eventSource);

        let thoughtProcess: any[] = [];

        eventSource.onmessage = async (event) => {
          if (event.data === '[DONE]') {
            eventSource.close();
            setDeepResearchEventSource(null);
            setTimeout(() => setDeepResearchProgress(null), 1000);
            return;
          }

          const data = JSON.parse(event.data);

          if (data.type === 'thought') {
            thoughtProcess.push(data.thought);

            // Update progress with real actions
            setDeepResearchProgress(prev => {
              const newLog = prev ? [...prev.actionLog || []] : [];
              if (data.thought.action && data.thought.actionDetails) {
                newLog.push(`${data.thought.action}: ${data.thought.actionDetails}`);
              }

              return {
                current: data.thought.thoughtNumber,
                total: data.thought.totalThoughts || 0,
                currentStep: formatActionText(data.thought),
                status: mapActionToStatus(data.thought.action),
                currentThought: data.thought,
                actionLog: newLog.slice(-3) // Keep last 3 actions
              };
            });
          } else if (data.type === 'complete') {
            const aiMessage: ConversationMessage = {
              id: (Date.now() + 1).toString(),
              type: 'ai',
              content: data.result.finalAnswer,
              timestamp: new Date(),
              citations: data.result.sources?.map((s: any, i: number) => ({
                id: `source-${i}`,
                title: s.title || s.url,
                url: s.url,
                snippet: s.snippet
              }))
            };
            setConversation(prev => [...prev, aiMessage]);
            setIsLoading(false);

            // Save AI response
            if (conversationId) {
              await apiClient.addMessage(conversationId, {
                role: 'assistant',
                content: data.result.finalAnswer,
                citations: JSON.stringify(aiMessage.citations)
              });
            }
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          setIsLoading(false);
          setDeepResearchProgress(null);
          // Add error message
        };
      }
      // 2. Regular Search (All, Web, Academic)
      else {
        const response = await apiClient.searchResources({
          q: searchQuery,
          timezone: userTimezone,
          focusMode,
          forceWebSearch: includeWebSearch,
          useMCP: false,
          conversationId: conversationId || undefined, // Pass conversation ID for context
          learningContext
        });

        let aiContent = '';
        let citations: Citation[] = [];
        let results: SearchResult[] = [];

        // Process results
        if (response.ai?.intent === 'chat') {
          aiContent = response.ai.chatResponse || "I'm here to help.";
        } else {
          aiContent = response.ai?.summary || "Here's what I found...";

          // Map citations
          if (response.data?.resources) {
            results = response.data.resources.map((r: any) => ({
              id: r.id,
              title: r.title,
              type: r.type,
              content: r.content || '',
              tags: r.tags.map((t: any) => t.name),
              createdAt: r.created_at,
              relevance: 0.9
            }));

            citations = results.map((r, i) => ({
              id: `local-${i}`,
              title: r.title,
              url: '#',
              snippet: r.content.substring(0, 100)
            }));
          }

          if (response.data?.webResults) {
            citations = [...citations, ...response.data.webResults.map((r: any, i: number) => ({
              id: `web-${i}`,
              title: r.title,
              url: r.url,
              snippet: r.content.substring(0, 100)
            }))];
          }
        }

        const aiMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: aiContent,
          timestamp: new Date(),
          results: results.length > 0 ? results : undefined,
          citations: citations.length > 0 ? citations : undefined,
          suggestions: response.ai?.suggestions
        };

        setConversation(prev => [...prev, aiMessage]);
        setIsLoading(false);

        // Save AI response
        if (conversationId) {
          await apiClient.addMessage(conversationId, {
            role: 'assistant',
            content: aiContent,
            citations: JSON.stringify(citations),
            suggestions: JSON.stringify(response.ai?.suggestions)
          });
        }
      }
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setConversation(prev => [...prev, {
        id: Date.now().toString(),
        type: 'ai',
        content: "I encountered an error. Please try again.",
        timestamp: new Date()
      }]);
    }
  }, [searchMode, userTimezone, includeWebSearch, learningContext, conversation, focusMode, currentConversationId]);

  // --- Helpers ---
  const formatActionText = (thought: any) => {
    if (thought.action === 'search') return `Searching for "${thought.actionDetails}"...`;
    if (thought.action === 'read_url') {
      try {
        return `Reading ${new URL(thought.actionDetails).hostname}...`;
      } catch (e) {
        return `Reading ${thought.actionDetails}...`;
      }
    }
    if (thought.action === 'analyze') return 'Analyzing findings...';
    if (thought.action === 'extract_links') return 'Extracting connections...';
    return 'Thinking...';
  };

  const mapActionToStatus = (action: string) => {
    switch (action) {
      case 'search': return 'searching';
      case 'read_url': return 'reading';
      case 'analyze': return 'analyzing';
      default: return 'thinking';
    }
  };

  // --- Render ---
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-100 border-r border-slate-200 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <button
              onClick={createNewChat}
              className="flex items-center gap-2 w-full px-4 py-2 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all text-sm font-medium text-slate-700"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => {
                  setCurrentConversationId(conv.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${currentConversationId === conv.id ? 'bg-white shadow-sm' : 'hover:bg-slate-200/50'
                  }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare className={`w-4 h-4 flex-shrink-0 ${currentConversationId === conv.id ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className={`text-sm truncate ${currentConversationId === conv.id ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                    {conv.title}
                  </span>
                </div>
                <button
                  onClick={(e) => deleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">

        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-slate-200 flex items-center gap-3 bg-white">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-medium text-slate-900">Search</span>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 overflow-y-auto scrollbar-hide transition-all duration-500 ${isInitialState ? 'flex items-center justify-center' : 'pt-8 pb-32'}`}>

          {/* Initial Hero State */}
          {isInitialState ? (
            <div className="w-full max-w-3xl px-6 text-center space-y-10 animate-fadeIn">

              <div className="space-y-6">
                <div className="w-16 h-16 bg-gradient-to-tr from-slate-900 to-slate-700 rounded-2xl mx-auto shadow-xl flex items-center justify-center mb-6">
                  <Command className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl md:text-5xl font-medium text-slate-900 tracking-tight">
                  What can I help you find?
                </h1>
              </div>

              {/* Search Input (Hero) */}
              <div className="relative group max-w-2xl mx-auto">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-200 to-slate-300 rounded-2xl opacity-50 group-hover:opacity-100 blur transition duration-500"></div>
                <div className="relative bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex items-center gap-3 transition-all duration-300 focus-within:shadow-md focus-within:border-slate-300">
                  <div className="p-3 text-slate-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                    placeholder="Search notes, documents, or the web..."
                    className="flex-1 bg-transparent text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none font-light"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 pr-2">
                    <button
                      onClick={() => handleSearch(query)}
                      disabled={!query.trim()}
                      className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs / Search Modes */}
              <div className="flex flex-col items-center gap-4 mt-8">
                <div className="flex justify-center gap-2">
                  {[
                    { id: 'all', label: 'All', icon: LayoutGrid },
                    { id: 'quick', label: 'Quick', icon: Zap },
                    { id: 'academic', label: 'Academic', icon: GraduationCap },
                    { id: 'analysis', label: 'Deep Research', icon: Brain }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all border ${activeTab === tab.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                        }`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Additional Options */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIncludeWebSearch(!includeWebSearch)}
                    className={`flex items-center gap-2 text-xs font-medium transition-colors ${includeWebSearch ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${includeWebSearch ? 'bg-blue-600' : 'bg-slate-200'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${includeWebSearch ? 'left-4.5' : 'left-0.5'}`} style={{ left: includeWebSearch ? '18px' : '2px' }}></div>
                    </div>
                    Include Web Search
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Chat Interface */
            <div className="max-w-3xl mx-auto px-6 space-y-10">
              {conversation.map((msg, idx) => (
                <div key={msg.id} className={`flex gap-6 animate-fadeIn ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>

                  {/* Message Content */}
                  <div className={`flex-1 space-y-4 ${msg.type === 'user' ? 'text-right' : ''} min-w-0`}>

                    {/* Text Bubble */}
                    <div className={`inline-block text-left ${msg.type === 'user'
                      ? 'bg-slate-100 text-slate-900 px-6 py-3 rounded-2xl rounded-tr-sm'
                      : 'text-slate-800 w-full'
                      }`}>
                      {msg.type === 'ai' ? (
                        <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-a:text-blue-600 hover:prose-a:text-blue-700 break-words">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-lg break-words">{msg.content}</p>
                      )}
                    </div>

                    {/* Citations Carousel (AI Only) */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto pb-4 pt-2 scrollbar-hide snap-x -ml-2 px-2 max-w-full">
                        {msg.citations.map((citation, cIdx) => (
                          <a
                            key={cIdx}
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="snap-start min-w-[200px] max-w-[200px] p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all group cursor-pointer block"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                <Globe className="w-3 h-3" />
                              </div>
                              <span className="text-xs font-medium text-slate-500 truncate">
                                {(() => {
                                  try {
                                    return new URL(citation.url || 'https://example.com').hostname;
                                  } catch (e) {
                                    return 'Local';
                                  }
                                })()}
                              </span>
                            </div>
                            <h4 className="text-xs font-medium text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                              {citation.title}
                            </h4>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading / Deep Research State */}
              {isLoading && (
                <div className="flex gap-6 animate-fadeIn">
                  <div className="flex-1">
                    {deepResearchProgress ? (
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm max-w-xl">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping absolute"></div>
                              <div className="w-3 h-3 bg-blue-500 rounded-full relative"></div>
                            </div>
                            <span className="text-sm font-medium text-slate-700">
                              {deepResearchProgress.currentStep}
                            </span>
                          </div>
                        </div>

                        {/* Action Log */}
                        <div className="space-y-2">
                          {deepResearchProgress.actionLog?.map((log, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-500 font-mono opacity-70">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <span className="truncate">{log}</span>
                            </div>
                          ))}
                          <div className="flex items-center gap-2 text-xs text-slate-800 font-mono">
                            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                            <span className="truncate">{deepResearchProgress.currentThought?.thought || 'Thinking...'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Learning-style Loader */
                      <div className="flex flex-col items-center py-12">
                        <div className="relative w-16 h-16 mb-4">
                          <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Brain className="w-6 h-6 text-blue-600 animate-pulse" />
                          </div>
                        </div>
                        <p className="text-sm font-medium text-slate-600">Thinking...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={chatEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Sticky Input (Bottom) - Only shown when not initial state */}
        {!isInitialState && (
          <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-12 pb-8 px-4 z-40">
            <div className="max-w-3xl mx-auto relative group">
              <div className="relative bg-white rounded-2xl shadow-lg border border-slate-200 p-2 flex items-center gap-3">
                <button
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Upload"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                  placeholder="Ask follow-up..."
                  className="flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  onClick={() => handleSearch(query)}
                  disabled={!query.trim() || isLoading}
                  className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="text-center mt-2 flex justify-center gap-4">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'quick', label: 'Quick' },
                  { id: 'academic', label: 'Academic' },
                  { id: 'analysis', label: 'Deep Research' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`text-[10px] uppercase tracking-widest transition-colors ${activeTab === tab.id ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SearchInterface;