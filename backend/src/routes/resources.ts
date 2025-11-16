import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import prisma from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { CreateResourceRequest } from '../types';
import aiService from '../services/aiService';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/resources:
 *   get:
 *     summary: Get user's resources with pagination
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 12
 *         description: Number of resources per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [note, video, link, document]
 *         description: Filter by resource type
 *     responses:
 *       200:
 *         description: Resources retrieved successfully
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['note', 'video', 'link', 'document']),
], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = (page - 1) * limit;
    const type = req.query.type as string;

    const where: any = {
      user_id: userId,
    };

    if (type) {
      where.type = type;
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

    res.json({
      success: true,
      data: {
        resources,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/resources/{id}:
 *   get:
 *     summary: Get a specific resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resource retrieved successfully
 *       404:
 *         description: Resource not found
 */
router.get('/:id', [
  param('id').isUUID(),
], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const userId = req.user!.id;
    const resourceId = req.params.id;

    const resource = await prisma.resource.findFirst({
      where: {
        id: resourceId,
        user_id: userId,
      },
      include: {
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!resource) {
      throw createError('Resource not found', 404);
    }

    res.json({
      success: true,
      data: { resource },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/resources:
 *   post:
 *     summary: Create a new resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               url:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [note, video, link, document]
 *               content:
 *                 type: string
 *               file_path:
 *                 type: string
 *               metadata:
 *                 type: object
 *               tag_names:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Resource created successfully
 */
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 500 }).matches(/^[a-zA-Z0-9\s\-_.,!?()]+$/).withMessage('Title contains invalid characters'),
  body('type').isIn(['note', 'video', 'link', 'document']),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('url').optional().isURL(),
  body('content').optional().trim().isLength({ max: 10000 }),
  body('file_path').optional().trim().isLength({ max: 500 }),
  body('metadata').optional().isObject(),
  body('tag_names').optional().isArray().custom((value) => {
    if (!Array.isArray(value)) return false;
    return value.every(tag => typeof tag === 'string' && tag.length <= 50 && /^[a-zA-Z0-9\s\-_]+$/.test(tag));
  }).withMessage('Tag names must be strings with valid characters and max length 50'),
], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const userId = req.user!.id;
    const { title, description, url, type, content, file_path, metadata, tag_names }: CreateResourceRequest = req.body;

    // Create resource with tags using Prisma transaction
    const resource = await prisma.$transaction(async (tx) => {
      // Create resource
      const newResource = await tx.resource.create({
        data: {
          user_id: userId,
          title,
          description,
          url,
          type,
          content,
          file_path,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
      });

      // Handle tags
      if (tag_names && tag_names.length > 0) {
        for (const tagName of tag_names) {
          // Upsert tag (create if doesn't exist)
          const tag = await tx.tag.upsert({
            where: {
              user_id_name: {
                user_id: userId,
                name: tagName,
              },
            },
            update: {},
            create: {
              user_id: userId,
              name: tagName,
            },
          });

          // Connect tag to resource
          await tx.resource.update({
            where: { id: newResource.id },
            data: {
              tags: {
                connect: { id: tag.id },
              },
            },
          });
        }
      }

      // Return resource with tags
      return tx.resource.findUnique({
        where: { id: newResource.id },
        include: {
          tags: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    // AI processing for resource creation
    if (resource) {
      try {
        // Generate summary if content is long
        if (resource.content && resource.content.length > 200) {
          const summary = await aiService.summarizeContent(resource.content, 100);
          await prisma.resource.update({
            where: { id: resource.id },
            data: { description: summary },
          });
        }

        // Extract tags from content
        if (resource.content) {
          const extractedTags = await aiService.extractTags(resource.content, 3);
          if (extractedTags.length > 0) {
            for (const tagName of extractedTags) {
              const tag = await prisma.tag.upsert({
                where: {
                  user_id_name: {
                    user_id: userId,
                    name: tagName,
                  },
                },
                update: {},
                create: {
                  user_id: userId,
                  name: tagName,
                },
              });

              await prisma.resource.update({
                where: { id: resource.id },
                data: {
                  tags: {
                    connect: { id: tag.id },
                  },
                },
              });
            }
          }
        }

        // Generate embedding for semantic search
        const textToEmbed = `${resource.title} ${resource.description || ''} ${resource.content || ''}`.trim();
        if (textToEmbed) {
          try {
            const embeddingResponse = await aiService.createEmbeddings(textToEmbed);
            const embedding = embeddingResponse.data[0].embedding;
            await prisma.resource.update({
              where: { id: resource.id },
              data: { embedding: JSON.stringify(embedding) },
            });
          } catch (embeddingError) {
            console.warn('Failed to generate embedding for new resource:', embeddingError);
          }
        }
      } catch (aiError) {
        console.warn('AI processing failed for new resource:', aiError);
        // Continue without AI processing
      }
    }

    res.status(201).json({
      success: true,
      data: { resource },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/resources/{id}:
 *   put:
 *     summary: Update a resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               url:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [note, video, link, document]
 *               content:
 *                 type: string
 *               file_path:
 *                 type: string
 *               metadata:
 *                 type: object
 *               tag_names:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Resource updated successfully
 *       404:
 *         description: Resource not found
 */
router.put('/:id', [
  param('id').isUUID(),
  body('title').optional().trim().isLength({ min: 1, max: 500 }),
  body('type').optional().isIn(['note', 'video', 'link', 'document']),
  body('description').optional().trim(),
  body('url').optional().isURL(),
  body('content').optional().trim(),
  body('file_path').optional().trim(),
  body('metadata').optional().isObject(),
  body('tag_names').optional().isArray(),
], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const userId = req.user!.id;
    const resourceId = req.params.id;
    const updates: Partial<CreateResourceRequest> = req.body;

    // Update resource with tags using Prisma transaction
    const resource = await prisma.$transaction(async (tx) => {
      // Check if resource exists and belongs to user
      const existingResource = await tx.resource.findFirst({
        where: {
          id: resourceId,
          user_id: userId,
        },
      });

      if (!existingResource) {
        throw createError('Resource not found', 404);
      }

      // Prepare update data
      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.url !== undefined) updateData.url = updates.url;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.file_path !== undefined) updateData.file_path = updates.file_path;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

      // Prepare update data for SQLite
      const preparedUpdateData = { ...updateData };
      if (preparedUpdateData.metadata !== undefined) {
        preparedUpdateData.metadata = preparedUpdateData.metadata ? JSON.stringify(preparedUpdateData.metadata) : null;
      }

      // Update resource
      await tx.resource.update({
        where: { id: resourceId },
        data: preparedUpdateData,
      });

      // Handle tags update
      if (updates.tag_names !== undefined) {
        // Disconnect all existing tags
        await tx.resource.update({
          where: { id: resourceId },
          data: {
            tags: {
              set: [],
            },
          },
        });

        // Connect new tags
        if (updates.tag_names.length > 0) {
          for (const tagName of updates.tag_names) {
            // Upsert tag
            const tag = await tx.tag.upsert({
              where: {
                user_id_name: {
                  user_id: userId,
                  name: tagName,
                },
              },
              update: {},
              create: {
                user_id: userId,
                name: tagName,
              },
            });

            // Connect tag to resource
            await tx.resource.update({
              where: { id: resourceId },
              data: {
                tags: {
                  connect: { id: tag.id },
                },
              },
            });
          }
        }
      }

      // Return updated resource with tags
      return tx.resource.findUnique({
        where: { id: resourceId },
        include: {
          tags: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

      res.json({
        success: true,
        data: { resource },
      });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/resources/{id}:
 *   delete:
 *     summary: Delete a resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resource deleted successfully
 *       404:
 *         description: Resource not found
 */
router.delete('/:id', [
  param('id').isUUID(),
], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const userId = req.user!.id;
    const resourceId = req.params.id;

    const deletedResource = await prisma.resource.deleteMany({
      where: {
        id: resourceId,
        user_id: userId,
      },
    });

    if (deletedResource.count === 0) {
      throw createError('Resource not found', 404);
    }

    res.json({
      success: true,
      message: 'Resource deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;