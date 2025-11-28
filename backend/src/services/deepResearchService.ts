import { aiService } from './aiService';
import { performWebSearch } from '../utils/webSearch';
import { readUrlContent } from '../utils/urlReader';
import prisma from '../config/database';

export interface SearchPreview {
  title: string;
  url: string;
}

export interface SourceStatus {
  url: string;
  title: string;
  status: 'queued' | 'reading' | 'completed' | 'failed' | 'skipped';
  reason?: string;
}

export interface DeepResearchThought {
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
  timestamp: Date;
  // New granular event fields
  eventType?: 'thinking' | 'searching' | 'search_results' | 'reading_url' | 'evaluation' | 'sources_update' | 'thought';
  searchQuery?: string;
  searchResultsCount?: number;
  searchPreview?: SearchPreview[];
  urlBeingRead?: string;
  urlTitle?: string;
  urlStatus?: 'started' | 'completed' | 'failed';
  evaluationDecision?: 'continue' | 'refine' | 'stop';
  evaluationReason?: string;
  sourcesStatus?: SourceStatus[];
}

export interface DeepResearchResult {
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

export class DeepResearchService {
  private thoughtHistory: DeepResearchThought[] = [];
  private sources: Array<{
    url: string;
    title: string;
    content: string;
    relevance: number;
  }> = [];
  private finalConfidence: number = 0;
  private finalAnswer: string = '';
  private includeWebSearch: boolean = true;
  private userId?: string;
  private prisma: typeof prisma;

  // URL tracking and pagination state
  private searchResultsCache: Map<string, any[]> = new Map();
  private checkedUrls: Set<string> = new Set();
  private currentSearchOffset: number = 0;
  private maxUrlAttemptsPerSearch: number = 5;
  private maxSearchOffset: number = 100; // Don't paginate beyond 100 results

  constructor(userId?: string) {
    this.userId = userId;
    this.prisma = prisma;
    this.reset();
  }

  private reset(): void {
    this.thoughtHistory = [];
    this.sources = [];
    this.finalConfidence = 0;
    this.includeWebSearch = true;

    // Reset URL tracking and pagination state
    this.searchResultsCache.clear();
    this.checkedUrls.clear();
    this.currentSearchOffset = 0;
  }

  private estimateConfidence(): number {
    // Calculate confidence based on sources gathered
    const sourceCount = this.sources.length;

    if (sourceCount === 0) return 0;
    if (sourceCount === 1) return 30;
    if (sourceCount === 2) return 50;

    // Base confidence from source count (capped at 70)
    let confidence = Math.min(40 + (sourceCount * 10), 70);

    // Bonus for source quality (average relevance)
    const avgRelevance = this.sources.reduce((sum, s) => sum + (s.relevance || 0.5), 0) / sourceCount;
    confidence += avgRelevance * 20; // Up to +20 bonus

    // Bonus for source diversity (different domains)
    const uniqueDomains = new Set(this.sources.map(s => {
      try {
        return new URL(s.url).hostname;
      } catch {
        return s.url;
      }
    }));
    const diversityBonus = Math.min(uniqueDomains.size * 3, 15); // Up to +15 bonus
    confidence += diversityBonus;

    return Math.min(Math.round(confidence), 100);
  }

