import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import instagramService from '../services/instagramService';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/resources/:resourceId/instagram/video-url
 * Fetch a fresh CDN URL for an Instagram reel resource
 * This is needed because Instagram CDN URLs expire
 */
router.get('/resources/:resourceId/instagram/video-url', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { resourceId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'User ID required' });
        }

        // Fetch the resource and verify ownership
        const resource = await prisma.resource.findFirst({
            where: {
                id: resourceId,
                user_id: userId
            }
        });

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        // Extract Instagram URL from metadata
        // Extract Instagram URL from metadata or resource
        const metadata = resource.metadata as any;
        let instagramUrl = metadata?.url;

        // Fallback 1: Check top-level resource URL
        if (!instagramUrl && resource.url && resource.url.includes('instagram.com')) {
            instagramUrl = resource.url;
        }

        // Fallback 2: Check metadata.video
        if (!instagramUrl && metadata?.video && metadata.video.includes('instagram.com')) {
            instagramUrl = metadata.video;
        }

        // Fallback 3: Construct from reel_id
        if (!instagramUrl && metadata?.reel_id) {
            instagramUrl = `https://www.instagram.com/reel/${metadata.reel_id}/`;
        }

        if (!instagramUrl) {
            return res.status(400).json({ error: 'No Instagram URL found in resource metadata' });
        }

        // Validate it's an Instagram URL
        if (!instagramUrl.includes('instagram.com')) {
            return res.status(400).json({ error: 'Resource is not an Instagram post' });
        }

        console.log(`🎬 Fetching fresh CDN URL for resource ${resourceId}`);

        // Fetch fresh data from Instagram
        const freshData = await instagramService.fetchInstagramReelData(instagramUrl);

        // Update resource metadata with fresh data (optional)
        await prisma.resource.update({
            where: { id: resourceId },
            data: {
                metadata: {
                    ...metadata,
                    cdn_url: freshData.videoUrl,
                    cdn_url_fetched_at: new Date().toISOString(),
                    thumbnail: freshData.thumbnail || metadata.thumbnail
                }
            }
        });

        res.json({
            success: true,
            data: {
                videoUrl: freshData.videoUrl,
                thumbnail: freshData.thumbnail,
                expiresNote: 'This URL will expire - fetch a new one when needed'
            }
        });

    } catch (error: any) {
        console.error('Error fetching Instagram video URL:', error);
        res.status(500).json({
            error: 'Failed to fetch Instagram video URL',
            message: error.message
        });
    }
});

export default router;
