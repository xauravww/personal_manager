import express from 'express';
import { query, validationResult } from 'express-validator';
import prisma from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { SearchResponse } from '../types';
import aiService from '../services/aiService';

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
  query('q').optional().trim().isLength({ min: 1 }),
  query('type').optional().isIn(['note', 'video', 'link', 'document']),
  query('tags').optional().trim(),
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

    // Build where clause for Prisma
    const where: any = {
      user_id: userId,
    };

    let enhancedQuery = searchQuery;
    let searchTerms: string[] = [];
    let aiFilters: { type?: string; tags?: string[] } = {};

    if (searchQuery) {
      try {
        // Use AI to enhance the search query
        const aiResult = await aiService.enhanceSearchQuery(searchQuery);
        enhancedQuery = aiResult.enhancedQuery;
        searchTerms = aiResult.searchTerms;
        aiFilters = aiResult.filters;
      } catch (error) {
        console.warn('AI search enhancement failed, falling back to basic search:', error);
        // Fallback to basic search
        searchTerms = [searchQuery];
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

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        include: {
          tags: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.resource.count({
        where,
      }),
    ]);

    const response: SearchResponse = {
      resources,
      total,
      has_more: offset + limit < total,
    };

    // Include AI enhancement info if search was performed
    const aiInfo = searchQuery ? {
      enhancedQuery,
      searchTerms,
      appliedFilters: {
        type: where.type || null,
        tags: aiFilters.tags || null,
      },
    } : null;

    res.json({
      success: true,
      data: response,
      ai: aiInfo,
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