import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { transcriptionQueue } from '../queues/transcriptionQueue';

const router = Router();

/**
 * Verify Instagram webhook signature
 */
function verifySignature(payload: string, signature: string | undefined): boolean {
    if (!signature) {
        console.error('No signature provided');
        return false;
    }

    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    if (!appSecret) {
        console.error('INSTAGRAM_APP_SECRET not configured');
        return false;
    }

    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(payload)
        .digest('hex');

    console.log('Signature check:', {
        received: signature,
        expected: expectedSignature,
        match: signature === expectedSignature
    });

    return signature === expectedSignature;
}

/**
 * Extract Instagram URL from webhook data
 */
function extractInstagramUrl(webhookData: any): string | null {
    // Check for mentions
    if (webhookData.media_id) {
        // Build Instagram URL from media ID
        return `https://www.instagram.com/p/${webhookData.media_id}/`;
    }

    // Check for messages with URLs
    if (webhookData.message?.text) {
        const urlMatch = webhookData.message.text.match(/https?:\/\/([a-z]+\.)?instagram\.com\/[^\s]+/i);
        if (urlMatch) {
            return urlMatch[0];
        }
    }

    // Check for story mentions
    if (webhookData.media?.media_url) {
        return webhookData.media.media_url;
    }

    return null;
}

/**
 * Scrape Instagram post metadata
 */
async function scrapeInstagramPost(url: string) {
    try {
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);

        const ogTitle = $('meta[property="og:title"]').attr('content') || '';
        const ogDescription = $('meta[property="og:description"]').attr('content') || '';
        const ogImage = $('meta[property="og:image"]').attr('content') || '';
        const ogVideo = $('meta[property="og:video"]').attr('content') || '';

        return {
            title: ogTitle,
            description: ogDescription,
            thumbnail: ogImage,
            video: ogVideo,
            url
        };
    } catch (error) {
        console.error('Error scraping Instagram post:', error);
        throw error;
    }
}

/**
 * GET /api/webhooks/instagram/webhook
 * Webhook verification endpoint (required by Meta)
 */
router.get('/instagram/webhook', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('📱 Instagram webhook verification request');

    const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('✅ Webhook verified successfully');
        res.status(200).send(challenge);
    } else {
        console.error('❌ Webhook verification failed');
        res.sendStatus(403);
    }
});

/**
 * POST /api/webhooks/instagram/webhook
 * Webhook event receiver - adds jobs to queue for async processing
 */
// Simple in-memory cache to store recent text messages
// Map<senderId, { text: string, timestamp: number, language: string }>
const lastTextCache = new Map<string, { text: string, timestamp: number, language?: string }>();

// Buffer for video messages waiting for potential text
// Map<senderId, { timeout: NodeJS.Timeout, data: any }>
const pendingVideoCache = new Map<string, { timeout: NodeJS.Timeout, data: any }>();

// Helper to extract language from text (e.g., ":en Rest of text")
function extractLanguage(text: string): { language: string, cleanText: string } {
    const langMatch = text.match(/^:([a-z]{2,4})\s+(.+)/i);
    if (langMatch) {
        return {
            language: langMatch[1].toLowerCase(),
            cleanText: langMatch[2]
        };
    }
    return {
        language: 'hi', // Default to Hindi for Hinglish support
        cleanText: text
    };
}

// Helper to process a video job
async function processVideoJob(videoData: any, titleText: string | null, userId: string, language: string = 'hi') {
    const { assetUrl, senderId } = videoData;

    // Use message text as title if available, otherwise use timestamp
    const title = titleText ?
        (titleText.length > 50 ? titleText.substring(0, 50) + '...' : titleText) :
        `DM Video - ${new Date().toLocaleString()}`;

    console.log(`🎬 Processing Video Job for ${senderId} with title: "${title}"`);

    const originalCaption = (videoData as any).originalCaption;
    const metadata = {
        title: title,
        description: originalCaption || titleText || 'Video sent via DM', // Use reel's caption as description
        thumbnail: '',
        video: assetUrl,
        url: assetUrl, // This is a temporary CDN URL
        sourceType: 'dm_media',
        language: language, // Pass language preference
        original_caption: originalCaption || null // Store original reel caption
    };

    // Add to queue - worker will just transcribe the CDN URL
    const job = await transcriptionQueue.add('transcribe-reel', {
        videoUrl: assetUrl,
        metadata,
        userId,
        isRealReel: false,
        language: language // Pass to worker
    });
    console.log(`✅ Job ${job.id} added to queue (DM Media, language: ${language})`);
}

