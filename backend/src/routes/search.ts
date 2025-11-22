import express from 'express';
import { query, validationResult } from 'express-validator';
import prisma from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import aiService from '../services/aiService';
import { performWebSearch } from '../utils/webSearch';
import { SearchResponse } from '../types';

// Simple in-memory cache for recent search results (userId -> results)
const recentSearchCache = new Map<string, any[]>();

// Cosine similarity function (for future vector search implementation)
function _cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search resources with AI-powered natural language processing
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (supports natural language)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [note, video, link, document]
 *         description: Filter by resource type
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tags (comma-separated)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 */
router.get('/', [
  query('q').optional().trim().isLength({ min: 1, max: 500 }).matches(/^[a-zA-Z0-9\s\-_.,!?()]+$/).withMessage('Search query contains invalid characters'),
  query('type').optional().isIn(['note', 'video', 'link', 'document']),
  query('tags').optional().trim().isLength({ max: 200 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('offset').optional().isInt({ min: 0 }),
  query('forceWebSearch').optional().isBoolean(),
  query('useMCP').optional().isBoolean(),
  query('mcpCredentials').optional().isObject(),
  query('conversation').optional(),
], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const userId = req.user!.id;
    const searchQuery = req.query.q as string;
    const type = req.query.type as string;
    const tagsParam = req.query.tags as string;
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 20;
    const timezone = req.query.timezone as string || 'UTC';
    const focusMode = req.query.focusMode as string || 'general';
    const aiEnhancedSearch = req.query.aiEnhanced !== 'false'; // Default to true
    const forceWebSearch = req.query.forceWebSearch === 'true'; // Default to false
    const useMCP = req.query.useMCP === 'true'; // Default to false
    const mcpCredentials = req.query.mcpCredentials as Record<string, string> || {};
    let conversation: Array<{ type: string, content: string }> = [];
    if (req.query.conversation) {
      try {
        conversation = JSON.parse(req.query.conversation as string);
      } catch (error) {
        console.warn('Failed to parse conversation parameter:', error);
        conversation = [];
      }
    }

    let learningContext: any = null;
    if (req.query.learningContext) {
      try {
        learningContext = JSON.parse(req.query.learningContext as string);
      } catch (error) {
        console.warn('Failed to parse learningContext parameter:', error);
      }
    }

    // Enrich learning context with actual progress data if query relates to learning
    const learningKeywords = ['progress', 'learning', 'status', 'how am i doing', 'grades', 'scores', 'modules', 'course'];
    const isLearningQuery = searchQuery && learningKeywords.some(k => searchQuery.toLowerCase().includes(k));

    if (isLearningQuery) {
      try {
        const subjects = await prisma.learningSubject.findMany({
          where: { user_id: userId, is_active: true },
          include: {
            modules: {
              include: {
                progress: { where: { user_id: userId } }
              }
            },
            progress: { where: { user_id: userId } }
          }
        });

        if (!learningContext) learningContext = {};
        learningContext.detailedProgress = subjects.map(s => {
          const totalModules = s.modules.length;
          // Count unique completed modules from the progress records
          const completedModules = s.progress.filter(p => p.status === 'completed').length;
          const progressPercent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

          return {
            subject: s.name,
            progress: progressPercent,
            modules: s.modules.map(m => {
              const mProgress = m.progress[0];
              return {
                title: m.title,
                status: mProgress?.status || 'not_started',
                score: mProgress?.score
              };
            })
          };
        });
        console.log('Enriched learning context with progress data');
      } catch (error) {
        console.warn('Failed to fetch learning progress for context:', error);
      }
    }

    // Build where clause for Prisma
    const where: any = {
      user_id: userId,
    };

    let enhancedQuery = searchQuery;
    let searchTerms: string[] = [];
    let aiFilters: { type?: string; tags?: string[] } = {};
    let queryEmbedding: number[] | null = null;
    let isChat = false;
    let mcpResults: any[] = [];
    let mcpSummary: string | undefined;

    if (searchQuery) {
      // Simple intent detection for common cases
      const simpleGreetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'thanks', 'thank you', 'help', 'please'];
      const conversationalPhrases = ['summarize', 'explain', 'tell me', 'what about', 'can you', 'could you', 'would you', 'these', 'them', 'that', 'this', 'the results', 'the notes', 'my notes'];
      const dateTimeQueries = ['current date', 'what date', 'what time', 'current time', 'today', 'now', 'date time', 'time date', 'what day', 'current day'];

      const queryLower = searchQuery.toLowerCase().trim();
      if (simpleGreetings.includes(queryLower) ||
        conversationalPhrases.some(phrase => queryLower.includes(phrase)) ||
        dateTimeQueries.some(phrase => queryLower.includes(phrase))) {
        searchTerms = [];
        isChat = true;
        console.log('Conversational or date/time query detected, intent is chat');
      } else {
        try {
          // Use AI to enhance the search query (with MCP if enabled)
          const aiResult = useMCP
            ? await aiService.enhanceSearchQueryWithMCP(searchQuery, mcpCredentials, conversation, timezone)
            : await aiService.enhanceSearchQuery(searchQuery, conversation, timezone);
          console.log('AI result:', aiResult);
          if (aiResult.intent === 'chat') {
            searchTerms = [];
            isChat = true;
            console.log('Intent is chat, no search');
          } else {
            enhancedQuery = aiResult.enhancedQuery;
            searchTerms = aiResult.searchTerms;
            aiFilters = aiResult.filters;
            // Store MCP results if available
            mcpResults = aiResult.mcpResults || [];
            mcpSummary = aiResult.mcpSummary;
            console.log('AI enhanced query:', enhancedQuery, 'terms:', searchTerms);

            // Generate embedding for vector search (skip for very short queries)
            if (enhancedQuery.length >= 5) {
              try {
                const embeddingResponse = await aiService.createEmbeddings(enhancedQuery);
                queryEmbedding = embeddingResponse.data[0].embedding;
                console.log('Query embedding generated, length:', queryEmbedding!.length);
              } catch (embeddingError) {
                console.warn('Embedding generation failed, falling back to text search:', embeddingError);
                // Continue with text search - queryEmbedding remains null
              }
            } else {
              console.log('Query too short for embeddings, using text search');
            }
          }
        } catch (error) {
          console.warn('AI search enhancement failed, falling back to basic search:', error);
          // Fallback: extract keywords from query, removing common stop words
          const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'give', 'me', 'some', 'something', 'anything', 'please', 'show', 'find', 'search', 'related', 'about']);
          searchTerms = searchQuery.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .slice(0, 5); // Limit to 5 terms
          if (searchTerms.length === 0) {
            searchTerms = [searchQuery]; // Fallback to full query if no keywords
          }
          console.log('Fallback to text search with terms:', searchTerms);
        }
      }

      // Build search conditions based on enhanced terms
      const searchConditions = [];

      for (const term of searchTerms) {
        // Check if we're using PostgreSQL (has search operator) or SQLite (use contains)
        const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql://') ||
          process.env.DATABASE_URL?.startsWith('postgres://');

        if (isPostgres && process.env.NODE_ENV !== 'test') {
          // Use PostgreSQL full-text search for production
          searchConditions.push(
            { title: { search: term } },
            { content: { search: term } },
            { description: { search: term } }
          );
        } else {
          // Use simple LIKE queries for SQLite or test environments
          searchConditions.push(
            { title: { contains: term } },
            { content: { contains: term } },
            { description: { contains: term } }
          );
        }
      }

      where.OR = searchConditions;
    }

    // Apply type filter (query param takes precedence over AI)
    if (type) {
      where.type = type;
    } else if (aiFilters.type) {
      // Handle multiple types separated by pipe or comma
      // Filter to only valid ResourceType enum values
      const validTypes = ['note', 'video', 'link', 'document'];
      const types = aiFilters.type.split(/[|,]/)
        .filter(t => t.trim())
        .filter(t => validTypes.includes(t)); // Only include valid types

      if (types.length === 1) {
        where.type = types[0] as any; // Type assertion for Prisma enum
      } else if (types.length > 1) {
        where.OR = where.OR || [];
        where.OR.push({
          type: { in: types as any[] } // Type assertion for Prisma enum
        });
      }
    }

    // Apply tags filter (query param takes precedence over AI)
    if (tagsParam) {
      const tagNames = tagsParam.split(',').map(t => t.trim());
      where.tags = {
        some: {
          name: {
            in: tagNames,
          },
        },
      };
    } else if (aiFilters.tags && aiFilters.tags.length > 0) {
      where.tags = {
        some: {
          name: {
            in: aiFilters.tags,
          },
        },
      };
    }

    let resources: any[] = [];
    let webResults: any[] = [];
    let total: number = 0;
    let chatResponse: string | AsyncIterable<any> | null = null;

    if (isChat) {
      // Generate AI chat response with context from recent searches
      let context = '';
      const recentResults = recentSearchCache.get(userId);
      if (recentResults && recentResults.length > 0) {
        context = `Recent search results: ${recentResults.map(r =>
          `${r.title}: ${r.content || r.description || ''}`
        ).join('. ')}`;
      }

      try {
        // Check if this is a date/time query - be more specific to avoid false positives
        const queryLower = searchQuery.toLowerCase().trim();
        const isDateTimeQuery =
          // Exact matches for common date/time questions
          queryLower === 'what time is it' ||
          queryLower === 'what time' ||
          queryLower === 'current time' ||
          queryLower === 'what date is it' ||
          queryLower === 'what date' ||
          queryLower === 'current date' ||
          queryLower === 'what day is it' ||
          queryLower === 'what day' ||
          queryLower === 'current day' ||
          queryLower === 'today' ||
          queryLower === 'now' ||
          // Specific phrases that clearly indicate date/time intent
          queryLower.includes('what time') && (queryLower.includes('is it') || queryLower.includes('now')) ||
          queryLower.includes('what date') && (queryLower.includes('is it') || queryLower.includes('today')) ||
          queryLower.includes('current time') ||
          queryLower.includes('current date') ||
          queryLower.includes('what day') && queryLower.includes('is it');

        if (isDateTimeQuery) {
          // Provide accurate current date/time information in user's timezone using AI
          const currentDateTime = aiService.getCurrentDateTime(timezone);
          const dateTimeContext = `Current date and time: Today is ${currentDateTime.day}, ${currentDateTime.date}. The current time is ${currentDateTime.time}.`;

          // Use AI to generate a natural response that includes the date/time info
          chatResponse = await aiService.generateChatResponseWithMCP(
            `The user asked about the current date and time. Provide a friendly, helpful response that includes this information: ${dateTimeContext} and offers assistance with their personal resources.`,
            context,
            timezone,
            focusMode,
            false,
            useMCP,
            mcpCredentials,
            conversation
          ) as string;
        } else {
          // Regular chat response for non-date/time queries
          chatResponse = await aiService.generateChatResponseWithMCP(searchQuery, context, timezone, focusMode, false, useMCP, mcpCredentials, conversation, learningContext) as string;
        }
        console.log('Generated chat response:', chatResponse);
      } catch (error) {
        console.warn('Failed to generate chat response:', error);
        // Use AI to generate a fallback greeting even when primary AI fails
        try {
          chatResponse = await aiService.generateChatResponse(
            "Generate a friendly greeting for a personal resource management assistant. Keep it brief and welcoming.",
            '',
            timezone,
            focusMode,
            false
          ) as string;
        } catch (fallbackError) {
          console.warn('Fallback AI greeting also failed:', fallbackError);
          chatResponse = "Hello! I'm here to help you with your personal resources.";
        }
      }
    }

    if (!isChat) {
      if (queryEmbedding) {
        // Use vector search for semantic similarity
        const allResources = await prisma.resource.findMany({
          where: {
            ...where,
            embedding: { not: null }, // Only resources with embeddings
          },
          include: {
            tags: {
              select: { name: true },
            },
          },
        });

        // Compute similarities
        const similarities = allResources.map(resource => ({
          ...resource,
          _similarity: _cosineSimilarity(queryEmbedding!, JSON.parse(resource.embedding!)),
        }));

        // Sort by similarity descending
        similarities.sort((a, b) => b._similarity - a._similarity);

        // Filter by similarity threshold
        const threshold = 0.0; // Include all positive similarities
        const relevantResources = similarities.filter(r => r._similarity > threshold);

        if (relevantResources.length > 0) {
          // Use vector results
          resources = relevantResources.slice(offset, offset + limit).map(r => {
            const { _similarity, ...resourceWithoutSimilarity } = r;
            return resourceWithoutSimilarity;
          });
          total = relevantResources.length;
        } else {
          // Fallback to text search if no vector results
          resources = await prisma.resource.findMany({
            where,
            include: {
              tags: {
                select: { name: true },
              },
            },
            orderBy: { created_at: 'desc' },
            skip: offset,
            take: limit,
          });
          total = await prisma.resource.count({ where });
        }
      } else {
        // Fallback to text search
        resources = await prisma.resource.findMany({
          where,
          include: {
            tags: {
              select: { name: true },
            },
          },
          orderBy: { created_at: 'desc' },
          skip: offset,
          take: limit,
        });

        total = await prisma.resource.count({ where });
      }
    }

    // Perform web search only if explicitly requested via toggle
    if (!isChat && aiEnhancedSearch && forceWebSearch) {
      try {
        console.log('🔍 Performing web search for query:', searchQuery);
        const webSearchResponse = await performWebSearch(searchQuery);

        if (webSearchResponse.results?.length > 0) {
          webResults = webSearchResponse.results.slice(0, 5); // Limit to top 5 web results
          console.log('📚 Found web results:', webResults.length);
        } else {
          console.log('Web search returned no results');
        }
      } catch (webError) {
        console.warn('Web search failed, continuing with local results only:', webError);
        // Reset webResults to empty array to avoid issues downstream
        webResults = [];
      }
    }

    // Cache recent search results for chat context
    if (!isChat && resources.length > 0) {
      recentSearchCache.set(userId, resources.slice(0, 5)); // Store up to 5 recent results
    }

    const response: SearchResponse = {
      resources,
      total,
      has_more: offset + limit < total,
      webResults: webResults.length > 0 ? webResults : undefined,
    };



    if (!isChat && searchQuery) {
      if (focusMode === 'quick-search') {
        // Quick search mode - prioritize speed over depth
        console.log('Quick search mode activated for query:', searchQuery);
        // For quick search, we could limit the number of results or use faster search methods
        // Currently uses the same logic but could be optimized for speed
      } else if (focusMode === 'academic') {
        // Academic mode - emphasize credible sources and citations
        console.log('Academic mode activated for query:', searchQuery);
        // Could prioritize academic sources, add citation requirements, etc.
        // For now, uses enhanced search with academic focus in AI responses
      }
      // General mode uses the default search behavior
    }

    // Generate AI-powered suggestions if no results found
    let suggestions: string[] = [];
    if (!isChat && total === 0 && searchQuery) {
      try {
        // Use AI to generate contextual suggestions based on the search query
        const suggestionPrompt = `The user searched for "${searchQuery}" but found no results. Generate 6-8 helpful search suggestions that are related to their query and would help them find relevant content in a personal resource management system. Return them as a comma-separated list.`;

        const aiSuggestions = await aiService.generateChatResponse(
          suggestionPrompt,
          '',
          timezone,
          focusMode,
          false
        ) as string;

        // Parse the AI response into an array
        suggestions = aiSuggestions
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0 && s.length < 100) // Filter out empty or too long suggestions
          .slice(0, 8); // Limit to 8 suggestions

        console.log('Generated AI suggestions:', suggestions);
      } catch (suggestionError) {
        console.warn('Failed to generate AI suggestions, using basic fallback:', suggestionError);
        // Very basic fallback if AI fails completely
        suggestions = [
          'find my notes',
          'what documents do I have',
          'search books',
          'video tutorials',
          'articles and guides',
          'personal resources'
        ];
      }
    }

    // Generate AI summary for search results
    let aiSummary: string | null = null;
    if (!isChat && searchQuery && (resources.length > 0 || webResults.length > 0 || forceWebSearch)) {
      try {
        // Limit context to prevent token overflow
        const maxLocalResults = 2;
        const maxWebResults = 2;

        const localContext = resources.length > 0
          ? `Local resources: ${resources.slice(0, maxLocalResults).map(r => {
            const content = (r.content || r.description || '').substring(0, 100); // Limit content length
            return `${r.title}: ${content}`;
          }).join('. ')}`
          : '';

        const webContext = webResults.length > 0
          ? `Web results: ${webResults.slice(0, maxWebResults).map(r => {
            const content = (r.content || 'No description available').substring(0, 100); // Limit content length
            return `${r.title} (${r.url}): ${content}`;
          }).join('. ')}`
          : '';

        const contextString = [localContext, webContext].filter(Boolean).join('. ');

        // Limit total context length to prevent token overflow
        const maxContextLength = 1000;
        const truncatedContext = contextString.length > maxContextLength
          ? contextString.substring(0, maxContextLength) + '...'
          : contextString;

        if (truncatedContext.trim()) {
          aiSummary = await aiService.generateChatResponse(
            `Summarize the following search results for the query "${searchQuery}". Focus only on relevant results. Include markdown hyperlinks for any URLs mentioned (format: [text](url)). Provide a helpful response that analyzes and presents the key findings: ${truncatedContext}`,
            '',
            timezone,
            focusMode,
            false
          ) as string;
          console.log('Generated AI summary for search results');
        } else {
          console.log('No context available for AI summary');
          aiSummary = null;
        }
      } catch (error) {
        console.warn('Failed to generate AI summary for search results:', error);
        aiSummary = null;
      }
    }

    // Include AI enhancement info if search was performed
    let aiInfo: any = searchQuery ? {
      intent: isChat ? 'chat' : 'search',
      enhancedQuery,
      searchTerms,
      appliedFilters: {
        type: where.type || null,
        tags: aiFilters.tags || null,
      },
      ...(isChat && chatResponse && { chatResponse }),
      ...(!isChat && aiSummary && { summary: aiSummary }),
      ...(suggestions.length > 0 && { suggestions }),
      // Include MCP results if available
      ...(useMCP && mcpResults.length > 0 && { mcpResults }),
      ...(useMCP && mcpSummary && { mcpSummary }),
    } : null;

    // Log the search
    try {
      const filters = JSON.stringify({
        type: type || null,
        tags: tagsParam ? tagsParam.split(',').map(t => t.trim()) : null,
        focusMode,
        forceWebSearch,
        useMCP,
      });

      await prisma.searchLog.create({
        data: {
          user_id: userId,
          query: searchQuery || '',
          filters,
          result_count: resources.length,
          search_type: isChat ? 'chat' : (forceWebSearch ? 'web_search' : 'basic'),
        },
      });
    } catch (logError) {
      console.warn('Failed to log search:', logError);
      // Don't fail the search if logging fails
    }

    res.json({
      success: true,
      data: {
        ...response,
        ...(isChat && chatResponse && { message: chatResponse }),
      },
      ai: {
        ...aiInfo,
        ...(isChat && chatResponse && { chatResponse }),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions based on existing resources
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Partial search query for suggestions
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           default: 5
 *         description: Number of suggestions to return
 *     responses:
 *       200:
 *         description: Search suggestions retrieved successfully
 */
router.get('/suggestions', [
  query('q').optional().trim().isLength({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 10 }),
], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const userId = req.user!.id;
    const partialQuery = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 5;

    if (!partialQuery) {
      // Return popular tags if no query
      const tags = await prisma.tag.findMany({
        where: { user_id: userId },
        include: {
          _count: {
            select: { resources: true },
          },
        },
        orderBy: [
          { resources: { _count: 'desc' } },
          { name: 'asc' },
        ],
        take: limit,
      });

      res.json({
        success: true,
        data: {
          suggestions: tags.map(tag => tag.name),
          type: 'tags',
        },
      });
      return;
    }

    // Get title suggestions
    const titles = await prisma.resource.findMany({
      where: {
        user_id: userId,
        title: {
          startsWith: partialQuery,
        },
      },
      select: { title: true },
      distinct: ['title'],
      orderBy: { title: 'asc' },
      take: limit,
    });

    // Get tag suggestions
    const tags = await prisma.tag.findMany({
      where: {
        user_id: userId,
        name: {
          startsWith: partialQuery,
        },
      },
      select: { name: true },
      orderBy: { name: 'asc' },
      take: limit,
    });

    const suggestions = [
      ...titles.map(t => t.title),
      ...tags.map(t => t.name),
    ].slice(0, limit);

    res.json({
      success: true,
      data: {
        suggestions,
        type: 'mixed',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/search/analytics:
 *   get:
 *     summary: Get search and AI usage analytics
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 */
router.get('/analytics', authenticateToken, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = req.user!.id;

    // Get basic search analytics
    const totalResources = await prisma.resource.count({
      where: { user_id: userId },
    });

    const resourcesByType = await prisma.resource.groupBy({
      by: ['type'],
      where: { user_id: userId },
      _count: {
        type: true,
      },
    });

    const totalTags = await prisma.tag.count({
      where: { user_id: userId },
    });

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentResources = await prisma.resource.count({
      where: {
        user_id: userId,
        created_at: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const analytics = {
      totalResources,
      resourcesByType: resourcesByType.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {} as Record<string, number>),
      totalTags,
      recentActivity: {
        resourcesAdded: recentResources,
        period: 'last 30 days',
      },
      aiFeatures: {
        searchEnhancement: 'available',
        contentSummarization: 'available',
        autoTagging: 'available',
      },
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

export default router;