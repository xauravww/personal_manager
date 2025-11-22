import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { aiService } from '../services/aiService';
import embeddingService from '../services/embeddingService';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error as Error, uploadDir);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx|txt|png|jpg|jpeg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, TXT, PNG, JPG'));
    }
});

// Apply authentication to all capture routes
router.use(authenticateToken);

/**
 * POST /api/capture/text
 * Capture plain text or pasted content
 */
router.post('/text', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { content } = req.body;

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({ error: 'Content is required' });
        }

        console.log('📝 Capturing text content...');

        // AI analysis
        const metadata = await aiService.analyzeAndCategorizeContent(content);

        // Generate embedding
        const embedding = await embeddingService.generateEmbedding(content);

        // Create or get tags
        const tagRecords = await Promise.all(
            metadata.tags.map(async (tagName) => {
                return await prisma.tag.upsert({
                    where: {
                        user_id_name: {
                            user_id: userId,
                            name: tagName.toLowerCase()
                        }
                    },
                    update: {},
                    create: {
                        user_id: userId,
                        name: tagName.toLowerCase()
                    }
                });
            })
        );

        // Create resource
        const resource = await prisma.resource.create({
            data: {
                user_id: userId,
                title: metadata.title,
                description: metadata.description,
                content: content,
                type: metadata.category,
                embedding: JSON.stringify(embedding),
                tags: {
                    connect: tagRecords.map(tag => ({ id: tag.id }))
                }
            },
            include: {
                tags: true
            }
        });

        console.log('✅ Text captured successfully');

        res.status(201).json({
            success: true,
            resource: resource,
            metadata: metadata
        });

    } catch (error) {
        console.error('Error capturing text:', error);
        res.status(500).json({ error: 'Failed to capture text' });
    }
});

/**
 * POST /api/capture/url
 * Capture content from a URL
 */
router.post('/url', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { url } = req.body;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'URL is required' });
        }

        console.log('🔗 Fetching URL:', url);

        // Detect Instagram URLs (posts or reels)
        const isInstagram = /https?:\/\/([a-z]+\.)?instagram\.com\//i.test(url);

        if (isInstagram) {
            // Simple Instagram metadata extraction using cheerio (no headless browser)
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; NexusBrain/1.0)'
                }
            });
            const html = response.data;
            const $ = cheerio.load(html);

            const ogTitle = $('meta[property="og:title"]').attr('content') || '';
            const ogDescription = $('meta[property="og:description"]').attr('content') || '';
            const ogImage = $('meta[property="og:image"]').attr('content') || '';
            const ogVideo = $('meta[property="og:video"]').attr('content') || '';

            // Use AI to further analyze extracted text
            const aiResult = await aiService.analyzeAndCategorizeContent(`${ogTitle}\n${ogDescription}`);

            // Generate embedding from AI summary
            const embedding = await embeddingService.generateEmbedding(aiResult.summary);

            // Create resource entry
            const resource = await prisma.resource.create({
                data: {
                    user_id: userId,
                    title: aiResult.title || ogTitle,
                    description: aiResult.description || ogDescription,
                    type: aiResult.category,
                    content: `${ogTitle}\n${ogDescription}`,
                    url,
                    metadata: { ...aiResult, ogTitle, ogDescription, ogImage, ogVideo },
                    embedding: JSON.stringify(embedding)
                }
            });

            // Upsert tags from AI results
            await Promise.all(aiResult.tags.map(async (tagName: string) => {
                const tag = await prisma.tag.upsert({
                    where: {
                        user_id_name: {
                            name: tagName.toLowerCase(),
                            user_id: userId
                        }
                    },
                    update: {},
                    create: { name: tagName.toLowerCase(), user_id: userId }
                });
                // Connect tag to resource via many-to-many relation
                await prisma.resource.update({
                    where: { id: resource.id },
                    data: { tags: { connect: { id: tag.id } } }
                });
            }));

            return res.json({ success: true, resource });
        }

        // Existing generic URL handling
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NexusBrain/1.0)'
            }
        });

        // Parse HTML
        const $ = cheerio.load(response.data);

        // Remove script and style tags
        $('script, style, nav, footer, header').remove();

        // Extract text content
        const title = $('title').text() || $('h1').first().text() || 'Web Page';
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
        const content = bodyText.substring(0, 5000); // Limit content

        if (!content) {
            return res.status(400).json({ error: 'No content found at URL' });
        }

        // AI analysis
        const metadata = await aiService.analyzeAndCategorizeContent(content);

        // Generate embedding
        const embedding = await embeddingService.generateEmbedding(content);

        // Create or get tags
        const tagRecords = await Promise.all(
            metadata.tags.map(async (tagName) => {
                return await prisma.tag.upsert({
                    where: {
                        user_id_name: {
                            user_id: userId,
                            name: tagName.toLowerCase()
                        }
                    },
                    update: {},
                    create: {
                        user_id: userId,
                        name: tagName.toLowerCase()
                    }
                });
            })
        );

        // Create resource with URL
        const resource = await prisma.resource.create({
            data: {
                user_id: userId,
                title: metadata.title || title,
                description: metadata.description,
                content: content,
                url: url,
                type: 'link',
                embedding: JSON.stringify(embedding),
                tags: {
                    connect: tagRecords.map(tag => ({ id: tag.id }))
                }
            },
            include: {
                tags: true
            }
        });

        console.log('✅ URL captured successfully');

        res.status(201).json({
            success: true,
            resource: resource,
            metadata: metadata
        });

    } catch (error) {
        console.error('Error capturing URL:', error);
        res.status(500).json({ error: 'Failed to capture URL' });
    }
});

