import { aiService } from './aiService';
import { performWebSearch } from '../utils/webSearch';
import { readUrlContent } from '../utils/urlReader';

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

  constructor() {
    this.reset();
  }

  private reset(): void {
    this.thoughtHistory = [];
    this.sources = [];
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
        case 'search': {
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

  async *performDeepResearch(query: string, maxThoughts: number = 10): AsyncIterable<DeepResearchThought> {
    this.reset();

    let currentThought = 1;
    let totalThoughts = 5; // Initial estimate
    let nextThoughtNeeded = true;
    let finalAnswer = '';
    let confidence = 0;

    console.log(`🚀 Starting deep research for: "${query}"`);

    // Yield initial status
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
        const systemPrompt = `You are conducting deep research on: "${query}"

Current progress: ${currentThought}/${totalThoughts} thoughts completed
Sources found: ${this.sources.length}

Thought history:
${this.thoughtHistory.map(t => `Thought ${t.thoughtNumber}: ${t.thought}${t.action ? ` | Action: ${t.action}` : ''}${t.result ? ` | Result: ${t.result.substring(0, 100)}...` : ''}`).join('\n')}

Instructions for this research step:
1. Analyze what information is still needed
2. Plan the next research action (search, read_url, analyze, extract_links)
3. Be specific about what you're looking for
4. Consider if you have enough information to conclude
5. If ready to conclude, provide a final answer with confidence

Available actions:
- "search": Search the web for specific terms (provide concise, direct search queries like "Next.js documentation" not long sentences)
- "read_url": Read content from a specific URL (provide clean URLs without extra text)
- "analyze": Analyze existing information
- "extract_links": Extract links from recently read content

For search queries: Keep them short and direct (2-5 words maximum). Examples: "Next.js docs", "React SSR tutorial", "Vercel deployment"

Return JSON:
{
  "thought": "Your current analysis and plan",
  "action": "search|read_url|analyze|extract_links",
  "actionDetails": "CONCISE details - for search: 2-5 word query, for read_url: clean URL only",
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
    const finalAnswer = finalThought?.thought.includes('Final answer:')
      ? finalThought.thought.split('Final answer:')[1].trim()
      : 'Research completed without definitive answer';

    return {
      finalAnswer,
      thoughtProcess: this.thoughtHistory,
      confidence: 80, // Default confidence
      sources: this.sources
    };
  }
}

// Export singleton instance
export const deepResearchService = new DeepResearchService();
export default deepResearchService;