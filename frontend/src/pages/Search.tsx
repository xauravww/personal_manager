import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, Send, Bot, User, Sparkles, ArrowRight, Command, MessageSquare, Plus, Zap, GraduationCap, Brain, Globe, LayoutGrid, Loader2, CheckCircle, ExternalLink, Menu, X, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiClient } from '../api/client';
import Button from '../components/ui/Button';
import { useTypingEffect } from '../hooks/useTypingEffect';
import ResearchProgress from '../components/search/ResearchProgress';
import StandardSearchLoading from '../components/search/StandardSearchLoading';
import CodeBlock from '../components/ui/CodeBlock';
import ResourceCarousel from '../components/search/ResourceCarousel';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: any[];
  suggestions?: string[];
  isStreaming?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  lastMessageAt: Date;
}

type SearchMode = 'all' | 'quick' | 'academic' | 'deep-research';

interface DeepResearchProgressState {
  currentStep: string;
  actionLog: string[];
  currentThought?: any;
  currentQuery?: string;
  searchResults?: Array<{ title: string; url: string }>;
}

// Component to render individual message content with typing effect
const MessageContent: React.FC<{ content: string; isStreaming?: boolean }> = ({ content, isStreaming }) => {
  const { displayedText } = useTypingEffect(content, 2, isStreaming); // Speed 2ms for faster typing

  return (
    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-transparent prose-pre:p-0 prose-pre:border-none prose-headings:text-starlight-100 prose-a:text-neon-blue hover:prose-a:text-neon-purple transition-colors">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <CodeBlock
                language={match[1]}
                value={String(children).replace(/\n$/, '')}
              />
            ) : (
              <code className={`${className} bg-void-950 px-1.5 py-0.5 rounded text-neon-blue font-mono text-xs border border-starlight-100/10`} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {displayedText}
      </ReactMarkdown>
    </div>
  );
};

