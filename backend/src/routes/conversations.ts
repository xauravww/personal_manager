import express from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     summary: Get all conversations for the user
 *     tags: [Conversations]
 *     responses:
 *       200:
 *         description: List of conversations
 */
router.get('/', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const userId = req.user!.id;
        const conversations = await prisma.conversation.findMany({
            where: { user_id: userId },
            orderBy: { updated_at: 'desc' },
            include: {
                _count: {
                    select: { messages: true }
                }
            }
        });

        res.json({
            success: true,
            data: conversations
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/conversations:
 *   post:
 *     summary: Create a new conversation
 *     tags: [Conversations]
 *     responses:
 *       201:
 *         description: Conversation created
 */
router.post('/', [
    body('title').optional().isString().trim().isLength({ max: 100 }),
    body('initialMessage').optional().isString()
], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const userId = req.user!.id;
        const { title, initialMessage } = req.body;

        const conversation = await prisma.conversation.create({
            data: {
                user_id: userId,
                title: title || 'New Chat',
                ...(initialMessage && {
                    messages: {
                        create: {
                            role: 'user',
                            content: initialMessage
                        }
                    }
                })
            },
            include: {
                messages: true
            }
        });

        res.status(201).json({
            success: true,
            data: conversation
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/conversations/{id}:
 *   get:
 *     summary: Get a specific conversation with messages
 *     tags: [Conversations]
 *     responses:
 *       200:
 *         description: Conversation details
 */
router.get('/:id', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const conversation = await prisma.conversation.findFirst({
            where: { id, user_id: userId },
            include: {
                messages: {
                    orderBy: { created_at: 'asc' }
                }
            }
        });

        if (!conversation) {
            throw createError('Conversation not found', 404);
        }

        res.json({
            success: true,
            data: conversation
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/conversations/{id}:
 *   delete:
 *     summary: Delete a conversation
 *     tags: [Conversations]
 *     responses:
 *       200:
 *         description: Conversation deleted
 */
router.delete('/:id', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const conversation = await prisma.conversation.findFirst({
            where: { id, user_id: userId }
        });

        if (!conversation) {
            throw createError('Conversation not found', 404);
        }

        await prisma.conversation.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Conversation deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/conversations/{id}:
 *   patch:
 *     summary: Update conversation details (e.g. title)
 *     tags: [Conversations]
 *     responses:
 *       200:
 *         description: Conversation updated
 */
router.patch('/:id', [
    body('title').optional().isString().trim().isLength({ min: 1, max: 100 })
], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        const { title } = req.body;

        const conversation = await prisma.conversation.findFirst({
            where: { id, user_id: userId }
        });

        if (!conversation) {
            throw createError('Conversation not found', 404);
        }

        const updated = await prisma.conversation.update({
            where: { id },
            data: { title },
        });

        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/conversations/{id}/messages:
 *   post:
 *     summary: Add a message to a conversation
 *     tags: [Conversations]
 *     responses:
 *       201:
 *         description: Message added
 */
router.post('/:id/messages', [
    body('role').isIn(['user', 'assistant']),
    body('content').isString().notEmpty(),
    body('citations').optional().isString(), // JSON string
    body('suggestions').optional().isString() // JSON string
], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        const { role, content, citations, suggestions } = req.body;

        const conversation = await prisma.conversation.findFirst({
            where: { id, user_id: userId }
        });

        if (!conversation) {
            throw createError('Conversation not found', 404);
        }

        const message = await prisma.message.create({
            data: {
                conversation_id: id,
                role,
                content,
                citations,
                suggestions
            }
        });

        // Update conversation updated_at
        await prisma.conversation.update({
            where: { id },
            data: { updated_at: new Date() }
        });

        res.status(201).json({
            success: true,
            data: message
        });
    } catch (error) {
        next(error);
    }
});

export default router;
