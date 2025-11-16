import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { readUrlContent, UrlReaderOptions } from '../utils/urlReader';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/url-reader:
 *   post:
 *     summary: Read and process content from a URL
 *     tags: [URL Reader]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: The URL to read content from
 *               returnRaw:
 *                 type: boolean
 *                 description: Return raw content without HTML to Markdown conversion
 *                 default: false
 *               maxRetries:
 *                 type: integer
 *                 description: Maximum number of retry attempts
 *                 default: 3
 *                 minimum: 1
 *                 maximum: 10
 *               startChar:
 *                 type: integer
 *                 description: Starting character position for content extraction
 *                 minimum: 0
 *               maxLength:
 *                 type: integer
 *                 description: Maximum length of content to return
 *                 minimum: 1
 *               section:
 *                 type: string
 *                 description: Extract specific section by heading
 *               paragraphRange:
 *                 type: string
 *                 description: Extract paragraph range (e.g., "1-5", "3", "10-")
 *               readHeadings:
 *                 type: boolean
 *                 description: Extract only headings from the content
 *                 default: false
 *     responses:
 *       200:
 *         description: URL content retrieved successfully
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
 *                     content:
 *                       type: string
 *                       description: The processed content from the URL
 *                     url:
 *                       type: string
 *                       description: The original URL
 *                     processingTime:
 *                       type: number
 *                       description: Time taken to process the URL in milliseconds
 *       400:
 *         description: Validation error or invalid URL
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', [
  body('url')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Please provide a valid URL starting with http:// or https://')
    .isLength({ min: 1, max: 2000 })
    .withMessage('URL must be between 1 and 2000 characters'),
  body('returnRaw')
    .optional()
    .isBoolean()
    .withMessage('returnRaw must be a boolean'),
  body('maxRetries')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('maxRetries must be between 1 and 10'),
  body('startChar')
    .optional()
    .isInt({ min: 0 })
    .withMessage('startChar must be a non-negative integer'),
  body('maxLength')
    .optional()
    .isInt({ min: 1 })
    .withMessage('maxLength must be a positive integer'),
  body('section')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('section must be between 1 and 200 characters'),
  body('paragraphRange')
    .optional()
    .matches(/^(\d+)(?:-(\d*))?$/)
    .withMessage('paragraphRange must be in format like "1-5", "3", or "10-"'),
  body('readHeadings')
    .optional()
    .isBoolean()
    .withMessage('readHeadings must be a boolean'),
], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => error.msg);
      throw createError(`Validation failed: ${errorMessages.join(', ')}`, 400);
    }

    const {
      url,
      returnRaw = false,
      maxRetries = 3,
      startChar,
      maxLength,
      section,
      paragraphRange,
      readHeadings = false,
    } = req.body;

    const options: UrlReaderOptions = {
      returnRaw,
      maxRetries,
      startChar,
      maxLength,
      section,
      paragraphRange,
      readHeadings,
    };

    const startTime = Date.now();
    const content = await readUrlContent(url, 15000, options); // 15 second timeout
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        content,
        url,
        processingTime,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;