const Search: React.FC = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [includeWebSearch, setIncludeWebSearch] = useState(false); // Default to OFF
  const [deepResearchProgress, setDeepResearchProgress] = useState<DeepResearchProgressState | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, deepResearchProgress]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await apiClient.getConversations();
      if (response.success && response.data) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = query;
    setQuery('');
    setIsLoading(true);

    try {
      // Create or get conversation ID
      let conversationId = currentConversationId;
      if (!conversationId) {
        const newConv = await apiClient.createConversation(
          currentQuery.substring(0, 30) + (currentQuery.length > 30 ? '...' : ''),
          currentQuery
        );
        if (newConv.success && newConv.data) {
          conversationId = newConv.data.id;
          setCurrentConversationId(conversationId);
          loadConversations();
        }
      } else {
        await apiClient.addMessage(conversationId, {
          role: 'user',
          content: currentQuery
        });
      }

      // Handle Deep Research Mode
      if (searchMode === 'deep-research') {
        setDeepResearchProgress({
          currentStep: 'Initializing research...',
          actionLog: [],
        });

        const eventSource = await apiClient.performDeepResearch({
          query: currentQuery,
          timezone: userTimezone,
          includeWebSearch: true
        });

        eventSource.onmessage = async (event) => {
          if (event.data === '[DONE]') {
            eventSource.close();
            setDeepResearchProgress(null);
            return;
          }

          const data = JSON.parse(event.data);

          if (data.type === 'thought') {
            const thought = data.thought;

            // Handle granular event types - show transparent status
            if (thought.eventType === 'searching') {
              // Show actual search query being executed
              setDeepResearchProgress(prev => ({
                ...prev,
                currentStep: '🔍 Searching the web',
                currentQuery: thought.searchQuery,
                actionLog: prev?.actionLog || []
              }));
            } else if (thought.eventType === 'search_results') {
              // Show search results count
              console.log('🔍 Received search_results event:', {
                count: thought.searchResultsCount,
                preview: thought.searchPreview
              });
              setDeepResearchProgress(prev => ({
                ...prev,
                currentStep: `📊 Found ${thought.searchResultsCount || 0} results`,
                searchResults: thought.searchPreview || [],
                actionLog: prev?.actionLog || []
              }));
            } else if (thought.eventType === 'reading_url') {
              // Show which URL is being read
              const status = thought.urlStatus === 'started' ? '📖 Reading' :
                thought.urlStatus === 'completed' ? '✓ Read' :
                  '✗ Failed reading';
              const displayUrl = thought.urlTitle || thought.urlBeingRead || '';
              const domain = displayUrl.includes('://') ? new URL(displayUrl).hostname : displayUrl;

              setDeepResearchProgress(prev => ({
                ...prev,
                currentStep: `${status}: ${domain}`,
                actionLog: prev?.actionLog || []
              }));
            } else if (thought.eventType === 'thinking') {
              // Show thinking status
              setDeepResearchProgress(prev => ({
                ...prev,
                currentStep: '🤔 Thinking...',
                actionLog: prev?.actionLog || []
              }));
            } else if (thought.thought) {
              // Regular thought event - show action or thinking
              setDeepResearchProgress(prev => {
                const newLog = data.thought.action && data.thought.actionDetails ?
                  [...(prev?.actionLog || []), `${data.thought.action}: ${data.thought.actionDetails}`] :
                  (prev?.actionLog || []);

                return {
                  currentStep: data.thought.action ? `Action: ${data.thought.action}` : 'Analyzing...',
                  actionLog: newLog,
                  currentThought: data.thought
                };
              });
            }
          } else if (data.type === 'complete') {
            const aiMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: data.result.finalAnswer,
              timestamp: new Date(),
              sources: data.result.sources,
              isStreaming: true
            };
            setMessages(prev => [...prev, aiMessage]);
            setIsLoading(false);

            if (conversationId) {
              await apiClient.addMessage(conversationId, {
                role: 'assistant',
                content: data.result.finalAnswer,
                citations: JSON.stringify(data.result.sources)
              });
            }
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          setIsLoading(false);
          setDeepResearchProgress(null);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "Deep research encountered an error. Please try again.",
            timestamp: new Date()
          }]);
        };
      }
      // Handle Regular Search (All, Quick, Academic)
      else {
        let focusMode = 'general';
        if (searchMode === 'quick') focusMode = 'quick-search';
        if (searchMode === 'academic') focusMode = 'academic';

        console.log('🔍 Making search request with params:', {
          query: currentQuery,
          focusMode,
          forceWebSearch: includeWebSearch,
          conversationId
        });

        const response = await apiClient.searchResources({
          q: currentQuery,
          timezone: userTimezone,
          focusMode,
          forceWebSearch: includeWebSearch,
          conversationId: conversationId || undefined
        });

        if (response.success && response.data) {
          console.log('Search Response Data:', response.data); // Debug log
          let aiContent = response.ai?.chatResponse || response.ai?.summary || "Here's what I found.";

          // Collect sources
          let sources: any[] = [];
          if (response.data.resources) {
            sources = [...sources, ...response.data.resources.map((r: any) => ({ title: r.title, url: '#', type: 'local' }))];
          }
          if (response.data.webResults) {
            sources = [...sources, ...response.data.webResults.map((r: any) => ({ title: r.title, url: r.url, type: 'web' }))];
          }
          if (response.data.learningResults) {
            sources = [...sources, ...response.data.learningResults.map((r: any) => ({
              title: r.title || r.name || 'Learning Module',
              url: `/learning/${r.subject_id}/${r.id}`,
              type: 'academic'
            }))];
          }

          // Check if web search was requested but returned nothing
          const webSearchRequested = includeWebSearch;
          const hasWebResults = response.data.webResults && response.data.webResults.length > 0;

          // If web search was on but got no results, add a note
          if (webSearchRequested && !hasWebResults && sources.length === 0) {
            aiContent = "I couldn't find any local resources or web results. Web search may be temporarily unavailable due to rate limits. Try again later or disable web search.";
          } else if (webSearchRequested && !hasWebResults) {
            aiContent += "\n\n_Note: Web search was unavailable (rate limited). Showing local results only._";
          }

          console.log('Aggregated Sources:', sources); // Debug log

          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: aiContent,
            timestamp: new Date(),
            sources: sources,
            suggestions: response.ai?.suggestions,
            isStreaming: true
          };
          setMessages(prev => [...prev, aiMessage]);

          if (conversationId) {
            await apiClient.addMessage(conversationId, {
              role: 'assistant',
              content: aiContent,
              citations: JSON.stringify(sources),
              suggestions: JSON.stringify(response.ai?.suggestions)
            });
          }
        } else {
          throw new Error(response.error || 'Search failed');
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Search failed:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error while searching. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setQuery('');
    setIsSidebarOpen(false);
  };

  const loadConversation = async (id: string) => {
    try {
      const response = await apiClient.getConversation(id);
      if (response.success && response.data) {
        setCurrentConversationId(id);
        setMessages(response.data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          sources: msg.citations ? JSON.parse(msg.citations) : [],
          suggestions: msg.suggestions ? JSON.parse(msg.suggestions) : [],
          isStreaming: false
        })));
        setIsSidebarOpen(false);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-void-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - History (Responsive) */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-64 bg-void-950 lg:bg-transparent border-r lg:border-none border-starlight-100/10 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col gap-4 p-4 lg:p-0
      `}>
        <div className="flex items-center justify-between lg:hidden mb-2">
          <h2 className="text-lg font-bold text-starlight-100">History</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-starlight-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <Button
          onClick={startNewChat}
          leftIcon={<Plus className="w-4 h-4" />}
          fullWidth
          variant="secondary"
          className="justify-start"
        >
          New Chat
        </Button>

        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
          <h3 className="text-xs font-bold text-starlight-500 uppercase tracking-wider mb-3 px-2">Recent Chats</h3>
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`w-full text-left p-3 rounded-lg text-sm transition-all duration-200 group border ${currentConversationId === conv.id
                ? 'bg-neon-blue/10 border-neon-blue/30 text-starlight-100'
                : 'bg-void-900/50 border-transparent hover:bg-void-800 hover:border-starlight-100/10 text-starlight-400'
                }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className={`w-3 h-3 ${currentConversationId === conv.id ? 'text-neon-blue' : 'text-starlight-600'}`} />
                <span className="truncate font-medium">{conv.title || 'New Conversation'}</span>
              </div>
              <span className="text-[10px] text-starlight-600 pl-5">
                {new Date(conv.lastMessageAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-void-900/30 border border-starlight-100/5 rounded-2xl overflow-hidden relative">
        {/* Mobile Header */}
        <div className="lg:hidden p-4 border-b border-starlight-100/5 flex items-center justify-between bg-void-900/50 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-starlight-400 hover:text-white"
          >
            <History className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-starlight-200">Search</span>
          <div className="w-8" /> {/* Spacer */}
        </div>

        {messages.length === 0 ? (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center pt-20 lg:pt-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center mb-8 shadow-lg shadow-neon-blue/20 animate-float">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-display font-bold text-starlight-100 mb-4">
              What can I help you <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">find today?</span>
            </h2>

            {/* Search Mode Toggles */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {[
                { id: 'all', label: 'All', icon: LayoutGrid },
                { id: 'quick', label: 'Quick', icon: Zap },
                { id: 'academic', label: 'Academic', icon: GraduationCap },
                { id: 'deep-research', label: 'Deep Research', icon: Brain }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSearchMode(mode.id as SearchMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${searchMode === mode.id
                    ? 'bg-neon-blue/10 border-neon-blue text-neon-blue shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                    : 'bg-void-900 border-starlight-100/10 text-starlight-400 hover:border-starlight-100/30 hover:text-starlight-200'
                    }`}
                >
                  <mode.icon className="w-4 h-4" />
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
              {[
                "Summarize my notes on React hooks",
                "Find the PDF about system design",
                "What did I learn about graph databases?",
                "Create a study plan for machine learning"
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(suggestion)}
                  className="p-4 rounded-xl bg-void-900 border border-starlight-100/5 hover:border-neon-blue/30 hover:bg-void-800 transition-all text-left text-sm text-starlight-300 hover:text-starlight-100 group"
                >
                  <span className="flex items-center justify-between">
                    {suggestion}
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-neon-blue" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Messages List
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar pt-16 lg:pt-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'order-1' : 'order-2'}`}>
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                      ? 'bg-void-800 text-starlight-100 border border-starlight-100/10'
                      : 'bg-void-900/50 text-starlight-200 border border-starlight-100/5'
                      }`}
                  >
                    {msg.role === 'assistant' ? (
                      <MessageContent content={msg.content} isStreaming={msg.isStreaming} />
                    ) : (
                      msg.content
                    )}
                  </div>

                  {msg.sources && msg.sources.length > 0 && (
                    <ResourceCarousel resources={msg.sources} />
                  )}

                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => setQuery(suggestion)}
                          className="text-xs px-3 py-1.5 rounded-full bg-neon-blue/10 text-neon-blue border border-neon-blue/20 hover:bg-neon-blue/20 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-void-800 border border-starlight-100/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-5 h-5 text-starlight-400" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading / Deep Research Progress */}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="w-full max-w-2xl">
                  {deepResearchProgress ? (
                    <ResearchProgress
                      currentStep={deepResearchProgress.currentStep}
                      actionLog={deepResearchProgress.actionLog}
                      currentThought={deepResearchProgress.currentThought}
                      currentQuery={deepResearchProgress.currentQuery}
                      searchResults={deepResearchProgress.searchResults}
                    />
                  ) : (
                    <StandardSearchLoading query={messages[messages.length - 1]?.content || "Searching..."} />
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-void-950 border-t border-starlight-100/5">
          <form onSubmit={handleSearch} className="relative max-w-4xl mx-auto">
            {/* Mode Indicator (Mini) */}
            {messages.length > 0 && (
              <div className="flex justify-center mb-2">
                <div className="flex gap-2">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'quick', label: 'Quick' },
                    { id: 'academic', label: 'Academic' },
                    { id: 'deep-research', label: 'Deep' }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSearchMode(mode.id as SearchMode)}
                      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded transition-colors ${searchMode === mode.id ? 'text-neon-blue bg-neon-blue/10' : 'text-starlight-500 hover:text-starlight-300'
                        }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchMode === 'deep-research' ? "Ask a complex question for deep analysis..." : "Ask anything..."}
                className="w-full bg-void-900 text-starlight-100 placeholder-starlight-500 border border-starlight-100/10 rounded-xl py-4 pl-12 pr-14 focus:outline-none focus:border-neon-blue/50 focus:bg-void-800 transition-all relative z-10"
              />
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-starlight-500 z-20" />
              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-neon-blue text-white rounded-lg hover:bg-neon-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors z-20 shadow-lg shadow-neon-blue/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between px-2">
              <div className="flex items-center gap-4 text-[10px] text-starlight-600 font-mono uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Command className="w-3 h-3" /> + K to search
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIncludeWebSearch(!includeWebSearch)}
                className={`flex items-center gap-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${includeWebSearch
                  ? 'text-neon-green bg-neon-green/10 border border-neon-green/30'
                  : 'text-red-400 bg-red-400/10 border border-red-400/30'
                  } hover:opacity-80`}
              >
                <div className={`w-2 h-2 rounded-full ${includeWebSearch
                  ? 'bg-neon-green shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse'
                  : 'bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.4)]'
                  }`} />
                Web Search {includeWebSearch ? 'On' : 'Off'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Search;