/**
 * POST /api/capture/file
 * Upload and process files (PDF, DOCX, etc.)
 */
router.post('/file', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('📄 Processing file:', file.originalname);

        let content = '';
        const ext = path.extname(file.originalname).toLowerCase();

        // Extract text based on file type
        if (ext === '.pdf') {
            const dataBuffer = await fs.readFile(file.path);
            const pdfData = await pdf(dataBuffer);
            content = pdfData.text;
        } else if (ext === '.docx') {
            const result = await mammoth.extractRawText({ path: file.path });
            content = result.value;
        } else if (ext === '.txt') {
            content = await fs.readFile(file.path, 'utf-8');
        } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
            // For images, we'll just use filename and create a placeholder
            content = `Image file: ${file.originalname}`;
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Could not extract text from file' });
        }

        // AI analysis
        const metadata = await aiService.analyzeAndCategorizeContent(content);

        // Generate embedding
        const embedding = await embeddingService.generateEmbedding(content.substring(0, 2000));

        // Create or get tags
        const tagRecords = await Promise.all(
            metadata.tags.map(async (tagName) => {
                return await prisma.tag.upsert({
                    where: {
                        user_id_name: {
                            user_id: userId,
                            name: tagName.toLowerCase()
                        }
                    },
                    update: {},
                    create: {
                        user_id: userId,
                        name: tagName.toLowerCase()
                    }
                });
            })
        );

        // Create resource
        const resource = await prisma.resource.create({
            data: {
                user_id: userId,
                title: metadata.title || file.originalname,
                description: metadata.description,
                content: content.substring(0, 5000),
                file_path: file.path,
                type: 'document',
                embedding: JSON.stringify(embedding),
                tags: {
                    connect: tagRecords.map(tag => ({ id: tag.id }))
                }
            },
            include: {
                tags: true
            }
        });

        console.log('✅ File captured successfully');

        res.status(201).json({
            success: true,
            resource: resource,
            metadata: metadata
        });

    } catch (error) {
        console.error('Error capturing file:', error);
        // Clean up uploaded file on error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error cleaning up file:', unlinkError);
            }
        }
        res.status(500).json({ error: 'Failed to capture file' });
    }
});

export default router;
