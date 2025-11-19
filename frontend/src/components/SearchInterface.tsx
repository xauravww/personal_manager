import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Search,
  X,
  BookOpen,
  Zap,
  GraduationCap,
  ChevronDown,
  ExternalLink,
  FileText,
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
  Clock,
  MessageSquare
} from 'lucide-react';
import { apiClient, API_BASE_URL } from '../api/client';

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

type FocusMode = 'general' | 'quick-search' | 'academic';
type SearchMode = 'normal' | 'deep-research';

const SearchInterface: React.FC = () => {
  const focusModes = [
    {
      id: 'general' as FocusMode,
      label: 'General',
      icon: Search,
      description: 'Balanced search across your resources with AI enhancement for relevant results'
    },
    {
      id: 'quick-search' as FocusMode,
      label: 'Quick Search',
      icon: Zap,
      description: 'Fast, lightweight search focused on immediate, relevant matches from your resources'
    },
    {
      id: 'academic' as FocusMode,
      label: 'Academic',
      icon: GraduationCap,
      description: 'Scholarly approach with emphasis on credible sources, citations, and thorough verification'
    },
  ];

  const [focusMode, setFocusMode] = useState<FocusMode>('general');
  const [enabledModes, setEnabledModes] = useState<FocusMode[]>(['general', 'quick-search', 'academic']);
  const [searchMode, setSearchMode] = useState<SearchMode>('normal');
   const [aiEnhancedSearch, setAiEnhancedSearch] = useState<boolean>(true);
   const [includeWebSearch, setIncludeWebSearch] = useState<boolean>(false);
    const [useSequentialThinking, setUseSequentialThinking] = useState<boolean>(false);
    const [sequentialThinkingErrors, setSequentialThinkingErrors] = useState<boolean>(false);
   const [userTimezone, setUserTimezone] = useState<string>('UTC');

  const [query, setQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [deepResearchProgress, setDeepResearchProgress] = useState<{
    current: number;
    total: number;
    currentStep: string;
    status: 'idle' | 'searching' | 'thinking' | 'reading' | 'analyzing' | 'complete' | 'error';
    currentThought?: any;
    latestTotalThoughts?: number;
  } | null>(null);
  const [deepResearchEventSource, setDeepResearchEventSource] = useState<EventSource | null>(null);
  const [researchAnalysisExpanded, setResearchAnalysisExpanded] = useState<boolean>(false);
  const [currentResearchResult, setCurrentResearchResult] = useState<{
    finalAnswer: string;
    thoughtProcess: any[];
    confidence: number;
    sources: any[];
  } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);


  const [conversation, setConversation] = useState<ConversationMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I\'m your AI assistant. Ask me anything about your resources, and I\'ll help you find what you need.',
      timestamp: new Date()
    }
  ]);

  // Load conversation from localStorage on component mount
  useEffect(() => {
    try {
      const savedConversation = localStorage.getItem('searchConversation');
      if (savedConversation) {
        const parsedConversation = JSON.parse(savedConversation);
        // Validate that it's an array and has the expected structure
        if (Array.isArray(parsedConversation) && parsedConversation.length > 0) {
          const validatedConversation = parsedConversation
            .filter((msg: any) =>
              msg &&
              typeof msg === 'object' &&
              (msg.type === 'user' || msg.type === 'ai') &&
              typeof msg.content === 'string' &&
              msg.timestamp
            )
            .map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }))
            .slice(-20); // Limit to last 20 messages to prevent excessive storage

          if (validatedConversation.length > 0) {
            setConversation(validatedConversation);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load conversation from localStorage:', error);
      // Clear corrupted data
      try {
        localStorage.removeItem('searchConversation');
      } catch (clearError) {
        console.warn('Failed to clear corrupted conversation data:', clearError);
      }
    }
  }, []);

  // Save conversation to localStorage whenever it changes
  useEffect(() => {
    try {
      // Limit conversation size before saving (keep last 20 messages)
      const conversationToSave = conversation.slice(-20);
      localStorage.setItem('searchConversation', JSON.stringify(conversationToSave));
    } catch (error) {
      console.warn('Failed to save conversation to localStorage:', error);
      // If localStorage is full, try to clear old data and retry
      try {
        localStorage.removeItem('searchConversation');
        const conversationToSave = conversation.slice(-10); // Save fewer messages on retry
        localStorage.setItem('searchConversation', JSON.stringify(conversationToSave));
      } catch (retryError) {
        console.warn('Failed to save conversation even after clearing:', retryError);
      }
    }
  }, [conversation]);

  const clearChat = () => {
    setConversation([
      {
        id: '1',
        type: 'ai',
        content: 'Hello! I\'m your AI assistant. Ask me anything about your resources, and I\'ll help you find what you need.',
        timestamp: new Date()
      }
    ]);
    setCurrentResearchResult(null);
    setResearchAnalysisExpanded(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Cleanup EventSource on unmount or mode change
  useEffect(() => {
    return () => {
      if (deepResearchEventSource) {
        deepResearchEventSource.close();
      }
    };
  }, [deepResearchEventSource]);

  // Cleanup when search mode changes
  useEffect(() => {
    if (deepResearchEventSource && searchMode !== 'deep-research') {
      deepResearchEventSource.close();
      setDeepResearchEventSource(null);
      setDeepResearchProgress(null);
    }
  }, [searchMode, deepResearchEventSource]);

  // Detect user's timezone on component mount
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(timezone);
  }, []);

  // Load search history from localStorage on component mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('searchHistory');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          setSearchHistory(parsedHistory.slice(0, 10)); // Limit to 10 items
        }
      }
    } catch (error) {
      console.warn('Failed to parse search history from localStorage:', error);
      try {
        localStorage.removeItem('searchHistory');
      } catch (clearError) {
        console.warn('Failed to clear corrupted search history:', clearError);
      }
    }
  }, []);

  const handleSearch = async (searchQuery: string, options: { forceWebSearch?: boolean } = {}) => {
    if (!searchQuery.trim()) return;

    console.log('🔍 Starting search');
    console.log('🔐 Is authenticated:', apiClient.isAuthenticated());
    console.log('🎫 Auth token exists:', !!localStorage.getItem('authToken'));

    // Clear previous research result
    setCurrentResearchResult(null);
    setResearchAnalysisExpanded(false);
    setSequentialThinkingErrors(false);

    if (!apiClient.isAuthenticated()) {
      console.error('❌ Not authenticated - cannot make search request');
      const errorMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'You need to log in to use the search functionality. Please go to the login page.',
        timestamp: new Date()
      };
      setConversation(prev => [...prev, errorMessage]);
      return;
    }

    setIsLoading(true);

    // Add to history
    const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10);
    setSearchHistory(newHistory);
    try {
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.warn('Failed to save search history to localStorage:', error);
    }

    // Add user message
    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: searchQuery,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMessage]);

    // Handle Deep Research Mode
    if (searchMode === 'deep-research') {
      console.log('🧠 Starting deep research mode inline');
      setDeepResearchProgress({ current: 0, total: 5, currentStep: 'Initializing research...' });

      try {
        const eventSource = await apiClient.performDeepResearch({
          query: searchQuery,
          maxThoughts: 10,
          timezone: userTimezone,
          includeWebSearch: includeWebSearch
        });

        setDeepResearchEventSource(eventSource);

        let aiContent = '';
        let currentStep = '';
        let thoughtProcess: any[] = [];
        let sources: any[] = [];
        let finalResult = '';
        let latestTotalThoughts = 5;
        let researchCompleted = false;
        let errorShown = false;

        eventSource.onmessage = (event) => {
          try {
            // Handle the [DONE] message
            if (event.data === '[DONE]') {
              console.log('Deep research stream completed');
              eventSource.close();
              setDeepResearchEventSource(null);
              // Clear progress after a short delay to show completion
              setTimeout(() => {
                setDeepResearchProgress(null);
              }, 2000);
              return;
            }

            const data = JSON.parse(event.data);
            console.log('Deep research event:', data.type, data);

            if (data.type === 'start') {
              setDeepResearchProgress({
                current: 0,
                total: 5,
                currentStep: 'Initializing research...',
                status: 'searching',
                latestTotalThoughts: 5
              });
            } else if (data.type === 'thought') {
              const thought = data.thought;

              // Check if this is an intermediate status thought (decimal thought number)
              const isIntermediate = thought.thoughtNumber % 1 !== 0;

              if (isIntermediate) {
                // Update status based on intermediate thought
                let status: 'searching' | 'thinking' | 'reading' | 'analyzing' = 'thinking';
                if (thought.action === 'search') {
                  status = 'searching';
                } else if (thought.action === 'read_url') {
                  status = 'reading';
                } else if (thought.action === 'analyze') {
                  status = 'analyzing';
                }

                setDeepResearchProgress(prev => prev ? {
                  ...prev,
                  status,
                  currentStep: getResearchStatusText(status),
                  currentThought: thought
                } : null);
                // Don't add intermediate thoughts to the main thoughts list
                return;
              }

              // Update latest total thoughts estimate
              latestTotalThoughts = Math.max(latestTotalThoughts, thought.totalThoughts);

              // Set new current thought
              thoughtProcess.push(thought);

              // Update status based on completed thought action
              let status: 'searching' | 'thinking' | 'reading' | 'analyzing' = 'thinking';
              if (thought.action === 'search') {
                status = 'searching';
              } else if (thought.action === 'read_url') {
                status = 'reading';
              } else if (thought.action === 'analyze') {
                status = 'analyzing';
              }

              setDeepResearchProgress({
                current: thought.thoughtNumber,
                total: latestTotalThoughts,
                currentStep: getResearchStatusText(status),
                status,
                currentThought: thought,
                latestTotalThoughts
              });
             } else if (data.type === 'complete') {
               console.log('Deep research completed successfully');
               researchCompleted = true;
               setDeepResearchProgress(prev => prev ? { ...prev, status: 'complete' } : null);
               setIsLoading(false);
               // Don't close the EventSource here, let it close naturally with [DONE]

               // Store the research result for display
               setCurrentResearchResult({
                 finalAnswer: data.result.finalAnswer,
                 thoughtProcess: thoughtProcess,
                 confidence: data.result.confidence,
                 sources: data.result.sources || []
               });

               // Use the clean final answer directly
               let content = data.result.finalAnswer;

              const aiMessage: ConversationMessage = {
                id: (Date.now() + 2).toString(),
                type: 'ai',
                content: content,
                timestamp: new Date(),
                citations: data.result.sources?.map((source: any, index: number) => ({
                  id: `source-${index + 1}`,
                  title: source.title || source.url,
                  url: source.url,
                  snippet: source.snippet || source.content?.substring(0, 200) + '...' || ''
                })) || []
              };

              setConversation(prev => [...prev, aiMessage]);
            } else if (data.type === 'error') {
              if (!researchCompleted && !errorShown) {
                errorShown = true;
                setError(data.message);
                setDeepResearchProgress(prev => prev ? { ...prev, status: 'error' } : null);
                setIsLoading(false);
                eventSource.close();
                setDeepResearchEventSource(null);

                const errorMessage: ConversationMessage = {
                  id: (Date.now() + 2).toString(),
                  type: 'ai',
                  content: `Sorry, I encountered an error during deep research: ${data.message}`,
                  timestamp: new Date()
                };
                setConversation(prev => [...prev, errorMessage]);
              }
            }
          } catch (parseError) {
            console.error('Error parsing deep research event:', parseError);
          }
        };

        eventSource.onopen = () => {
          console.log('Deep research EventSource opened successfully');
        };

        eventSource.onerror = (error) => {
          console.error('Deep research EventSource error:', error, 'Research completed:', researchCompleted, 'Error shown:', errorShown);

          // Delay error handling to allow complete event to process first
          setTimeout(() => {
            if (!researchCompleted && !errorShown) {
              errorShown = true;
              console.log('Showing error message for deep research');
              const errorMessage: ConversationMessage = {
                id: (Date.now() + 2).toString(),
                type: 'ai',
                content: 'Sorry, I encountered a connection error during deep research. Please try again.',
                timestamp: new Date()
              };
              setConversation(prev => [...prev, errorMessage]);
              setDeepResearchProgress(null);
              setIsLoading(false);
            }
            eventSource.close();
            setDeepResearchEventSource(null);
          }, 1000); // Wait 1 second for complete event
        };



      } catch (error) {
        console.error('❌ Deep research error:', error);
        const aiMessage: ConversationMessage = {
          id: (Date.now() + 2).toString(),
          type: 'ai',
          content: 'Sorry, I encountered an error starting deep research. Please try again.',
          timestamp: new Date()
        };
        setConversation(prev => [...prev, aiMessage]);
      } finally {
        setIsLoading(false);
        setDeepResearchProgress(null);
        setQuery('');
      }

      return;
    }

    try {


      // Check if query is JUST a URL
      const urlRegex = /^https?:\/\/[^\s]+$/i;
      const trimmedQuery = searchQuery.trim();
      const isUrlQuery = urlRegex.test(trimmedQuery) && trimmedQuery.split(/\s+/).length === 1;

      let aiContent = '';
      let citations: Citation[] = [];
      let results: SearchResult[] = [];
      let webResults: any[] = [];

      console.log('🔄 Using regular search path');
      console.log('🔑 Auth status:', apiClient.isAuthenticated());
      console.log('🎯 Search query:', searchQuery);
      console.log('🔗 Is URL query:', isUrlQuery);

      if (isUrlQuery) {
        console.log('🌐 Detected as URL query, handling URL reading');
        // Handle URL reading
        const urlResponse = await apiClient.readUrlContent({
          url: searchQuery.trim(),
        });

        let aiContent = '';
        if (urlResponse.success && urlResponse.data) {
          aiContent = `Here's the content from ${urlResponse.data.url} (processed in ${urlResponse.data.processingTime}ms):\n\n${urlResponse.data.content}`;
        } else {
          aiContent = `Sorry, I couldn't read the URL: ${urlResponse.error || 'Unknown error'}`;
        }

        const aiMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: aiContent,
          timestamp: new Date()
        };

        setConversation(prev => [...prev, aiMessage]);
      } else {
        console.log('🔍 About to call apiClient.searchResources');
        console.log('📊 Search params:', {
          q: searchQuery,
          timezone: userTimezone,
          focusMode: focusMode,
          forceWebSearch: options.forceWebSearch || includeWebSearch
        });

        // Prepare conversation context (exclude current message and initial greeting)
        const conversationContext = conversation
          .filter(msg => msg.id !== '1') // Exclude initial greeting
          .slice(0, -1) // Exclude the last message (current user input)
          .slice(-5) // Keep only last 5 messages for context
          .map(msg => ({ type: msg.type, content: msg.content }));

        // Use AI-enhanced search that determines intent and combines sources
        console.log('🚀 Making API call now...');
        const response = await apiClient.searchResources({
          q: searchQuery,
          timezone: userTimezone,
          focusMode: focusMode,
          forceWebSearch: options.forceWebSearch || includeWebSearch,
          useMCP: useSequentialThinking,
          conversation: conversationContext,
        });
        console.log('✅ API call completed, response:', response);

        let aiContent = '';
        let citations: Citation[] = [];
        let results: SearchResult[] = [];
        let webResults: any[] = [];

        // Check if this is a chat intent (no search needed)
        if (response.ai && response.ai.intent === 'chat') {
          aiContent = response.ai.chatResponse || "Hello! I'm your AI assistant for personal resources. How can I help you?";
        } else {
          // This is a search query, proceed with search logic
          // First, check local resources
          if (response.success && response.data && response.data.resources.length > 0) {
            const searchResults = response.data.resources;
            results = searchResults.map(resource => ({
              id: resource.id,
              title: resource.title,
              type: resource.type as SearchResult['type'],
              content: resource.content || resource.description || '',
              tags: resource.tags.map(tag => tag.name),
              createdAt: new Date(resource.created_at).toLocaleDateString(),
              relevance: 0.9
            }));
          }

          // Get web results from backend response
          if (response.data && response.data.webResults) {
            webResults = response.data.webResults;
          }


        }



        // Generate AI-enhanced response
        if (response.ai && response.ai.intent === 'chat') {
          // Chat response - no need for web search or local results
          aiContent = response.ai.chatResponse || "Hello! I'm your AI assistant for personal resources. How can I help you?";

           // Deep research results are handled separately - don't add thought process to content
        } else {
          // Use AI-generated summary from backend if available
          if (response.ai && response.ai.summary) {
            aiContent = response.ai.summary;
          } else {
            // Fallback to basic combination if no AI summary
            const hasLocalResults = results.length > 0;
            const hasWebResults = webResults.length > 0;
            const hasSequentialResults = response.ai?.mcpResults && response.ai.mcpResults.length > 0;

            if (hasLocalResults && hasWebResults && hasSequentialResults) {
              aiContent = `I found information from multiple sources for "${searchQuery}":\n\n**From your resources:**\n${results.slice(0, 3).map((r, i) => `${i + 1}. ${r.title} (${r.type})`).join('\n')}\n\n**From the web:**\n${webResults.slice(0, 3).map((r, i) => `${i + 1}. ${r.title}`).join('\n')}\n\n**Sequential analysis:**\n${response.ai.mcpResults.slice(0, 1).map((r, i) => r.success ? `Step-by-step reasoning applied` : `Analysis failed: ${r.error}`).join('\n')}\n\nWould you like me to show more details from any of these sources?`;
            } else if (hasLocalResults && hasSequentialResults) {
              aiContent = `I found information from your resources and used sequential thinking for "${searchQuery}":\n\n**From your resources:**\n${results.slice(0, 3).map((r, i) => `${i + 1}. ${r.title} (${r.type})`).join('\n')}\n\n**Sequential analysis:**\n${response.ai.mcpResults.slice(0, 1).map((r, i) => r.success ? `Step-by-step reasoning applied` : `Analysis failed: ${r.error}`).join('\n')}\n\nWould you like me to show more details from any of these sources?`;
            } else if (hasWebResults && hasSequentialResults) {
              aiContent = `I found information from the web and used sequential thinking for "${searchQuery}":\n\n**From the web:**\n${webResults.slice(0, 3).map((r, i) => `${i + 1}. ${r.title}`).join('\n')}\n\n**Sequential analysis:**\n${response.ai.mcpResults.slice(0, 1).map((r, i) => r.success ? `Step-by-step reasoning applied` : `Analysis failed: ${r.error}`).join('\n')}\n\nWould you like me to show more details from any of these sources?`;
            } else if (hasLocalResults) {
              aiContent = `I found ${results.length} relevant resources in your collection for "${searchQuery}". Here are the most relevant:`;
            } else if (hasWebResults) {
              aiContent = `I didn't find local resources for "${searchQuery}", but here's what I found on the web (${webResults.length} results):`;
            } else if (hasSequentialResults) {
              aiContent = `I used sequential thinking to analyze "${searchQuery}". ${response.ai.mcpResults[0].success ? 'Here\'s the step-by-step analysis:' : `Analysis failed: ${response.ai.mcpResults[0].error}`}`;
            } else {
              const searchSources = ['your resources'];
              if (includeWebSearch) searchSources.push('on the web');
              if (useSequentialThinking) searchSources.push('through sequential analysis');
              aiContent = `I couldn't find relevant information for "${searchQuery}" in ${searchSources.join(', ')}. Try rephrasing your query or check your search terms.`;
            }
          }
        }

        // Generate citations from all sources (local, web, MCP)
        citations = [
          ...results.map((result, index) => ({
            id: `local-${index + 1}`,
            title: result.title,
            url: result.url || '#',
            snippet: result.content.substring(0, 150) + '...'
          })),
          ...webResults.map((result, index) => ({
            id: `web-${index + 1}`,
            title: result.title,
            url: result.url,
            snippet: result.content.substring(0, 200) + '...'
          })),
          // Add sequential thinking results as citations
          ...(response.ai?.mcpResults || []).map((mcpResult, index) => ({
            id: `sequential-${index + 1}`,
            title: `Sequential Thinking Analysis${!mcpResult.success ? ' (failed)' : ''}`,
            url: '#',
            snippet: mcpResult.success
              ? (mcpResult.result?.thinking ? mcpResult.result.thinking.substring(0, 200) + '...' : 'Step-by-step analysis completed')
              : `Error: ${mcpResult.error || 'Analysis failed'}`
          }))
        ];

        // Update sequential thinking error state
        const hasSequentialErrors = response.ai?.mcpResults ? response.ai.mcpResults.some(r => !r.success) : false;
        setSequentialThinkingErrors(hasSequentialErrors);

        const aiMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: aiContent,
          timestamp: new Date(),
          results: (response.ai?.intent !== 'chat' && results.length > 0) ? results : undefined,
          citations: (response.ai?.intent !== 'chat' && citations.length > 0) ? citations : undefined,
          suggestions: response.ai?.suggestions
        };

        setConversation(prev => [...prev, aiMessage]);
      }


    } catch (error) {
      console.error('❌ Search error:', error);
      console.error('❌ Error stack:', error.stack);

      const aiMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
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
    try {
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.warn('Failed to save search history to localStorage:', error);
    }
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'document':
        return <FileText className="w-5 h-5 text-blue-500" strokeWidth={1.5} />;

      case 'note':
        return <StickyNote className="w-5 h-5 text-yellow-500" strokeWidth={1.5} />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" strokeWidth={1.5} />;
    }
  };

  const getResearchStatusIcon = (status: string) => {
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

  const getResearchStatusText = (status: string) => {
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
        return 'Initializing research...';
    }
  };

  const getThoughtIcon = (thought: any) => {
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


        {/* Main Content */}
        <div className="absolute inset-0 flex flex-col overflow-hidden">




        {/* Search Controls */}
        <div className="bg-white border-b border-gray-200 px-4 py-6 lg:px-6">
           <div className="max-w-4xl mx-auto">
             <div className="mb-6">
               <h2 className="text-2xl font-bold text-gray-900 tracking-tight">AI Search Controls</h2>
             </div>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSearch(query)}
                   placeholder={
                     searchMode === 'deep-research'
                       ? "Enter a research topic for comprehensive AI-powered analysis..."
                       : aiEnhancedSearch
                        ? `Ask me anything about your resources${useSequentialThinking ? ' (with sequential thinking)' : ''}, paste a URL to read its content, or search the web...`
                       : "Ask me anything about your resources..."
                   }
                 disabled={isLoading}
                  className="w-full px-6 py-4 rounded-full focus:outline-none focus:ring-2 text-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 border border-gray-300 focus:ring-blue-500 focus:border-transparent"
              />
               <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex gap-2">
                  {useSequentialThinking && (
                    <div className="flex items-center text-green-600" title="Sequential thinking enabled">
                      <Brain className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                  )}
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
             <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                    {focusModes.find(m => m.id === focusMode)?.label}
                  </span>
                </div>

                   {/* Search Toggles */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Brain className="w-4 h-4" strokeWidth={1.5} />
                          Deep Research
                        </span>
                        <button
                          onClick={() => setSearchMode(searchMode === 'normal' ? 'deep-research' : 'normal')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            searchMode === 'deep-research' ? 'bg-indigo-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              searchMode === 'deep-research' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                       <span className="text-sm text-gray-500">AI Enhanced</span>
                      <button
                        onClick={() => setAiEnhancedSearch(!aiEnhancedSearch)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          aiEnhancedSearch ? 'bg-purple-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            aiEnhancedSearch ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                     <div className="flex items-center gap-2">
                       <span className="text-sm text-gray-500">Web Search</span>
                       <button
                         onClick={() => setIncludeWebSearch(!includeWebSearch)}
                         className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                           includeWebSearch ? 'bg-orange-500' : 'bg-gray-300'
                         }`}
                       >
                         <span
                           className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                             includeWebSearch ? 'translate-x-6' : 'translate-x-1'
                           }`}
                         />
                       </button>
                     </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Brain className="w-4 h-4" strokeWidth={1.5} />
                          Sequential Thinking
                          {useSequentialThinking && sequentialThinkingErrors && (
                            <span className="text-xs text-red-500" title="Sequential thinking failed">(!)</span>
                          )}
                        </span>
                        <button
                          onClick={() => setUseSequentialThinking(!useSequentialThinking)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            useSequentialThinking ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              useSequentialThinking ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                       </button>
                     </div>

                  </div>
             </div>

             {/* Focus Mode Capsules */}
             <div className="border-t border-gray-100 pt-6 mt-6">
               <div className="mb-4">
                 <h3 className="text-lg font-semibold text-gray-900">Search Modes</h3>
               </div>
            <div className="flex items-center gap-2 flex-wrap">
              {enabledModes.map((modeId) => {
                const mode = focusModes.find(m => m.id === modeId);
                if (!mode) return null;
                return (
                  <div key={modeId} className="relative group">
                    <button
                      onClick={() => setFocusMode(modeId)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors ${
                        focusMode === modeId ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={mode.description}
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
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      {mode.description}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
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
            {/* Current mode description */}
            {focusMode && (
              <div className="mt-3 text-center">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Current mode:</span> {focusModes.find(m => m.id === focusMode)?.description}
                </p>
              </div>
              )}
              </div>

               {/* Sequential Thinking Configuration */}
               {useSequentialThinking && (
                 <div className="border-t border-gray-100 pt-6 mt-6">
                   <div className="flex items-center gap-2 mb-2">
                     <Brain className="w-4 h-4 text-green-600" strokeWidth={1.5} />
                     <span className="text-sm font-medium text-gray-900">Sequential Thinking</span>
                   </div>
                    <p className="text-xs text-gray-600">
                      When enabled, complex queries will use step-by-step reasoning to provide more thorough analysis.
                      This is particularly useful for questions requiring logical analysis, problem-solving, or multi-step explanations.
                    </p>
                  </div>
               )}
            </div>
          </div>



        {/* Main Content Area */}
        <div className="flex-1 px-4 py-6 lg:px-6 overflow-y-auto">
          <div className="w-full">
            {/* Conversation Section Title */}
            <div className="mb-6 px-4">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Conversation</h2>
            </div>
            {/* Conversation/Chat Area */}
            <div className="space-y-4 px-4">
                {conversation.map((message) => (
                  <div key={message.id} className={`flex mb-4 px-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%]">
                    <div className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                       <div className="relative">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                           message.type === 'user' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                         }`}>
                           {message.type === 'user' ? <User className="w-4 h-4" strokeWidth={1.5} /> : <Bot className="w-4 h-4" strokeWidth={1.5} />}
                         </div>
                         {message.type === 'ai' && conversation.length > 1 && (
                           <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center" title="Using conversation context">
                             <MessageSquare className="w-2 h-2 text-white" strokeWidth={2} />
                           </div>
                         )}
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

                     {message.type === 'ai' && conversation.length > 1 && (
                       <div className="ml-11 mt-1">
                         <span className="text-xs text-gray-500 flex items-center gap-1">
                           <MessageSquare className="w-3 h-3" strokeWidth={1.5} />
                           Using conversation context
                         </span>
                       </div>
                     )}

                     {message.results && message.type === 'ai' && (
                      <div className="mt-4 ml-11">
                        <p>Found {message.results.length} results</p>
                      </div>
                    )}

                    {message.citations && message.type === 'ai' && renderCitations(message.citations)}

                      {message.suggestions && message.suggestions.length > 0 && message.type === 'ai' && (
                        <div className="mt-4 ml-11 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                          <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            <div className="w-5 h-5 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Search className="w-3 h-3 text-blue-700" strokeWidth={1.5} />
                            </div>
                            Suggested follow-ups
                          </h4>
                          <div className="flex flex-wrap gap-3">
                            {message.suggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() => handleSearch(suggestion)}
                                className="px-4 py-2 bg-white text-blue-800 rounded-full text-sm font-medium hover:bg-blue-50 transition-all duration-200 shadow-sm border border-blue-200 hover:border-blue-300 hover:shadow-md"
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

               {/* Research Analysis for Latest AI Message */}
               {currentResearchResult && currentResearchResult.thoughtProcess && currentResearchResult.thoughtProcess.length > 0 && (
                 <div className="mt-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
                   <button
                     onClick={() => setResearchAnalysisExpanded(!researchAnalysisExpanded)}
                     className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                   >
                     <div className="flex items-center gap-3">
                       <Brain className="w-5 h-5 text-purple-600" strokeWidth={1.5} />
                       <span className="font-medium text-gray-900">Research Analysis</span>
                       <span className="text-sm text-gray-600">({currentResearchResult.thoughtProcess.length} steps)</span>
                     </div>
                     <ChevronDown
                       className={`w-5 h-5 text-gray-500 transition-transform ${researchAnalysisExpanded ? 'rotate-180' : ''}`}
                       strokeWidth={1.5}
                     />
                   </button>

                   {researchAnalysisExpanded && (
                     <div className="border-t border-gray-200">
                       <div className="max-h-96 overflow-y-auto">
                         {currentResearchResult.thoughtProcess.map((thought, index) => (
                           <div key={index} className="px-6 py-4 border-b border-gray-100 last:border-b-0">
                             <div className="flex items-start gap-4">
                               <div className="flex-shrink-0 mt-1">
                                 {getThoughtIcon(thought)}
                               </div>
                               <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 mb-3">
                                   <h4 className="text-lg font-semibold text-gray-900">
                                     {thought.isRevision ? 'Revision' : thought.action ? `${thought.action.replace('_', ' ').toUpperCase()}` : 'Analysis'}
                                   </h4>
                                   {thought.isRevision && (
                                     <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                                       Revising step {thought.revisesThought}
                                     </span>
                                   )}
                                 </div>

                                 <div className="prose prose-sm max-w-none text-gray-700 mb-4">
                                   <ReactMarkdown>{thought.thought}</ReactMarkdown>
                                 </div>

                                 {thought.actionDetails && (
                                   <div className="mb-4 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-400">
                                     <div className="text-sm text-gray-600 mb-2">Action Details:</div>
                                     <div className="text-sm font-mono text-gray-800 break-all">
                                       {thought.actionDetails}
                                     </div>
                                   </div>
                                 )}

                                 {thought.result && (
                                   <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                     <div className="text-sm text-green-700 mb-2 font-medium">Result:</div>
                                     <div className="text-sm text-green-800 whitespace-pre-wrap break-words">
                                       {thought.result.length > 500 ? `${thought.result.substring(0, 500)}...` : thought.result}
                                     </div>
                                   </div>
                                 )}

                                 <div className="mt-4 text-xs text-gray-500 flex items-center gap-4">
                                   <span>{new Date(thought.timestamp).toLocaleTimeString()}</span>
                                   {!thought.nextThoughtNeeded && (
                                     <span className="text-green-600 font-medium">Final step</span>
                                   )}
                                 </div>
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>
               )}

               <div ref={chatEndRef} />

                 {/* Loading State */}
                 {isLoading && !deepResearchProgress && (
                   <div className="flex gap-4 px-4">
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

                 {/* Deep Research Progress */}
                 {deepResearchProgress && (
                   <div className="flex gap-4 px-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white">
                      {getResearchStatusIcon(deepResearchProgress.status)}
                    </div>
                    <div className="flex-1">
                      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        {/* Header with status */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                              <Brain className="w-5 h-5 text-white" strokeWidth={1.5} />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">Deep Research</h3>
                              <p className="text-sm text-gray-600">{getResearchStatusText(deepResearchProgress.status)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (deepResearchEventSource) {
                                  deepResearchEventSource.close();
                                  setDeepResearchEventSource(null);
                                }
                                setDeepResearchProgress(null);
                                setIsLoading(false);
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              title="Cancel research"
                            >
                              <X className="w-5 h-5" strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>Step {deepResearchProgress.current} of {deepResearchProgress.latestTotalThoughts || deepResearchProgress.total}</span>
                            <span>{Math.round((deepResearchProgress.current / (deepResearchProgress.latestTotalThoughts || deepResearchProgress.total)) * 100)}% complete</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${Math.min((deepResearchProgress.current / (deepResearchProgress.latestTotalThoughts || deepResearchProgress.total)) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Current Thought Content */}
                        {deepResearchProgress.currentThought && (
                          <div className="animate-fade-in">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 mt-1">
                                {getThoughtIcon(deepResearchProgress.currentThought)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-3">
                                  <h4 className="text-xl font-semibold text-gray-900">
                                    {deepResearchProgress.currentThought.isRevision ? 'Revision' : deepResearchProgress.currentThought.action ? `${deepResearchProgress.currentThought.action.replace('_', ' ').toUpperCase()}` : 'Analysis'}
                                  </h4>
                                  {deepResearchProgress.currentThought.isRevision && (
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                                      Revising step {deepResearchProgress.currentThought.revisesThought}
                                    </span>
                                  )}
                                </div>

                                <div className="prose prose-lg max-w-none text-gray-700 mb-4">
                                  <ReactMarkdown>{deepResearchProgress.currentThought.thought}</ReactMarkdown>
                                </div>

                                {deepResearchProgress.currentThought.actionDetails && (
                                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-400">
                                    <div className="text-sm text-gray-600 mb-2">Action Details:</div>
                                    <div className="text-sm font-mono text-gray-800 break-all">
                                      {deepResearchProgress.currentThought.actionDetails}
                                    </div>
                                  </div>
                                )}

                                {deepResearchProgress.currentThought.result && (
                                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                    <div className="text-sm text-green-700 mb-2 font-medium">Result:</div>
                                    <div className="text-sm text-green-800 whitespace-pre-wrap break-words">
                                      {deepResearchProgress.currentThought.result.length > 500 ? `${deepResearchProgress.currentThought.result.substring(0, 500)}...` : deepResearchProgress.currentThought.result}
                                    </div>
                                  </div>
                                )}

                                <div className="mt-4 text-xs text-gray-500 flex items-center gap-4">
                                  <span>{new Date(deepResearchProgress.currentThought.timestamp).toLocaleTimeString()}</span>
                                  {!deepResearchProgress.currentThought.nextThoughtNeeded && (
                                    <span className="text-green-600 font-medium">Final step</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}




            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default SearchInterface;