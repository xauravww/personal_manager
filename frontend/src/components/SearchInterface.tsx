import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Search,
  Menu,
  X,
  History,
  BookOpen,
  Zap,
  Brain,
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
  Plus
} from 'lucide-react';
import { apiClient } from '../api/client';

interface SearchResult {
  id: string;
  title: string;
  type: 'document' | 'image' | 'note' | 'task';
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

type FocusMode = 'general' | 'deep-research' | 'quick-search' | 'academic';

const SearchInterface: React.FC = () => {
  const focusModes = [
    { id: 'general' as FocusMode, label: 'General', icon: Search },
    { id: 'deep-research' as FocusMode, label: 'Deep Research', icon: Brain },
    { id: 'quick-search' as FocusMode, label: 'Quick Search', icon: Zap },
    { id: 'academic' as FocusMode, label: 'Academic', icon: GraduationCap },
  ];

  const [focusMode, setFocusMode] = useState<FocusMode>('general');
  const [enabledModes, setEnabledModes] = useState<FocusMode[]>(['general', 'deep-research', 'quick-search', 'academic']);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I\'m your AI assistant. Ask me anything about your resources, and I\'ll help you find what you need.',
      timestamp: new Date()
    }
  ]);

  const clearChat = () => {
    setConversation([
      {
        id: '1',
        type: 'ai',
        content: 'Hello! I\'m your AI assistant. Ask me anything about your resources, and I\'ll help you find what you need.',
        timestamp: new Date()
      }
    ]);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);

    // Add to history
    const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));

    // Add user message
    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: searchQuery,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMessage]);

    try {
      const response = await apiClient.searchResources({
        q: searchQuery,
      });

    let structuredAnswer = '';
    let citations: Citation[] = [];
    let aiContent = '';
    let results: SearchResult[] = [];

    if (response.ai && response.ai.intent === 'chat') {
      aiContent = response.ai.chatResponse || "Hello! I'm your AI assistant for personal resources. How can I help you?";
      results = [];
    } else {
      if (response.success && response.data) {
        const searchResults = response.data.resources;
        results = searchResults.map(resource => ({
          id: resource.id,
          title: resource.title,
          type: resource.type as SearchResult['type'],
          content: resource.content || resource.description || '',
          tags: resource.tags.map(tag => tag.name),
          createdAt: new Date(resource.created_at).toLocaleDateString(),
          relevance: 0.9 // Could be calculated based on search score
        }));

        // Use backend's helpful message if available (for no results with suggestions)
        if (response.data.message) {
          aiContent = response.data.message;
        } else if (results.length > 0) {
          aiContent = `I found ${results.length} resources related to "${searchQuery}". Here are the most relevant results:`;
        } else {
          aiContent = `I couldn't find any resources related to "${searchQuery}". Try different keywords or adjust your focus mode.`;
        }
      } else {
        aiContent = `I couldn't find any resources related to "${searchQuery}". Try different keywords or adjust your focus mode.`;
      }
    }

    // Generate citations
    citations = results.map((result, index) => ({
      id: (index + 1).toString(),
      title: result.title,
      url: result.url || '#',
      snippet: result.content.substring(0, 150) + '...'
    }));

    const aiMessage: ConversationMessage = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: aiContent,
      structuredAnswer,
      timestamp: new Date(),
      results: results.length > 0 ? results : undefined,
      citations: citations.length > 0 ? citations : undefined,
      suggestions: response.ai?.suggestions
    };

    setConversation(prev => [...prev, aiMessage]);
    } catch (error) {
      const aiMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error while searching. Please try again.',
        timestamp: new Date()
      };

      setConversation(prev => [...prev, aiMessage]);
    } finally {
      setIsLoading(false);
      setQuery('');
    }
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    handleSearch(historyQuery);
  };

  const removeHistoryItem = (item: string) => {
    const newHistory = searchHistory.filter(h => h !== item);
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'document':
        return <FileText className="w-5 h-5 text-blue-500" strokeWidth={1.5} />;
      case 'image':
        return <Image className="w-5 h-5 text-green-500" strokeWidth={1.5} />;
      case 'note':
        return <StickyNote className="w-5 h-5 text-yellow-500" strokeWidth={1.5} />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" strokeWidth={1.5} />;
    }
  };

  const renderCitations = (citations: Citation[]) => (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Sources</h4>
      <div className="space-y-2">
        {citations.map((citation) => (
          <div key={citation.id} className="flex items-start gap-2 text-sm">
            <span className="text-blue-500 font-medium">[{citation.id}]</span>
            <div className="flex-1">
              <a href={citation.url} className="text-blue-600 hover:underline flex items-center gap-1">
                {citation.title}
                <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
              </a>
              <p className="text-gray-600 mt-1">{citation.snippet}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 relative overflow-hidden" style={{ height: '100vh', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:absolute lg:top-0 lg:left-0 lg:h-full lg:w-80 flex flex-col`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Search Options</h2>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* Search History */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <History className="w-4 h-4" strokeWidth={1.5} />
              Recent Searches
            </h3>
            <div className="space-y-1">
              {searchHistory.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 text-sm text-gray-600 hover:bg-gray-50 rounded transition-colors">
                  <button
                    onClick={() => handleHistoryClick(item)}
                    className="flex-1 text-left truncate"
                  >
                    {item}
                  </button>
                  <button
                    onClick={() => removeHistoryItem(item)}
                    className="text-gray-400 hover:text-red-500 ml-2"
                  >
                    <X className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          </div>


        </div>
      </div>

      {/* Main Content */}
      <div className="absolute inset-0 lg:left-80 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <Menu className="w-6 h-6" strokeWidth={1.5} />
          </button>
          <div className="flex-1 max-w-2xl mx-auto">
            <h1 className="text-xl font-semibold text-gray-900 text-center">Personal Resource Manager</h1>
          </div>
          <div className="w-6 lg:w-0"></div> {/* Spacer */}
        </header>

        {/* Search Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-8 lg:px-6">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSearch(query)}
                placeholder="Ask me anything about your resources..."
                disabled={isLoading}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex gap-2">
                {(query.trim() || conversation.length > 1) && (
                  <button
                    onClick={clearChat}
                    disabled={isLoading}
                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Clear chat"
                  >
                    <X className="w-6 h-6" strokeWidth={1.5} />
                  </button>
                )}
                <button
                  onClick={() => handleSearch(query)}
                  disabled={isLoading || !query.trim()}
                  className="text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Search"
                >
                  <Search className="w-6 h-6" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
              <span className="px-3 py-1 bg-gray-100 rounded-full">{focusModes.find(m => m.id === focusMode)?.label}</span>
            </div>
          </div>
        </div>

        {/* Focus Mode Capsules */}
        <div className="bg-white border-b border-gray-200 px-4 py-4 lg:px-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 flex-wrap">
              {enabledModes.map((modeId) => {
                const mode = focusModes.find(m => m.id === modeId);
                if (!mode) return null;
                return (
                  <button
                    key={modeId}
                    onClick={() => setFocusMode(modeId)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors ${
                      focusMode === modeId ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <mode.icon className="w-4 h-4" strokeWidth={1.5} />
                    {mode.label}
                    <X
                      className="w-3 h-3 ml-1 hover:text-red-500"
                      strokeWidth={1.5}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEnabledModes(enabledModes.filter(m => m !== modeId));
                      }}
                    />
                  </button>
                );
              })}
              {enabledModes.length < focusModes.length && (
                <button
                  onClick={() => setEnabledModes(focusModes.map(m => m.id))}
                  className="flex items-center gap-2 px-3 py-2 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  Add Mode
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 px-4 py-6 lg:px-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-4">
            {conversation.map((message) => (
              <div key={message.id} className={`flex mb-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%]">
                  <div className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === 'user' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                    }`}>
                      {message.type === 'user' ? <User className="w-4 h-4" strokeWidth={1.5} /> : <Bot className="w-4 h-4" strokeWidth={1.5} />}
                    </div>
                     <div className={`rounded-2xl px-4 py-3 ${
                       message.type === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'
                     }`}>
                       <div className={`prose prose-sm max-w-none ${message.type === 'user' ? 'prose-invert' : ''}`}>
                         {message.type === 'user' ? (
                           <p className="leading-relaxed m-0">{message.content}</p>
                         ) : (
                           <div className="leading-relaxed m-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                             <ReactMarkdown>
                               {message.content}
                             </ReactMarkdown>
                           </div>
                         )}
                       </div>
                     </div>
                  </div>

                  {message.results && message.type === 'ai' && (
                    <div className="mt-4 ml-11">
                      <p>Found {message.results.length} results</p>
                    </div>
                  )}

                  {message.citations && message.type === 'ai' && renderCitations(message.citations)}

                  {message.suggestions && message.suggestions.length > 0 && message.type === 'ai' && (
                    <div className="mt-4 ml-11 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 mb-3">Try these search terms:</h4>
                      <div className="flex flex-wrap gap-3">
                        {message.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSearch(suggestion)}
                            className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors shadow-sm"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-2 ml-11">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}

            <div ref={chatEndRef} />

            {/* Loading State */}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <Bot className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="animate-pulse bg-gray-200 h-4 rounded w-3/4"></div>
                  <div className="animate-pulse bg-gray-200 h-4 rounded w-1/2"></div>
                  <div className="animate-pulse bg-gray-200 h-4 rounded w-2/3"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}
    </div>
  );
};

export default SearchInterface;