router.post('/instagram/webhook', async (req: Request, res: Response) => {
    try {
        const rawBody = (req as any).rawBody || JSON.stringify(req.body);
        const signature = req.headers['x-hub-signature-256'] as string;

        console.log('📱 Webhook request received');

        // TEMPORARILY SKIP SIGNATURE VERIFICATION
        console.log('⚠️  Signature verification temporarily disabled');

        console.log('📱 Received Instagram webhook');

        // Quick response to Meta (MUST be < 20 seconds)
        res.sendStatus(200);

        // Process webhook asynchronously via queue
        const webhookData = req.body;

        if (!webhookData.entry || !Array.isArray(webhookData.entry)) {
            console.warn('No entries in webhook data');
            return;
        }

        const userId = process.env.INSTAGRAM_WEBHOOK_USER_ID;
        if (!userId) {
            console.error('INSTAGRAM_WEBHOOK_USER_ID not configured');
            return;
        }

        for (const entry of webhookData.entry) {
            if (!entry.messaging || !Array.isArray(entry.messaging)) {
                continue;
            }

            for (const message of entry.messaging) {
                try {
                    console.log('📩 Processing message:', JSON.stringify(message.message, null, 2));

                    const senderId = message.sender?.id || 'unknown';
                    const text = message.message?.text || "";
                    const attachments = message.message?.attachments || [];
                    const INSTAGRAM_URL_REGEX = /(https?:\/\/(www\.)?instagram\.com\/(reel|p|tv)\/[A-Za-z0-9\-_]+)/;

                    // 1. Check for REAL Instagram link in text (Forwarded Reel)
                    const match = text.match(INSTAGRAM_URL_REGEX);
                    if (match) {
                        const realUrl = match[0];
                        console.log("🎬 REAL REEL FOUND (Forwarded):", realUrl);

                        // For real reels, we want to scrape metadata + transcribe
                        const metadata = {
                            title: 'Instagram Reel', // Will be updated by scraper
                            description: '',
                            thumbnail: '',
                            video: realUrl,
                            url: realUrl,
                            sourceType: 'real_reel'
                        };

                        // Add to queue - worker will handle scraping + transcription
                        const job = await transcriptionQueue.add('transcribe-reel', {
                            videoUrl: realUrl,
                            metadata,
                            userId,
                            isRealReel: true
                        });
                        console.log(`✅ Job ${job.id} added to queue (Real Reel)`);
                        continue; // Skip attachment check if we found a real reel
                    }

                    // 2. If text ONLY (no link, no attachments)
                    if (text && attachments.length === 0) {
                        const { language, cleanText } = extractLanguage(text);
                        console.log(`📝 Text received from ${senderId}: "${cleanText}" (lang: ${language})`);

                        // Check if there is a pending video waiting for this text
                        if (pendingVideoCache.has(senderId)) {
                            console.log(`🔗 Found pending video waiting for text! Linking...`);
                            const pending = pendingVideoCache.get(senderId);
                            clearTimeout(pending!.timeout); // Cancel the timeout
                            pendingVideoCache.delete(senderId);

                            // Process the video IMMEDIATELY with this text and language
                            await processVideoJob(pending!.data, cleanText, userId, language);
                        } else {
                            // No pending video, cache text for future video (Text -> Video case)
                            console.log(`📝 Caching text for potential future video`);
                            lastTextCache.set(senderId, {
                                text: cleanText,
                                timestamp: Date.now(),
                                language: language
                            });
                        }
                        continue;
                    }

                    // 3. If no link -> check for DM media (CDN asset)
                    if (attachments.length > 0) {
                        const attachment = attachments[0];
                        if (attachment.payload?.url) {
                            const assetUrl = attachment.payload.url;
                            const reelCaption = attachment.payload?.title; // Instagram's original caption as fallback

                            console.log("📹 DM MEDIA ASSET FOUND:", assetUrl);
                            if (reelCaption) {
                                console.log(`📄 Reel has original caption: "${reelCaption.substring(0, 50)}..."`);
                            }

                            // Priority 1: Check cache for user's custom text (they sent text with video)
                            const cached = lastTextCache.get(senderId);
                            if (cached && (Date.now() - cached.timestamp < 10000)) {
                                console.log(`🔗 Found user's custom text: "${cached.text}" (lang: ${cached.language || 'hi'})`);
                                lastTextCache.delete(senderId);
                                // Pass both custom text AND original caption
                                await processVideoJob(
                                    { assetUrl, senderId, originalCaption: reelCaption },
                                    cached.text,
                                    userId,
                                    cached.language || 'hi'
                                );
                            } else {
                                // Priority 2: Buffer video for 10 seconds to wait for user's text
                                console.log(`⏳ Buffering video for 10s to wait for user's text...`);

                                const timeout = setTimeout(() => {
                                    console.log(`⏰ Timeout reached for ${senderId}`);
                                    pendingVideoCache.delete(senderId);

                                    // Use reel's caption as fallback for title
                                    if (reelCaption && reelCaption.trim()) {
                                        const cleanCaption = reelCaption.split('\n')[0].trim(); // First line only
                                        console.log(`📋 Using reel's caption as fallback: "${cleanCaption}"`);
                                        processVideoJob({ assetUrl, senderId, originalCaption: reelCaption }, cleanCaption, userId, 'hi');
                                    } else {
                                        console.log(`📅 No caption found, using timestamp`);
                                        processVideoJob({ assetUrl, senderId }, null, userId, 'hi');
                                    }
                                }, 10000); // 10 seconds timeout

                                pendingVideoCache.set(senderId, {
                                    timeout,
                                    data: { assetUrl, senderId, originalCaption: reelCaption }
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            }
        }
    } catch (error) {
        console.error('Error processing Instagram webhook:', error);
        if (!res.headersSent) {
            res.sendStatus(200);
        }
    }
});

export default router;
