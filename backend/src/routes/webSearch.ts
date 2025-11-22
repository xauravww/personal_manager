import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { performWebSearch, formatWebSearchResults, WebSearchOptions } from '../utils/webSearch';
import prisma from '../config/database';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/web-search:
 *   post:
 *     summary: Perform web search using external search engines
 *     tags: [Web Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query
 *               pageno:
 *                 type: integer
 *                 description: Page number for results
 *                 default: 1
 *                 minimum: 1
 *               time_range:
 *                 type: string
 *                 enum: [day, week, month, year]
 *                 description: Time range for search results
 *                 default: month
 *               categories:
 *                 type: string
 *                 description: Search categories (comma-separated)
 *                 default: it,news
 *               engines:
 *                 type: string
 *                 description: Search engines to use (comma-separated)
 *                 default: duckduckgo,bing,google,wikipedia,brave
 *               enabled_engines:
 *                 type: string
 *                 description: Specifically enabled engines (comma-separated)
 *                 default: google
 *               language:
 *                 type: string
 *                 description: Search language
 *                 default: en
 *               safesearch:
 *                 type: integer
 *                 description: Safe search level (0-2)
 *                 default: 1
 *                 minimum: 0
 *                 maximum: 2
 *     responses:
 *       200:
 *         description: Web search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                     number_of_results:
 *                       type: integer
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                           url:
 *                             type: string
 *                           content:
 *                             type: string
 *                           engine:
 *                             type: string
 *                     formatted:
 *                       type: string
 *                       description: Formatted search results for display
 *       400:
 *         description: Validation error or invalid search query
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', [
  body('query')
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Query must be between 1 and 500 characters'),
  body('pageno')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Page number must be between 1 and 50'),
  body('time_range')
    .optional()
    .isIn(['day', 'week', 'month', 'year'])
    .withMessage('Time range must be one of: day, week, month, year'),
  body('categories')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Categories must be less than 200 characters'),
  body('engines')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Engines must be less than 500 characters'),
  body('enabled_engines')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Enabled engines must be less than 500 characters'),
  body('language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language must be 2-5 characters'),
  body('safesearch')
    .optional()
    .isInt({ min: 0, max: 2 })
    .withMessage('Safe search must be between 0 and 2'),
], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => error.msg);
      throw createError(`Validation failed: ${errorMessages.join(', ')}`, 400);
    }

    const {
      query,
      pageno,
      time_range,
      categories,
      engines,
      enabled_engines,
      disabled_engines,
      language,
      safesearch,
    } = req.body;

    const options: WebSearchOptions = {};
    if (pageno !== undefined) options.pageno = pageno;
    if (time_range) options.time_range = time_range;
    if (categories) options.categories = categories;
    if (engines) options.engines = engines;
    if (enabled_engines) options.enabled_engines = enabled_engines;
    if (disabled_engines) options.disabled_engines = disabled_engines;
    if (language) options.language = language;
    if (safesearch !== undefined) options.safesearch = safesearch;

    const startTime = Date.now();
    const searchResults = await performWebSearch(query, options);
    const formatted = formatWebSearchResults(searchResults);
    const processingTime = Date.now() - startTime;

    // Log the web search
    try {
      const filters = JSON.stringify({
        pageno,
        time_range,
        categories,
        engines,
        enabled_engines,
        disabled_engines,
        language,
        safesearch,
      });

      await prisma.searchLog.create({
        data: {
          user_id: req.user!.id,
          query,
          filters,
          result_count: searchResults.results?.length || 0,
          search_type: 'web_search',
        },
      });
    } catch (logError) {
      console.warn('Failed to log web search:', logError);
      // Don't fail the search if logging fails
    }

    res.json({
      success: true,
      data: {
        ...searchResults,
        formatted,
        processingTime,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;