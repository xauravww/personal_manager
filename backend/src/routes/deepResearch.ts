import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { DeepResearchService, DeepResearchThought } from '../services/deepResearchService';

const router = express.Router();

// Middleware to authenticate from query parameter for SSE
const authenticateFromQuery = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.query.token as string;
  if (token) {
    req.headers.authorization = `Bearer ${token}`;
  }
  authenticateToken(req, res, next);
};

/**
 * @swagger
 * /api/deep-research:
 *   post:
 *     summary: Perform deep research with sequential thinking
 *     tags: [Deep Research]
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
 *                 description: Research query
 *                 maxLength: 500
 *               maxThoughts:
 *                 type: integer
 *                 description: Maximum number of research steps
 *                 default: 10
 *                 minimum: 1
 *                 maximum: 20
 *     responses:
 *       200:
 *         description: Deep research completed successfully
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Server-sent events stream of research thoughts
 *       400:
 *         description: Validation error or invalid query
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticateFromQuery, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { query, maxThoughts = '10', timezone, includeWebSearch = 'true' } = req.query;

    // Manual validation since we're using query params
    if (!query || typeof query !== 'string' || query.trim().length === 0 || query.length > 500) {
      throw createError('Query must be a string between 1 and 500 characters', 400);
    }

    const maxThoughtsNum = parseInt(maxThoughts as string, 10);
    if (isNaN(maxThoughtsNum) || maxThoughtsNum < 1 || maxThoughtsNum > 20) {
      throw createError('maxThoughts must be a number between 1 and 20', 400);
    }

    const queryStr = query;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if present

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      type: 'start',
      message: `Starting deep research for: "${query}"`,
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Flush immediately
    if (res.flush) res.flush();

    try {
      // Perform deep research and stream thoughts
      const includeWebSearchBool = includeWebSearch === 'true';
      // Get user ID from authenticated request
      const userId = (req as any).user?.id;

      // Create new instance for this request
      const researchService = new DeepResearchService(userId);
      for await (const thought of researchService.performDeepResearch(queryStr, maxThoughtsNum, timezone as string, includeWebSearchBool, userId)) {
        const eventData = {
          type: 'thought',
          thought: {
            thoughtNumber: thought.thoughtNumber,
            totalThoughts: thought.totalThoughts,
            thought: thought.thought,
            action: thought.action,
            actionDetails: thought.actionDetails,
            result: thought.result,
            nextThoughtNeeded: thought.nextThoughtNeeded,
            timestamp: thought.timestamp.toISOString()
          }
        };

        res.write(`data: ${JSON.stringify(eventData)}\n\n`);

        // Flush immediately to ensure real-time streaming
        if (res.flush) res.flush();

        // Small delay to prevent overwhelming the client
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Send completion message
      const result = researchService.getResearchResult();
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        result: {
          finalAnswer: result.finalAnswer,
          confidence: result.confidence,
          sourcesCount: result.sources.length,
          thoughtsCount: result.thoughtProcess.length,
          sources: result.sources
        },
        timestamp: new Date().toISOString()
      })}\n\n`);

      if (res.flush) res.flush();

    } catch (researchError) {
      console.error('Deep research error:', researchError);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: researchError instanceof Error ? researchError.message : 'Research failed',
        timestamp: new Date().toISOString()
      })}\n\n`);

      if (res.flush) res.flush();
    }

    // End the stream
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    next(error);
  }
});

export default router;