  private formatThought(thoughtData: DeepResearchThought): string {
    const { thoughtNumber, totalThoughts, thought, action, result, isRevision, revisesThought } = thoughtData;

    let prefix = '';
    let context = '';

    if (isRevision) {
      prefix = '🔄 Revision';
      context = ` (revising thought ${revisesThought})`;
    } else if (action) {
      prefix = '🔍 Research';
      context = ` (${action})`;
    } else {
      prefix = '💭 Thought';
      context = '';
    }

    const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context}`;
    const border = '─'.repeat(Math.max(header.length, (thought || '').length) + 4);

    let display = `
┌${border}┐
│ ${header} │
├${border}┤
│ ${(thought || '').padEnd(border.length - 2)} │`;

    if (result) {
      const resultHeader = '📊 Result';
      const resultBorder = '─'.repeat(Math.max(resultHeader.length, result.length) + 4);
      display += `
├${resultBorder}┤
│ ${resultHeader} │
├${resultBorder}┤
│ ${result.padEnd(resultBorder.length - 2)} │`;
    }

    display += `
└${border}┘`;

    return display;
  }

  /**
   * Get the next untried URL from search results cache
   * @param queryKey - The search query key to look up cached results
   * @returns Next unchecked URL or null if all have been tried
   */
  private getNextUntriedUrl(queryKey: string): { url: string; title: string } | null {
    const cachedResults = this.searchResultsCache.get(queryKey);
    if (!cachedResults || cachedResults.length === 0) {
      return null;
    }

    // Find first URL that hasn't been checked
    for (const result of cachedResults) {
      if (!this.checkedUrls.has(result.url)) {
        return { url: result.url, title: result.title };
      }
    }

    return null;
  }

  /**
   * Check if we should paginate the search to get more results
   * @param queryKey - The search query key
   * @returns true if should fetch more results, false otherwise
   */
  private shouldPaginateSearch(queryKey: string): boolean {
    const cachedResults = this.searchResultsCache.get(queryKey);
    if (!cachedResults || cachedResults.length === 0) {
      return true; // No results yet, should search
    }

    // Check if all URLs from current batch have been tried
    const allTried = cachedResults.every(result => this.checkedUrls.has(result.url));

    // Only paginate if all tried AND we haven't exceeded max offset
    return allTried && this.currentSearchOffset < this.maxSearchOffset;
  }

  private async executeResearchAction(action: string, actionDetails: string, originalQuery: string): Promise<string> {
    try {
      switch (action) {
        case 'search_local': {
          if (this.includeWebSearch) {
            return `Local search is not available when web search is enabled. Use 'search' for web results.`;
          }

          if (!this.userId) {
            return `User authentication required for local resource search.`;
          }

          console.log(`📚 Searching local resources for: "${actionDetails}"`);

          try {
            // Parse actionDetails to extract individual search terms
            // Handle various formats: quoted terms, comma-separated, etc.
            let searchTerms: string[] = [];

            // Extract quoted terms (both single and double quotes)
            const quotedTerms = actionDetails.match(/['"]([^'"]+)['"]/g);
            if (quotedTerms && quotedTerms.length > 0) {
              searchTerms = quotedTerms.map(term => term.slice(1, -1)); // Remove quotes
            } else {
              // Fallback: split by common separators and clean up
              searchTerms = actionDetails
                .split(/[,;]|\sand\s|\sor\s|\sor\s/)
                .map(term => term.trim().toLowerCase())
                .filter(term => term.length > 2) // Ignore very short terms
                .filter(term => !term.includes('search') && !term.includes('keywords') && !term.includes('terms') && !term.includes('like') && !term.includes('user') && !term.includes('local') && !term.includes('resources')); // Filter out meta words
            }

            // If still no terms found, try to extract meaningful words
            if (searchTerms.length === 0) {
              // Extract words that look like they could be search terms
              const words = actionDetails.toLowerCase().match(/\b\w{4,}\b/g) || [];
              searchTerms = words.filter(word =>
                !['search', 'keywords', 'terms', 'like', 'user', 'local', 'resources', 'find', 'documents', 'notes', 'guides'].includes(word)
              );
            }

            // Final fallback: use key parts of the query
            if (searchTerms.length === 0) {
              searchTerms = ['python']; // Default to the main topic
            }



            // Use Prisma's built-in query methods for better reliability
            const orConditions = searchTerms.flatMap(term => [
              { title: { contains: term } },
              { content: { contains: term } },
              { description: { contains: term } }
            ]);

            const userResources = await this.prisma.resource.findMany({
              where: {
                user_id: this.userId,
                OR: orConditions
              },
              take: 10
            });

            if (userResources.length === 0) {
              return `No local resources found matching: "${actionDetails}"`;
            }

            // Calculate relevance and format results
            const localResults = userResources.map((resource: any) => {
              let relevance = 0.5; // Base relevance

              const title = resource.title.toLowerCase();
              const content = (resource.content || '').toLowerCase();
              const description = (resource.description || '').toLowerCase();

              // Calculate relevance based on how many search terms match
              let matchCount = 0;
              for (const term of searchTerms) {
                if (title.includes(term)) matchCount += 3; // Title matches are most important
                if (content.includes(term)) matchCount += 2; // Content matches are important
                if (description.includes(term)) matchCount += 1; // Description matches are least important
              }

              // Normalize relevance score (0-1)
              relevance = Math.min(matchCount / (searchTerms.length * 3), 1.0);

              return {
                id: resource.id,
                title: resource.title,
                type: resource.type,
                content: resource.content || resource.description || '',
                tags: [], // Tags will be handled separately if needed
                relevance: relevance
              };
            });

            // Sort by relevance
            localResults.sort((a: any, b: any) => b.relevance - a.relevance);

            const formattedResults = localResults.map((r: any, i: number) =>
              `${i + 1}. ${r.title} (${r.type})\n   ${r.content.substring(0, 150)}...\n   Tags: ${r.tags.join(', ')}\n   Relevance: ${Math.round(r.relevance * 100)}%`
            ).join('\n\n');

            // Store sources for citation
            localResults.forEach((r: any) => {
              this.sources.push({
                url: `#resource-${r.id}`,
                title: r.title,
                content: r.content,
                relevance: r.relevance
              });
            });

            return `Found ${localResults.length} relevant local resources:\n${formattedResults}`;
          } catch (error) {
            console.error('Error searching local resources:', error);
            return `Error searching local resources: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        }

        case 'search': {
          if (!this.includeWebSearch) {
            return `Web search is disabled. Use 'search_local' to search through your personal resources instead of web search.`;
          }

          // Calculate page number based on current offset (20 results per page)
          const pageNumber = Math.floor(this.currentSearchOffset / 20) + 1;

          console.log(`🔍 Performing web search for: "${actionDetails}" (page: ${pageNumber}, offset: ${this.currentSearchOffset})`);

          try {
            const searchResults = await performWebSearch(actionDetails, {
              pageno: pageNumber,
              time_range: 'month',
              categories: 'it,news,science',
              engines: 'duckduckgo,google,wikipedia',
              enabled_engines: 'duckduckgo,google',
              language: 'en',
              safesearch: 1
            });

            // Filter out academic/research content and irrelevant results
            const filteredResults = this.filterWebSearchResults(searchResults.results || [], actionDetails);

            console.log(`📊 Response status: 200, Results: ${filteredResults.length}`);
            console.log(`✅ Web search successful, found ${filteredResults.length} results`);
            console.log(`Filtered web results: ${searchResults.results?.length || 0} -> ${filteredResults.length}`);

            // Cache ALL results (up to 20), not just 5
            const queryKey = actionDetails.toLowerCase();
            const existingResults = this.searchResultsCache.get(queryKey) || [];

            // Append new results to existing cache
            const allResults = [...existingResults, ...filteredResults];
            this.searchResultsCache.set(queryKey, allResults);

            // Update offset for next pagination
            this.currentSearchOffset += filteredResults.length;

            // Show preview of first 5 results
            const previewResults = filteredResults.slice(0, 5);
            const formattedResults = previewResults.map((r: any, i: number) =>
              `${i + 1}. ${r.title} - ${r.url}\n   ${r.content?.substring(0, 150)}...`
            ).join('\n\n');

            // Store PREVIEW sources (first 5 for AI to see)
            previewResults.forEach((r: any) => {
              this.sources.push({
                url: r.url,
                title: r.title,
                content: r.content || '',
                relevance: 0.8 // Default relevance
              });
            });

            const totalCached = allResults.length;
            console.log(`📊 Emitting search_results event: ${previewResults.length} results, ${previewResults.length} in preview`);

            return `Found ${previewResults.length} results:\n${formattedResults}\n\n💡 Total ${totalCached} URLs cached for fallback. Use READ action to fetch content from URLs.`;
          } catch (error) {
            console.warn(`Web search failed for "${actionDetails}":`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return `Web search failed: ${errorMessage}. Try searching your local resources instead using 'search_local' action with relevant keywords.`;
          }
        }

        case 'read_url': {
          if (!this.includeWebSearch) {
            return `Web access is disabled. Cannot read URL: "${actionDetails}". Please analyze available information from local resources only.`;
          }

          try {
            // Extract URL from actionDetails (AI sometimes includes extra text)
            const urlRegex = /(https?:\/\/[^\s]+)/;
            const match = actionDetails.match(urlRegex);
            let url = match ? match[1] : actionDetails.trim();

            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              return `Invalid URL format: ${actionDetails}. Please provide a valid URL starting with http:// or https://.`;
            }

            // Check if URL has already been checked
            if (this.checkedUrls.has(url)) {
              console.log(`⏭️ Skipping already checked URL: ${url}`);

              // Try to find an alternative URL from search cache
              const nextUrl = this.getNextUntriedUrl(originalQuery.toLowerCase());
              if (nextUrl) {
                console.log(`🔄 Trying alternative URL: ${nextUrl.url}`);
                url = nextUrl.url;
              } else {
                return `URL already checked. No more unchecked URLs available from search results. Consider running another SEARCH with different keywords.`;
              }
            }

            // Mark URL as checked (before attempting)
            this.checkedUrls.add(url);

            console.log(`📖 Reading URL: ${url}`);

            // Use Jina AI Reader - modern web scraping like Perplexity uses
            const jinaUrl = `https://r.jina.ai/${url}`;
            console.log(`🔍 Using Jina AI Reader: ${jinaUrl}`);

            const response = await fetch(jinaUrl, {
              headers: {
                'Accept': 'text/plain',
                'X-Return-Format': 'markdown'
              }
            });

            let content = '';
            let readSuccess = false;

            if (!response.ok) {
              console.error(`❌ Jina Reader failed with status: ${response.status}`);

              // Fallback to original method
              console.log('⚠️ Trying fallback method...');
              const fallbackContent = await readUrlContent(url, 15000, {
                returnRaw: false,
                maxLength: 3000,
              });

              if (fallbackContent && fallbackContent.length >= 100) {
                content = fallbackContent;
                readSuccess = true;
              }
            } else {
              const rawContent = await response.text();

              if (!rawContent || rawContent.trim().length < 100) {
                console.log(`⚠️ Jina returned short content (${rawContent?.length || 0} chars), trying fallback...`);

                // Fallback to original readUrlContent
                const fallbackContent = await readUrlContent(url, 15000, {
                  returnRaw: false,
                  maxLength: 3000,
                });

                if (fallbackContent && fallbackContent.length >= 100) {
                  content = fallbackContent;
                  readSuccess = true;
                }
              } else {
                content = rawContent.trim().substring(0, 5000);
                readSuccess = true;
              }
            }

            // If read was successful, store and return
            if (readSuccess && content) {
              console.log(`✅ Successfully read ${content.length} chars from ${url}`);

              // Store in sources
              this.sources.push({
                url,
                title: url,
                content: content,
                relevance: 0.9
              });

              return `Content read (${content.length} chars): ${content.substring(0, 300)}...`;
            }

            // URL read failed - try fallback to next URL from cache
            console.log(`❌ Failed to read URL: ${url}`);

            const nextUrl = this.getNextUntriedUrl(originalQuery.toLowerCase());

            if (nextUrl) {
              console.log(`🔄 Automatically trying next URL from search results: ${nextUrl.url}`);

              // Mark this URL as checked
              this.checkedUrls.add(nextUrl.url);

              // Recursively try next URL (with limit to prevent infinite recursion)
              const attemptCount = this.checkedUrls.size;
              if (attemptCount < this.maxUrlAttemptsPerSearch) {
                return await this.executeResearchAction('read_url', nextUrl.url, originalQuery);
              } else {
                console.log(`⚠️ Reached max URL attempts (${this.maxUrlAttemptsPerSearch})`);

                // Check if we should paginate to get more results
                if (this.shouldPaginateSearch(originalQuery.toLowerCase())) {
                  console.log(`📄 All URLs from current batch tried. Suggesting pagination...`);
                  return `Failed to read URL "${url}" and tried ${attemptCount} URLs. All URLs from current search batch have been attempted. Consider running another SEARCH to fetch more results (next batch: ${this.currentSearchOffset}-${this.currentSearchOffset + 20}).`;
                }

                return `Failed to read URL "${url}". Tried ${attemptCount} URLs from search results without success. No more URLs available.`;
              }
            }

            // No more URLs to try
            console.log(`⚠️ No more untried URLs in cache`);

            // Check if should paginate
            if (this.shouldPaginateSearch(originalQuery.toLowerCase())) {
              return `Failed to read URL "${url}". No more unchecked URLs from current batch. Run another SEARCH to fetch more results (offset: ${this.currentSearchOffset}).`;
            }

            return `Failed to read URL "${url}": Content too short or empty. No more URLs available to try.`;
          } catch (error) {
            console.error(`Error reading URL ${actionDetails}:`, error);

            // Try fallback URL even on error
            const nextUrl = this.getNextUntriedUrl(originalQuery.toLowerCase());
            if (nextUrl && this.checkedUrls.size < this.maxUrlAttemptsPerSearch) {
              console.log(`🔄 Error occurred, trying alternative URL: ${nextUrl.url}`);
              this.checkedUrls.add(nextUrl.url);
              return await this.executeResearchAction('read_url', nextUrl.url, originalQuery);
            }

            return `Failed to read URL "${actionDetails}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        }

        case 'analyze':
          return `Analysis completed for: ${actionDetails}`;

        case 'extract_links': {
          // Extract links from previously read content
          const recentContent = this.sources[this.sources.length - 1]?.content || '';
          const linkRegex = /https?:\/\/[^\s<>"']+/g;
          const links = recentContent.match(linkRegex) || [];

          const uniqueLinks = [...new Set(links)].slice(0, 5);
          return `Extracted ${uniqueLinks.length} links: ${uniqueLinks.join(', ')}`;
        }

        default:
          return `Unknown action: ${action}`;
      }
    } catch (error) {
      console.warn(`Error executing action ${action}:`, error);
      return `Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  async *performDeepResearch(query: string, maxThoughts: number = 10, userTimezone?: string, includeWebSearch: boolean = true, userId?: string, learningContext?: any): AsyncIterable<DeepResearchThought> {
    this.reset();
    this.includeWebSearch = includeWebSearch;
    this.userId = userId;

    let currentThought = 1;
    let nextThoughtNeeded = true;
    let finalAnswer = '';
    let confidence = 0;
    const SAFETY_LIMIT = 15; // Safety limit to prevent infinite loops

    console.log(`🚀 Starting deep research for: "${query}" (timezone: ${userTimezone}, web search: ${includeWebSearch ? 'enabled' : 'disabled'})`);

    // Check if this is a time-related query that we can handle directly
    const timeKeywords = ['current time', 'what time', 'time now', 'what\'s the time', 'tell me the time', 'what time is it'];
    const isTimeQuery = timeKeywords.some(keyword =>
      query.toLowerCase().includes(keyword.toLowerCase())
    );

    if (isTimeQuery && userTimezone) {
      console.log('🕐 Detected time query, providing direct answer');

      const now = new Date();
      const timeString = now.toLocaleString('en-US', {
        timeZone: userTimezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      finalAnswer = `The current time is ${timeString} (${userTimezone}).`;
      confidence = 100;
      this.finalConfidence = confidence;

      // Yield direct answer thought
      const directAnswerThought: DeepResearchThought = {
        thoughtNumber: 1,
        totalThoughts: 1,
        thought: `Direct time lookup: ${finalAnswer}`,
        nextThoughtNeeded: false,
        timestamp: new Date()
      };

      this.thoughtHistory.push(directAnswerThought);
      yield directAnswerThought;

      console.log(`\n✅ Time query answered directly with ${confidence}% confidence`);
      return;
    }

    // Yield initial status for non-time queries
    const initThought: DeepResearchThought = {
      thoughtNumber: 0,
      totalThoughts: -1, // Unknown total - AI will decide
      thought: `Initializing deep research for: "${query}"`,
      eventType: 'thinking',
      nextThoughtNeeded: true,
      timestamp: new Date()
    };
    yield initThought;

    try {
      // AI-driven research loop - no hardcoded limit!
      while (nextThoughtNeeded && currentThought <= SAFETY_LIMIT) {
        console.log(`\n--- Research Step ${currentThought} ---`);

        // Yield thinking status
        const thinkingThought: DeepResearchThought = {
          thoughtNumber: currentThought - 0.5,
          totalThoughts: -1,
          thought: '',
          eventType: 'thinking',
          nextThoughtNeeded: true,
          timestamp: new Date()
        };
        yield thinkingThought;

        // Calculate current confidence based on sources gathered
        const currentConfidence = this.estimateConfidence();

        // Generate next thought using AI with confidence-based decision making
        const availableActions = includeWebSearch
          ? `- "SEARCH": Search the web for specific terms (provide concise queries like "React hooks tutorial")
- "READ": Read content from a specific URL
- "REFINE": Current results are poor, search with different keywords
- "SYNTHESIZE": Stop researching and provide answer (use when confidence >85%)`
          : `- "SEARCH_LOCAL": Search user's local resources
- "ANALYZE": Analyze existing information
- "SYNTHESIZE": Stop and provide answer (use when confidence >85%)`;

        const actionOptions = includeWebSearch
          ? `"action": "SEARCH|READ|REFINE|SYNTHESIZE"`
          : `"action": "SEARCH_LOCAL|ANALYZE|SYNTHESIZE"`;

        // Get current date and time in user's timezone
        const timezone = userTimezone || 'UTC';
        const now = new Date();
        const currentDateTime = now.toLocaleString('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          weekday: 'long'
        });

        let systemPrompt = `You are conducting ITERATIVE research on: "${query}"
Current date/time: ${currentDateTime}

CRITICAL DECISION LOGIC:
- Current confidence: ${currentConfidence}%
- Sources gathered: ${this.sources.length}
- Research steps taken: ${currentThought}

AUTOMATIC URL FALLBACK SYSTEM:
🔄 The system now has AUTOMATIC fallback for failed URL reads:
   - If a READ fails (empty content/JS issues), the system automatically tries alternative URLs from search cache
   - Up to 5 URLs will be attempted automatically before giving up
   - URLs are tracked to prevent duplicate attempts
   - If all URLs fail, the system will suggest pagination to fetch more results

⚠️ This means: DON'T immediately SYNTHESIZE after a single failed READ!
   → The system will handle fallback automatically
   → Only consider SYNTHESIZE if you've successfully read content from URLs

YOUR DECISION WORKFLOW:
1. If no sources yet → action: "SEARCH" (find relevant URLs)
2. If have search results but haven't read URLs → action: "READ" (the system will auto-try alternatives if it fails)
3. If READ succeeded and got content → assess if need more info or can SYNTHESIZE
4. If READ failed after trying all fallbacks → action: "SEARCH" with different keywords OR "SYNTHESIZE" with limited info
5. If have detailed info from multiple sources AND confidence >85% → action: "SYNTHESIZE"

⚠️ IMPORTANT: Don't SYNTHESIZE immediately after SEARCH!
   → After SEARCH, you should READ URLs to get actual content
   → System shows preview of 5 results but caches up to 20 URLs for fallback
   → Only SYNTHESIZE after successfully reading detailed information

Previous research:
${this.thoughtHistory.slice(-3).map(t => `• ${t.action || 'Thinking'}: ${t.thought.substring(0, 100)}`).join('\n')}

Sources gathered so far:
${this.sources.slice(0, 3).map(s => `• ${s.title} (${s.url})`).join('\n')}

Available actions:
${availableActions}

EXAMPLES OF GOOD WORKFLOW:
✓ Step 1: SEARCH "React hooks" → Found 8 results, cached 20 URLs → Confidence: 30%
✓ Step 2: READ first URL → Auto-fallback tries 3 URLs → One succeeds → Got detailed docs → Confidence: 70%
✓ Step 3: READ another URL → Got examples → Confidence: 92%
✓ Step 4: SYNTHESIZE (have detailed content from multiple sources)

✗ Step 1: SEARCH "React hooks" → Found 8 results → Confidence: 70%
✗ Step 2: READ first URL → Failed (but system has 19 more to try automatically)
✗ Step 3: SYNTHESIZE ❌ (BAD - didn't wait for automatic fallback, didn't try other URLs!)

Return JSON:
{
  "reasoning": "Why this decision? What info do I have/need?",
  ${actionOptions},
  "actionDetails": "SPECIFIC query or URL",
  "shouldContinue": true/false,
  "confidence": 0-100
}`;

        if (learningContext) {
          systemPrompt += `\n\nUSER LEARNING CONTEXT:
          - Completed Modules: ${learningContext.completedModules?.map((m: any) => m.title).join(', ') || 'None'}
          - Current Weaknesses: ${learningContext.weaknesses?.join(', ') || 'None'}
          - Recent Topics: ${learningContext.recentTopics?.join(', ') || 'None'}
          
          Consider this context when planning research. If the user is learning a topic, prioritize finding resources that address their weaknesses or build on completed modules.`;
        }

        systemPrompt += `
${includeWebSearch ? 'For search queries: Keep them short and direct (2-5 words maximum). Focus on practical content. Examples: "Next.js tutorial", "React beginner guide", "Python basics course", "JavaScript docs"' : 'For local search: Search user\'s personal resources (notes, documents, etc.) with specific keywords. Examples: "python tutorial", "machine learning notes", "web development project"'}

${includeWebSearch ? 'IMPORTANT: Avoid academic/research content. Prioritize tutorials, guides, documentation, and practical examples over research papers, academic journals, or scholarly articles. If web search fails (times out, network errors, etc.), immediately switch to search_local to search through the user\'s personal resources.' : ''}

Return JSON:
        {
          "thought": "Your current analysis and plan",
            ${actionOptions},
          "actionDetails": "CONCISE details${includeWebSearch ? ' - for search: 2-5 word practical query, for read_url: clean URL only' : ' - for search_local: specific search terms for user resources'}",
            "nextThoughtNeeded": true / false,
              "totalThoughts": estimated_total,
                "finalAnswer": "ONLY if confident (80%+), provide final answer",
                  "confidence": 0 - 100
        } `;

        let response: any;
        try {
          response = await aiService.createChatCompletion({
            model: aiService.getConfig().model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Execute thought step ${currentThought} for: ${query} ` }
            ],
            temperature: 0.3,
          });
        } catch (aiError) {
          console.error(`AI service failed on thought ${currentThought}:`, aiError);

          // Provide fallback analysis for common queries
          const fallbackAnalysis = this.generateFallbackAnalysis(query, currentThought, this.thoughtHistory);
          if (fallbackAnalysis) {
            response = {
              choices: [{
                message: {
                  content: JSON.stringify(fallbackAnalysis)
                }
              }]
            };
          } else {
            // Yield error thought to client
            const errorThought: DeepResearchThought = {
              thoughtNumber: currentThought,
              totalThoughts: -1,
              thought: `AI service unavailable: ${aiError instanceof Error ? aiError.message : 'Unknown error'}. Try searching your local resources instead.`,
              nextThoughtNeeded: false,
              timestamp: new Date()
            };
            yield errorThought;
            return;
          }
        }

        const content = response.choices[0]?.message?.content?.trim();
        if (!content) break;

        try {
          const thoughtResult = JSON.parse(content);

          // Execute the action if specified
          let actionResult = '';
          if (thoughtResult.action && thoughtResult.actionDetails) {
            console.log(`⚡ Executing action: ${thoughtResult.action} - ${thoughtResult.actionDetails}`);

            // Map new action names to existing methods
            let mappedAction = thoughtResult.action.toLowerCase();
            if (mappedAction === 'search') mappedAction = 'search';
            else if (mappedAction === 'read') mappedAction = 'read_url';
            else if (mappedAction === 'refine') mappedAction = 'search'; // REFINE is just a search with different keywords
            else if (mappedAction === 'search_local') mappedAction = 'search_local';
            else if (mappedAction === 'analyze') mappedAction = 'analyze';

            // Handle SYNTHESIZE action - stop researching
            if (thoughtResult.action.toUpperCase() === 'SYNTHESIZE') {
              console.log('🎯 AI decided to SYNTHESIZE - stopping research');
              nextThoughtNeeded = false;
              if (thoughtResult.confidence) {
                confidence = thoughtResult.confidence;
                this.finalConfidence = confidence;
              }
              // Skip to final synthesis
              break;
            }

            // Emit granular status event based on action type
            if (mappedAction === 'search' || mappedAction === 'search_local') {
              // Emit searching event with actual query
              const searchingEvent: DeepResearchThought = {
                thoughtNumber: currentThought - 0.4,
                totalThoughts: -1,
                thought: '',
                eventType: 'searching',
                searchQuery: thoughtResult.actionDetails,
                nextThoughtNeeded: true,
                timestamp: new Date()
              };
              yield searchingEvent;
            } else if (mappedAction === 'read_url') {
              // Emit URL reading start event
              const readingEvent: DeepResearchThought = {
                thoughtNumber: currentThought - 0.4,
                totalThoughts: -1,
                thought: '',
                eventType: 'reading_url',
                urlBeingRead: thoughtResult.actionDetails,
                urlTitle: thoughtResult.actionDetails,
                urlStatus: 'started',
                nextThoughtNeeded: true,
                timestamp: new Date()
              };
              yield readingEvent;
            }

            // Execute the action
            actionResult = await this.executeResearchAction(mappedAction, thoughtResult.actionDetails, query);

            // Emit completion event based on action type
            if (mappedAction === 'search' || mappedAction === 'search_local') {
              // Parse result count from actionResult
              const countMatch = actionResult.match(/Found (\d+)/);
              const resultsCount = countMatch ? parseInt(countMatch[1]) : 0;

              // Extract search preview (first 8 results to show as tags)
              const searchPreview: SearchPreview[] = [];
              const lines = actionResult.split('\n');
              for (let i = 0; i < lines.length && searchPreview.length < 8; i++) {
                const line = lines[i];
                const resultMatch = line.match(/^\d+\.\s+(.+?)\s+-\s+(https?:\/\/.+)$/);
                if (resultMatch) {
                  searchPreview.push({
                    title: resultMatch[1].trim(),
                    url: resultMatch[2].trim()
                  });
                }
              }

              console.log(`📊 Emitting search_results event: ${resultsCount} results, ${searchPreview.length} in preview`);

              const searchResultsEvent: DeepResearchThought = {
                thoughtNumber: currentThought - 0.2,
                totalThoughts: -1,
                thought: '',
                eventType: 'search_results',
                searchResultsCount: resultsCount,
                searchPreview: searchPreview,
                nextThoughtNeeded: true,
                timestamp: new Date()
              };
              yield searchResultsEvent;
            } else if (mappedAction === 'read_url') {
              // Emit URL reading completion
              const urlCompletedEvent: DeepResearchThought = {
                thoughtNumber: currentThought - 0.2,
                totalThoughts: -1,
                thought: '',
                eventType: 'reading_url',
                urlBeingRead: thoughtResult.actionDetails,
                urlTitle: thoughtResult.actionDetails,
                urlStatus: actionResult.includes('Failed') ? 'failed' : 'completed',
                nextThoughtNeeded: true,
                timestamp: new Date()
              };
              yield urlCompletedEvent;
            }
          }

          const thought: DeepResearchThought = {
            thoughtNumber: currentThought,
            totalThoughts: -1,
            thought: thoughtResult.reasoning || thoughtResult.thought || 'Analyzing information...',
            action: thoughtResult.action,
            actionDetails: thoughtResult.actionDetails,
            result: actionResult,
            nextThoughtNeeded: thoughtResult.shouldContinue !== false,
            timestamp: new Date()
          };

          this.thoughtHistory.push(thought);

          // Log the formatted thought
          console.error(this.formatThought(thought));

          // Yield the completed thought for streaming
          yield thought;

          // Update loop control based on AI decision
          nextThoughtNeeded = thoughtResult.shouldContinue !== false;

          // Update confidence if AI provided it
          if (thoughtResult.confidence && thoughtResult.confidence > 70) {
            finalAnswer = thoughtResult.finalAnswer || '';
            confidence = thoughtResult.confidence;
            this.finalConfidence = confidence;
            this.finalAnswer = finalAnswer;
            if (confidence > 85) {
              nextThoughtNeeded = false; // Stop if high confidence
            }
          }

          currentThought++;
        } catch (error) {
          console.warn(`Error parsing thought ${currentThought}:`, error);
          break;
        }
      }

      // Yield synthesis status
      const synthesisThought: DeepResearchThought = {
        thoughtNumber: currentThought,
        totalThoughts: -1,
        thought: 'Synthesizing final answer from all research findings...',
        nextThoughtNeeded: false,
        timestamp: new Date()
      };
      yield synthesisThought;

      // If no high-confidence answer was found, try to synthesize one
      if (!finalAnswer || confidence <= 70) {
        console.log('\n🔄 Synthesizing final answer from research...');
        const synthesis = await this.synthesizeFinalAnswer(query, userTimezone);
        if (synthesis.confidence > confidence) {
          finalAnswer = synthesis.answer;
          confidence = synthesis.confidence;
          this.finalConfidence = confidence;
          this.finalAnswer = finalAnswer;
        }
      }

      // Yield final thought with conclusion
      const finalThought: DeepResearchThought = {
        thoughtNumber: currentThought + 1,
        totalThoughts: -1,
        thought: `Research completed.${finalAnswer ? ` Final answer: ${finalAnswer}` : 'Unable to find a confident answer.'}`,
        nextThoughtNeeded: false,
        timestamp: new Date()
      };

      this.thoughtHistory.push(finalThought);
      yield finalThought;

      console.log(`\n✅ Deep research completed with ${confidence}% confidence`);

    } catch (error) {
      console.error('Error in deep research:', error);
      const errorThought: DeepResearchThought = {
        thoughtNumber: currentThought,
        totalThoughts: -1,
        thought: `Research failed due to error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextThoughtNeeded: false,
        timestamp: new Date()
      };
      yield errorThought;
    }
  }

  private filterWebSearchResults(results: any[], query: string): any[] {
    // Keywords that indicate academic/research content to filter out
    const academicKeywords = [
      'research paper', 'academic journal', 'doi:', 'abstract', 'citation',
      'peer-reviewed', 'scholarly article', 'conference proceedings',
      'phd thesis', 'dissertation', 'arxiv', 'pubmed', 'ieee', 'acm',
      'springer', 'wiley', 'elsevier', 'science direct', 'jstor',
      'researchgate', 'academia.edu', 'semantic scholar'
    ];

    // Keywords that indicate practical, beginner-friendly content
    const practicalKeywords = [
      'tutorial', 'guide', 'how to', 'beginner', 'introduction', 'basics',
      'getting started', 'examples', 'documentation', 'docs', 'learn',
      'course', 'class', 'lesson', 'step by step', 'easy', 'simple'
    ];

    // Filter out results that match academic keywords
    const filtered = results.filter(result => {
      const title = (result.title || '').toLowerCase();
      const content = (result.content || '').toLowerCase();
      const url = (result.url || '').toLowerCase();

      // Skip if title, content, or URL contains academic keywords
      const hasAcademicContent = academicKeywords.some(keyword =>
        title.includes(keyword) || content.includes(keyword) || url.includes(keyword)
      );

      if (hasAcademicContent) {
        console.log(`Filtering out academic result: ${result.title} `);
        return false;
      }

      // For programming/course queries, prefer practical content
      if (query.toLowerCase().includes('course') || query.toLowerCase().includes('learn') ||
        query.toLowerCase().includes('tutorial') || query.toLowerCase().includes('programming')) {
        const hasPracticalContent = practicalKeywords.some(keyword =>
          title.includes(keyword) || content.includes(keyword)
        );

        if (!hasPracticalContent) {
          console.log(`Filtering out non - practical result for learning query: ${result.title} `);
          return false;
        }
      }

      // Skip results with very short content (likely not useful)
      if (!result.content || result.content.length < 50) {
        console.log(`Filtering out result with insufficient content: ${result.title} `);
        return false;
      }

      return true;
    });

    console.log(`Filtered web results: ${results.length} -> ${filtered.length} `);
    return filtered;
  }

  private async synthesizeFinalAnswer(query: string, userTimezone?: string): Promise<{ answer: string, confidence: number }> {
    try {
      // Get current date and time in user's timezone
      const timezone = userTimezone || 'UTC';
      const now = new Date();
      const currentDateTime = now.toLocaleString('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'long'
      });

      // Use thoughtProcess (excluding final thought) to avoid confusion in synthesis
      const thoughtProcess = this.thoughtHistory.slice(0, -1);
      const thoughtsText = thoughtProcess.map(t =>
        `Thought ${t.thoughtNumber}: ${t.thought}${t.action ? ` | Action: ${t.action}` : ''}${t.result ? ` | Result: ${t.result}` : ''} `
      ).join('\n');

      const sourcesText = this.sources.slice(0, 5).map(s =>
        `Source: ${s.title} (${s.url}) \n${s.content.substring(0, 300)}...`
      ).join('\n\n');

      const systemPrompt = `You are a research synthesizer.Your ONLY task is to provide a final answer to: "${query}"
Current date and time: ${currentDateTime}

Based on the research that was conducted, provide a comprehensive and accurate answer.

          CRITICAL: Your answer MUST be PURE CONTENT ONLY.Do NOT include ANY research process details, methodology, or meta - information.

            FORBIDDEN: Do NOT include ANY of these words / phrases in your answer:
        "Research Analysis", "Step", "Research completed", "Final answer:", "Confidence", "Sources explored", "Research steps", "Thought", "Action", "Result", "Executing", "Performing", "Reading URL", "Deep research completed", "Synthesizing final answer", "research methodology", "sources", "citations", "confidence levels", "research process"

Your answer should be DIRECT CONTENT ONLY.Start immediately with the answer content.No headers, no meta - information, no process details.

EXAMPLE FORMAT(pure content only):
        "Key latest Indian news headlines include: RBI's export relief measures may pressure the Indian rupee by denting dollar flows; Indian stock benchmarks poised to open higher on improving earnings outlook; EU preparing to reject India's demand for exemption from carbon border tax; Blast at police station in Kashmir kills nine and injures 27; Guernsey's Indian community celebrates Diwali. Regional news: Bangladesh tribunal convicts ousted PM Sheikh Hasina of crimes against humanity."

Return ONLY this JSON - nothing else:
    {
      "answer": "PURE CONTENT ONLY - no research details, no steps, no analysis, no confidence, no sources mentioned",
      "confidence": 0-100
}`;

      const response = await aiService.createChatCompletion({
        model: aiService.getConfig().model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Synthesize final answer from research on: ${query} ` }
        ],
        temperature: 0.1,
      });

      const content = (response as any).choices[0]?.message?.content?.trim();
      if (content) {
        try {
          const synthesis = JSON.parse(content);
          const rawAnswer = synthesis.answer || 'No confident answer found through research';
          const cleanedAnswer = this.cleanFinalAnswer(rawAnswer);
          return {
            answer: cleanedAnswer,
            confidence: synthesis.confidence || 0
          };
        } catch (error) {
          console.warn('Error parsing synthesis:', error);
          // If JSON parsing fails, try to extract answer from the raw content
          const cleanedContent = this.cleanFinalAnswer(content);
          return { answer: cleanedContent || 'Unable to synthesize answer from research', confidence: 0 };
        }
      }
      return { answer: 'Research completed but no clear answer synthesized', confidence: 0 };
    } catch (error) {
      console.warn('Error synthesizing final answer:', error);
      return { answer: 'Error during answer synthesis', confidence: 0 };
    }
  }

  getResearchResult(): DeepResearchResult {
    // Use the stored finalAnswer if available, otherwise try to extract from final thought
    let finalAnswer = this.finalAnswer;

    if (!finalAnswer) {
      const finalThought = this.thoughtHistory[this.thoughtHistory.length - 1];
      finalAnswer = 'Research completed without definitive answer';

      if (finalThought) {
        // Check for direct time lookup
        if (finalThought.thought.includes('Direct time lookup:')) {
          finalAnswer = finalThought.thought.split('Direct time lookup:')[1].trim();
        }
        // Check for final answer
        else if (finalThought.thought.includes('Final answer:')) {
          let answer = finalThought.thought.split('Final answer:')[1].trim();
          // Clean the answer by removing any research steps or analysis that might be included
          answer = this.cleanFinalAnswer(answer);
          finalAnswer = answer;
        }
        // Check for research completed message
        else if (finalThought.thought.includes('Research completed.')) {
          const match = finalThought.thought.match(/Final answer:\s*(.+)/);
          if (match) {
            let answer = match[1].trim();
            answer = this.cleanFinalAnswer(answer);
            finalAnswer = answer;
          } else {
            // If no "Final answer:" found, try to extract content before any research indicators
            let answer = finalThought.thought.split('Research completed.')[1]?.trim() || finalThought.thought;
            answer = this.cleanFinalAnswer(answer);
            finalAnswer = answer;
          }
        }
      }
    }

    // Clean the final answer one more time to be extra sure
    finalAnswer = this.cleanFinalAnswer(finalAnswer);

    // Exclude the final thought from thoughtProcess to prevent it from being displayed in research analysis
    const thoughtProcess = this.thoughtHistory.slice(0, -1);

    return {
      finalAnswer,
      thoughtProcess,
      confidence: this.finalConfidence || 80, // Use calculated confidence or default
      sources: this.sources
    };
  }

  private cleanFinalAnswer(answer: string): string {
    // Extremely aggressive cleaning - remove any content that looks like research analysis
    let cleaned = answer;

    // First, cut off everything after "research analysis" (case insensitive)
    const researchAnalysisPatterns = ['research analysis', 'Research Analysis', 'RESEARCH ANALYSIS'];
    for (const pattern of researchAnalysisPatterns) {
      const index = cleaned.indexOf(pattern);
      if (index !== -1) {
        cleaned = cleaned.substring(0, index).trim();
        break;
      }
    }

    // Cut off everything after any step indicator
    const stepPatterns = ['step 1:', 'step 2:', 'step 3:', 'step 4:', 'step 5:', 'step 6:', 'step 7:', 'step 8:', 'step 9:', 'step 10:'];
    for (const pattern of stepPatterns) {
      const index = cleaned.toLowerCase().indexOf(pattern.toLowerCase());
      if (index !== -1) {
        cleaned = cleaned.substring(0, index).trim();
        break;
      }
    }

    // Remove any remaining lines that contain research-related keywords
    const lines = cleaned.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim().toLowerCase();
      if (trimmed.length === 0) return true;

      // Block list of research-related terms
      const blockedTerms = [
        'research analysis', 'step ', 'thought ', 'action:', 'result:', 'executing:', 'performing:',
        'reading url:', 'deep research completed', 'synthesizing final answer', 'research completed',
        'final answer:', 'confidence', 'sources explored', 'research steps', 'research completed with',
        'research analysis', 'thought', 'executing action', 'performing', 'reading url'
      ];

      return !blockedTerms.some(term => trimmed.includes(term));
    });

    cleaned = filteredLines.join('\n').trim();

    // Final cleanup - remove any remaining confidence mentions
    cleaned = cleaned.replace(/\d+% confidence.*$/s, '').trim();
    cleaned = cleaned.replace(/research completed with.*$/s, '').trim();

    // If still too short, try to extract the first meaningful paragraph
    if (!cleaned || cleaned.length < 20) {
      const paragraphs = answer.split('\n\n');
      for (const paragraph of paragraphs) {
        const trimmed = paragraph.trim();
        if (trimmed.length > 50 &&
          !trimmed.toLowerCase().includes('research') &&
          !trimmed.toLowerCase().includes('step') &&
          !trimmed.toLowerCase().includes('confidence')) {
          return trimmed;
        }
      }
    }

    return cleaned || 'Unable to extract clean answer';
  }

  private generateFallbackAnalysis(query: string, currentThought: number, thoughtHistory: any[]): any {
    // Provide basic fallback analysis for common query types when AI service fails
    const lowerQuery = query.toLowerCase();

    if (currentThought === 1) {
      // First thought: Always try to clarify ambiguous queries
      return {
        thought: `The query "${query}" appears to be about ${this.inferQueryType(lowerQuery)}. Since AI analysis is currently unavailable, I recommend searching your local resources or trying a more specific query.`,
        action: "analyze",
        actionDetails: "Query analysis completed with limited AI assistance",
        nextThoughtNeeded: false,
        totalThoughts: 1,
        finalAnswer: `Based on the query "${query}", this appears to be about ${this.inferQueryType(lowerQuery)}. Due to AI service unavailability, I recommend: \n\n1.Try searching your local resources for related content\n2.Use more specific search terms\n3.Check if your AI proxy server is running\n\nFor technical issues, ensure your AI service at ${process.env.AI_PROXY_URL || 'localhost:3010'} is operational.`,
        confidence: 60
      };
    }

    return null; // No fallback available
  }

  private inferQueryType(query: string): string {
    if (query.includes('tutorial') || query.includes('guide') || query.includes('how to')) {
      return 'learning tutorials or guides';
    } else if (query.includes('documentation') || query.includes('docs') || query.includes('api')) {
      return 'technical documentation or APIs';
    } else if (query.includes('error') || query.includes('fix') || query.includes('problem')) {
      return 'troubleshooting or problem-solving';
    } else if (query.includes('best') || query.includes('recommend') || query.includes('compare')) {
      return 'recommendations or comparisons';
    } else {
      return 'general information or research';
    }
  }
}

// Export service class for creating new instances per request
export default DeepResearchService;