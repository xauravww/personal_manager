import { aiService } from './aiService';
import { performWebSearch } from '../utils/webSearch';
import { readUrlContent } from '../utils/urlReader';
import prisma from '../config/database';

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
  private includeWebSearch: boolean = true;
  private userId?: string;
  private prisma: typeof prisma;

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

          console.log(`🔍 Performing web search for: "${actionDetails}"`);

          const searchResults = await performWebSearch(actionDetails, {
            pageno: 1,
            time_range: 'month',
            categories: 'it,news,science',
            engines: 'duckduckgo,google,wikipedia',
            enabled_engines: 'duckduckgo,google',
            language: 'en',
            safesearch: 1
          });

          const results = searchResults.results?.slice(0, 5) || [];
          const formattedResults = results.map((r: any, i: number) =>
            `${i + 1}. ${r.title} - ${r.url}\n   ${r.content?.substring(0, 150)}...`
          ).join('\n\n');

          // Store sources
          results.forEach((r: any) => {
            this.sources.push({
              url: r.url,
              title: r.title,
              content: r.content || '',
              relevance: 0.8 // Default relevance
            });
          });

          return `Found ${results.length} results:\n${formattedResults}`;
        }

        case 'read_url': {
          if (!this.includeWebSearch) {
            return `Web access is disabled. Cannot read URL: "${actionDetails}". Please analyze available information from local resources only.`;
          }

          console.log(`📖 Reading URL: ${actionDetails}`);

          // Extract URL from actionDetails (AI sometimes includes extra text)
          const urlRegex = /(https?:\/\/[^\s]+)/;
          const match = actionDetails.match(urlRegex);
          const url = match ? match[1] : actionDetails.trim();

          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return `Invalid URL format: ${actionDetails}. Please provide a valid URL starting with http:// or https://.`;
          }

          const content = await readUrlContent(url, 15000, {
            returnRaw: false,
            maxLength: 3000,
          });

          // Store as source
          this.sources.push({
            url,
            title: url, // Will be updated if we can extract title
            content,
            relevance: 0.9
          });

          // Try to extract title from content
          const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) {
            this.sources[this.sources.length - 1].title = titleMatch[1].trim();
          }

          return `Content read (${content.length} chars): ${content.substring(0, 500)}...`;
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

  async *performDeepResearch(query: string, maxThoughts: number = 10, userTimezone?: string, includeWebSearch: boolean = true, userId?: string): AsyncIterable<DeepResearchThought> {
    this.reset();
    this.includeWebSearch = includeWebSearch;
    this.userId = userId;

    let currentThought = 1;
    let totalThoughts = 5; // Initial estimate
    let nextThoughtNeeded = true;
    let finalAnswer = '';
    let confidence = 0;

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
      totalThoughts: totalThoughts,
      thought: `Initializing deep research for: "${query}"`,
      nextThoughtNeeded: true,
      timestamp: new Date()
    };
    yield initThought;

    try {
      while (nextThoughtNeeded && currentThought <= maxThoughts) {
        console.log(`\n--- Thought ${currentThought}/${totalThoughts} ---`);

        // Yield thinking status
        const thinkingThought: DeepResearchThought = {
          thoughtNumber: currentThought - 0.5, // Use decimal to indicate intermediate step
          totalThoughts: totalThoughts,
          thought: `Analyzing and planning research step ${currentThought}...`,
          nextThoughtNeeded: true,
          timestamp: new Date()
        };
        yield thinkingThought;

        // Generate next thought using AI
        const availableActions = includeWebSearch
          ? `- "search": Search the web for specific terms (provide concise, direct search queries like "Next.js documentation" not long sentences)
- "read_url": Read content from a specific URL (provide clean URLs without extra text)
- "analyze": Analyze existing information
- "extract_links": Extract links from recently read content`
          : `- "search_local": Search through user's local resources (documents, notes, etc.) for specific terms
- "analyze": Analyze existing information from local resources
- "extract_links": Extract links from recently read content`;

        const actionOptions = includeWebSearch
          ? `"action": "search|read_url|analyze|extract_links"`
          : `"action": "search_local|analyze|extract_links"`;

        const systemPrompt = `You are conducting deep research on: "${query}"

Current progress: ${currentThought}/${totalThoughts} thoughts completed
Sources found: ${this.sources.length}
${includeWebSearch ? 'Web search: ENABLED' : 'Web search: DISABLED (searching local resources only)'}

Thought history:
${this.thoughtHistory.map(t => `Thought ${t.thoughtNumber}: ${t.thought}${t.action ? ` | Action: ${t.action}` : ''}${t.result ? ` | Result: ${t.result.substring(0, 100)}...` : ''}`).join('\n')}

Instructions for this research step:
1. Analyze what information is still needed
2. Plan the next research action${includeWebSearch ? ' (search, read_url, analyze, extract_links)' : ' (search_local, analyze, extract_links)'}
3. Be specific about what you're looking for${includeWebSearch ? '' : ' - search through user\'s local documents, notes, and resources'}

Available actions:
${availableActions}

${includeWebSearch ? 'For search queries: Keep them short and direct (2-5 words maximum). Examples: "Next.js docs", "React SSR tutorial", "Vercel deployment"' : 'For local search: Search user\'s personal resources (notes, documents, etc.) with specific keywords. Examples: "python tutorial", "machine learning notes", "web development project"'}

Return JSON:
{
  "thought": "Your current analysis and plan",
  ${actionOptions},
  "actionDetails": "CONCISE details${includeWebSearch ? ' - for search: 2-5 word query, for read_url: clean URL only' : ' - for search_local: specific search terms for user resources'}",
  "nextThoughtNeeded": true/false,
  "totalThoughts": estimated_total,
  "finalAnswer": "ONLY if confident (80%+), provide final answer",
  "confidence": 0-100
}`;

        const response = await aiService.createChatCompletion({
          model: aiService.getConfig().model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Execute thought step ${currentThought} for: ${query}` }
          ],
          temperature: 0.3,
        });

        const content = (response as any).choices[0]?.message?.content?.trim();
        if (!content) break;

        try {
          const thoughtResult = JSON.parse(content);

          // Execute the action if specified
          let actionResult = '';
          if (thoughtResult.action && thoughtResult.actionDetails) {
            console.log(`⚡ Executing action: ${thoughtResult.action} - ${thoughtResult.actionDetails}`);

            // Yield action execution status
            const actionThought: DeepResearchThought = {
              thoughtNumber: currentThought - 0.3,
              totalThoughts: totalThoughts,
              thought: `Executing: ${thoughtResult.action} - ${thoughtResult.actionDetails}`,
              action: thoughtResult.action,
              actionDetails: thoughtResult.actionDetails,
              nextThoughtNeeded: true,
              timestamp: new Date()
            };
            yield actionThought;

            actionResult = await this.executeResearchAction(thoughtResult.action, thoughtResult.actionDetails, query);
          }

          const thought: DeepResearchThought = {
            thoughtNumber: currentThought,
            totalThoughts: thoughtResult.totalThoughts || totalThoughts,
            thought: thoughtResult.thought,
            action: thoughtResult.action,
            actionDetails: thoughtResult.actionDetails,
            result: actionResult,
            nextThoughtNeeded: thoughtResult.nextThoughtNeeded,
            timestamp: new Date()
          };

          this.thoughtHistory.push(thought);

          // Log the formatted thought
          console.error(this.formatThought(thought));

          // Yield the completed thought for streaming
          yield thought;

          nextThoughtNeeded = thoughtResult.nextThoughtNeeded;
          totalThoughts = thoughtResult.totalThoughts || totalThoughts;

          if (thoughtResult.finalAnswer && thoughtResult.confidence > 70) {
            finalAnswer = thoughtResult.finalAnswer;
            confidence = thoughtResult.confidence;
            this.finalConfidence = confidence;
            nextThoughtNeeded = false;
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
        totalThoughts: totalThoughts,
        thought: 'Synthesizing final answer from all research findings...',
        nextThoughtNeeded: false,
        timestamp: new Date()
      };
      yield synthesisThought;

      // If no high-confidence answer was found, try to synthesize one
      if (!finalAnswer || confidence <= 70) {
        console.log('\n🔄 Synthesizing final answer from research...');
        const synthesis = await this.synthesizeFinalAnswer(query);
        if (synthesis.confidence > confidence) {
          finalAnswer = synthesis.answer;
          confidence = synthesis.confidence;
          this.finalConfidence = confidence;
        }
      }

      // Yield final thought with conclusion
      const finalThought: DeepResearchThought = {
        thoughtNumber: currentThought + 1,
        totalThoughts: totalThoughts,
        thought: `Research completed. ${finalAnswer ? `Final answer: ${finalAnswer}` : 'Unable to find a confident answer.'}`,
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
        totalThoughts: totalThoughts,
        thought: `Research failed due to error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextThoughtNeeded: false,
        timestamp: new Date()
      };
      yield errorThought;
    }
  }

  private async synthesizeFinalAnswer(query: string): Promise<{answer: string, confidence: number}> {
    try {
      const thoughtsText = this.thoughtHistory.map(t =>
        `Thought ${t.thoughtNumber}: ${t.thought}${t.action ? ` | Action: ${t.action}` : ''}${t.result ? ` | Result: ${t.result}` : ''}`
      ).join('\n');

      const sourcesText = this.sources.slice(0, 5).map(s =>
        `Source: ${s.title} (${s.url})\n${s.content.substring(0, 300)}...`
      ).join('\n\n');

      const systemPrompt = `You are a research synthesizer. Analyze the research process and sources below to provide a final answer to: "${query}"

Research Process:
${thoughtsText}

Sources Found:
${sourcesText}

Instructions:
1. Look for concrete answers, facts, or conclusions from the research
2. Cross-reference information from multiple sources when possible
3. If multiple answers exist, choose the most reliable one
4. If no clear answer was found, state that clearly
5. Provide a confidence score based on evidence quality and consistency
6. Keep the answer concise and direct

Return JSON:
{
  "answer": "The synthesized final answer",
  "confidence": 0-100
}`;

      const response = await aiService.createChatCompletion({
        model: aiService.getConfig().model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Synthesize final answer from research on: ${query}` }
        ],
        temperature: 0.1,
      });

      const content = (response as any).choices[0]?.message?.content?.trim();
      if (content) {
        try {
          const synthesis = JSON.parse(content);
          return {
            answer: synthesis.answer || 'No confident answer found through research',
            confidence: synthesis.confidence || 0
          };
        } catch (error) {
          console.warn('Error parsing synthesis:', error);
          return { answer: 'Unable to synthesize answer from research', confidence: 0 };
        }
      }
      return { answer: 'Research completed but no clear answer synthesized', confidence: 0 };
    } catch (error) {
      console.warn('Error synthesizing final answer:', error);
      return { answer: 'Error during answer synthesis', confidence: 0 };
    }
  }

  getResearchResult(): DeepResearchResult {
    const finalThought = this.thoughtHistory[this.thoughtHistory.length - 1];

    let finalAnswer = 'Research completed without definitive answer';

    if (finalThought) {
      // Check for direct time lookup
      if (finalThought.thought.includes('Direct time lookup:')) {
        finalAnswer = finalThought.thought.split('Direct time lookup:')[1].trim();
      }
      // Check for final answer
      else if (finalThought.thought.includes('Final answer:')) {
        finalAnswer = finalThought.thought.split('Final answer:')[1].trim();
      }
      // Check for research completed message
      else if (finalThought.thought.includes('Research completed.')) {
        const match = finalThought.thought.match(/Final answer:\s*(.+)/);
        if (match) {
          finalAnswer = match[1].trim();
        }
      }
    }

    return {
      finalAnswer,
      thoughtProcess: this.thoughtHistory,
      confidence: this.finalConfidence || 80, // Use calculated confidence or default
      sources: this.sources
    };
  }
}

// Export service class for creating new instances per request
export default DeepResearchService;