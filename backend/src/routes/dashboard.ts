// Dashboard stats route
import express from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/dashboard/stats
 * Returns analytics for the dashboard: total resources, resources added this week, searches today.
 */
router.get('/stats', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const userId = req.user!.id;
        // Total resources
        const totalResources = await prisma.resource.count({ where: { user_id: userId } });
        // Resources added in the last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const addedThisWeek = await prisma.resource.count({
            where: {
                user_id: userId,
                created_at: { gte: oneWeekAgo },
            },
        });
        // Count searches performed today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const searchesToday = await prisma.searchLog.count({
            where: {
                user_id: userId,
                created_at: { gte: today },
            },
        });

        res.json({
            success: true,
            data: { totalResources, addedThisWeek, searchesToday },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
