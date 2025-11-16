import express from 'express';
import { body, query, validationResult } from 'express-validator';
import prisma from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import aiService from '../services/aiService';
import { SearchResponse } from '../types';
import { readUrlContent } from '../utils/urlReader';

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

    // Build where clause for Prisma
    const where: any = {
      user_id: userId,
    };

    let enhancedQuery = searchQuery;
    let searchTerms: string[] = [];
    let aiFilters: { type?: string; tags?: string[] } = {};
    let queryEmbedding: number[] | null = null;
    let isChat = false;

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
          // Use AI to enhance the search query
          const aiResult = await aiService.enhanceSearchQuery(searchQuery);
          console.log('AI result:', aiResult);
          if (aiResult.intent === 'chat') {
            searchTerms = [];
            isChat = true;
            console.log('Intent is chat, no search');
          } else {
            enhancedQuery = aiResult.enhancedQuery;
            searchTerms = aiResult.searchTerms;
            aiFilters = aiResult.filters;
            console.log('AI enhanced query:', enhancedQuery, 'terms:', searchTerms);

            // Generate embedding for vector search (skip for very short queries)
            if (enhancedQuery.length >= 5) {
              const embeddingResponse = await aiService.createEmbeddings(enhancedQuery);
              queryEmbedding = embeddingResponse.data[0].embedding;
              console.log('Query embedding generated, length:', queryEmbedding!.length);
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
      where.type = aiFilters.type;
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
    let total: number = 0;
    let chatResponse = '';

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
        // Check if this is a date/time query
        const dateTimeQueries = ['current date', 'what date', 'what time', 'current time', 'today', 'now', 'date time', 'time date', 'what day', 'current day'];
        const queryLower = searchQuery.toLowerCase().trim();
        const isDateTimeQuery = dateTimeQueries.some(phrase => queryLower.includes(phrase));

        if (isDateTimeQuery) {
          // Provide accurate current date/time information in user's timezone
          const currentDateTime = aiService.getCurrentDateTime(timezone);
          chatResponse = `Today is ${currentDateTime.day}, ${currentDateTime.date}. The current time is ${currentDateTime.time}. Is there anything I can help you with in your personal resources?`;
        } else {
          chatResponse = await aiService.generateChatResponse(searchQuery, context, timezone, focusMode);
        }
        console.log('Generated chat response:', chatResponse);
      } catch (error) {
        console.warn('Failed to generate chat response:', error);
        chatResponse = "Hello! I'm your AI assistant for personal resources. How can I help you?";
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

    // Cache recent search results for chat context
    if (!isChat && resources.length > 0) {
      recentSearchCache.set(userId, resources.slice(0, 5)); // Store up to 5 recent results
    }

    const response: SearchResponse = {
      resources,
      total,
      has_more: offset + limit < total,
    };

    // Handle different focus modes
    let researchSummary: any = null;

    if (!isChat && searchQuery) {
      if (focusMode === 'deep-research') {
        try {
          console.log('Deep research mode activated - using sequential thinking for query:', searchQuery);

          // Use sequential thinking for complex research tasks
          const recentResults = recentSearchCache.get(userId);
          const contextString = recentResults ? recentResults.map(r => `${r.title}: ${r.content || r.description || ''}`).join('. ') : '';
          const sequentialResult = await aiService.executeSequentialThinking(searchQuery, contextString);
          console.log('Sequential thinking completed:', {
            finalAnswer: sequentialResult.finalAnswer,
            thoughtCount: sequentialResult.thoughtProcess.length,
            confidence: sequentialResult.confidence
          });

          // Convert sequential thinking results to resources
          if (sequentialResult.thoughtProcess.length > 0) {
            // Add thought process as resources
            const thoughtResources = sequentialResult.thoughtProcess.map((thought, index) => ({
              id: `sequential-thought-${index}`,
              title: `Thought ${thought.thoughtNumber}: ${thought.thought.substring(0, 50)}...`,
              content: thought.thought,
              type: 'document' as const,
              url: null,
              created_at: new Date(),
              updated_at: new Date(),
              description: `Action: ${thought.action || 'Analysis'} | Result: ${thought.result || 'Completed'}`,
              file_path: null,
              metadata: {
                thoughtNumber: thought.thoughtNumber,
                action: thought.action,
                result: thought.result,
                nextThoughtNeeded: thought.nextThoughtNeeded
              },
              user_id: userId,
              embedding: null,
              tags: [{ name: 'sequential-thinking', id: 'sequential-thinking' }]
            }));

            response.resources = [
              ...response.resources,
              ...thoughtResources
            ];

            // Add final answer as a highlighted resource if found
            if (sequentialResult.finalAnswer && sequentialResult.confidence > 70) {
              response.resources = [
                ...response.resources,
                {
                  id: 'sequential-answer',
                  title: `Sequential Thinking Result: ${sequentialResult.finalAnswer}`,
                  content: `Through sequential thinking analysis, I found: ${sequentialResult.finalAnswer}`,
                  type: 'document' as const,
                  url: null,
                  created_at: new Date(),
                  updated_at: new Date(),
                  description: `Confidence: ${sequentialResult.confidence}% | Thoughts: ${sequentialResult.thoughtProcess.length}`,
                  file_path: null,
                  metadata: {
                    finalAnswer: sequentialResult.finalAnswer,
                    confidence: sequentialResult.confidence,
                    thoughtProcessLength: sequentialResult.thoughtProcess.length
                  },
                  user_id: userId,
                  embedding: null,
                  tags: [{ name: 'sequential-answer', id: 'sequential-answer' }]
                }
              ];
            }
          }

          researchSummary = {
            method: 'sequential-thinking',
            finalAnswer: sequentialResult.finalAnswer,
            confidence: sequentialResult.confidence,
            thoughtCount: sequentialResult.thoughtProcess.length
          };
        } catch (error) {
          console.warn('Deep research failed:', error);
        }
      } else if (focusMode === 'quick-search') {
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

    // Generate suggestions if no results found
    let suggestions: string[] = [];
    if (!isChat && total === 0) {
      // AI suggestions disabled, use fallback
      const queryLower = searchQuery.toLowerCase();
      if (queryLower.includes('read') || queryLower.includes('book')) {
        suggestions = [
          'find books about reading',
          'what reading materials do I have',
          'articles on literature',
          'study guides for books',
          'notes on novels',
          'documents about reading',
          'book recommendations',
          'reading lists'
        ];
      } else if (queryLower.includes('study') || queryLower.includes('learn')) {
        suggestions = [
          'find study materials',
          'what educational content do I have',
          'tutorials and guides',
          'learning resources',
          'course notes',
          'study guides',
          'educational documents',
          'learning materials'
        ];
      } else if (queryLower.includes('video') || queryLower.includes('watch')) {
        suggestions = [
          'find video tutorials',
          'what videos do I have',
          'watch lectures',
          'video courses',
          'how-to videos',
          'demonstrations',
          'webinars',
          'video guides'
        ];
      } else if (queryLower.includes('write') || queryLower.includes('writing')) {
        suggestions = [
          'writing guides and tips',
          'notes on writing',
          'articles about writing',
          'writing tutorials',
          'essay examples',
          'writing resources',
          'blog posts on writing',
          'creative writing materials'
        ];
      } else if (queryLower.includes('code') || queryLower.includes('programming')) {
        suggestions = [
          'find code snippets',
          'programming tutorials',
          'code examples',
          'programming guides',
          'development resources',
          'coding projects',
          'programming documentation',
          'tech tutorials'
        ];
      } else {
        suggestions = [
          'find my notes',
          'what documents do I have',
          'search books',
          'video tutorials',
          'articles and guides',
          'personal resources',
          'saved materials',
          'reference materials'
        ];
      }
      // Limit to 8 suggestions
      suggestions = suggestions.slice(0, 8);
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
      ...(suggestions.length > 0 && { suggestions }),
      // Add deep research summary if applicable
      ...(researchSummary && {
        deepResearch: {
          method: researchSummary.method,
          thoughtCount: researchSummary.thoughtCount,
          confidence: researchSummary.confidence,
          answerFound: researchSummary.confidence > 70,
          ...(researchSummary.confidence > 70 && { answer: researchSummary.finalAnswer }),
          summary: `Sequential thinking completed with ${researchSummary.thoughtCount} thoughts.${researchSummary.confidence > 70 ? ` Found answer: ${researchSummary.finalAnswer}` : ' No confident answer found.'}`
        }
      }),
    } : null;

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