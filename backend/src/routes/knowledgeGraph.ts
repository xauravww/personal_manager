import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { aiService } from '../services/aiService';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// Get graph data
router.get('/graph', async (req, res) => {
    try {
        const userId = (req as any).user.id;

        // Fetch all relevant nodes and progress data
        const [subjects, modules, resources, connections, progressData] = await Promise.all([
            prisma.learningSubject.findMany({
                where: { user_id: userId, is_active: true },
                select: { id: true, name: true, description: true, current_level: true }
            }),
            prisma.learningModule.findMany({
                where: { subject: { user_id: userId } },
                select: { id: true, title: true, description: true, difficulty: true, subject_id: true }
            }),
            prisma.resource.findMany({
                where: { user_id: userId },
                select: { id: true, title: true, type: true, url: true }
            }),
            prisma.knowledgeConnection.findMany({
                where: { user_id: userId }
            }),
            prisma.learningProgress.findMany({
                where: { user_id: userId },
                select: {
                    module_id: true,
                    subject_id: true,
                    status: true,
                    score: true,
                    time_spent: true,
                    completed_at: true,
                    updated_at: true
                }
            })
        ]);

        // Create progress map by module_id
        const moduleProgressMap = new Map();
        progressData.forEach((p: any) => {
            moduleProgressMap.set(p.module_id, p);
        });

        // Calculate subject progress from modules
        const subjectProgressMap = new Map();
        progressData.forEach((p: any) => {
            if (!subjectProgressMap.has(p.subject_id)) {
                subjectProgressMap.set(p.subject_id, []);
            }
            subjectProgressMap.get(p.subject_id).push(p);
        });

        // Helper to calculate completion percentage
        const getCompletion = (progress: any) => {
            if (!progress) return 0;
            if (progress.status === 'completed') return 100;
            if (progress.score !== null && progress.score !== undefined) return Math.round(progress.score);
            if (progress.status === 'in_progress') return 50;
            return 0;
        };

        // Format nodes for frontend with progress data
        const nodes = [
            ...subjects.map((s: any) => {
                const subjectModules = subjectProgressMap.get(s.id) || [];
                const avgCompletion = subjectModules.length > 0
                    ? Math.round(subjectModules.reduce((acc: number, p: any) => acc + getCompletion(p), 0) / subjectModules.length)
                    : 0;
                const totalTime = subjectModules.reduce((acc: number, p: any) => acc + (p.time_spent || 0), 0);
                const lastActivity = subjectModules.length > 0
                    ? new Date(Math.max(...subjectModules.map((p: any) => new Date(p.updated_at).getTime())))
                    : null;

                return {
                    id: s.id,
                    type: 'subject',
                    data: {
                        label: s.name,
                        ...s,
                        completion: avgCompletion,
                        status: avgCompletion >= 90 ? 'completed' : avgCompletion > 0 ? 'in_progress' : 'not_started',
                        timeSpent: totalTime,
                        lastActivity: lastActivity?.toISOString()
                    },
                    position: { x: 0, y: 0 }
                };
            }),
            ...modules.map((m: any) => {
                const progress = moduleProgressMap.get(m.id);
                const completion = getCompletion(progress);

                return {
                    id: m.id,
                    type: 'module',
                    data: {
                        label: m.title,
                        ...m,
                        completion,
                        status: progress?.status || 'not_started',
                        score: progress?.score || null,
                        timeSpent: progress?.time_spent || 0,
                        completedAt: progress?.completed_at?.toISOString(),
                        lastActivity: progress?.updated_at?.toISOString()
                    },
                    position: { x: 0, y: 0 }
                };
            }),
            ...resources.map((r: any) => ({
                id: r.id,
                type: 'resource',
                data: { label: r.title, ...r },
                position: { x: 0, y: 0 }
            }))
        ];

        // Format edges
        const edges = connections.map((c: any) => ({
            id: c.id,
            source: c.source_id,
            target: c.target_id,
            type: 'default',
            data: { strength: c.strength, type: c.type },
            animated: c.strength > 0.8
        }));

        // Add implicit edges (Subject -> Module)
        modules.forEach((m: any) => {
            edges.push({
                id: `implicit-${m.subject_id}-${m.id}`,
                source: m.subject_id,
                target: m.id,
                type: 'default',
                data: { strength: 1, type: 'hierarchy' },
                animated: false
            });
        });

        res.json({ nodes, edges });
    } catch (error) {
        console.error('Error fetching knowledge graph:', error);
        res.status(500).json({ error: 'Failed to fetch knowledge graph' });
    }
});

// Create manual connection
router.post('/connect', async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const { sourceId, sourceType, targetId, targetType, type = 'user_defined', strength = 1.0 } = req.body;

        const connection = await prisma.knowledgeConnection.create({
            data: {
                user_id: userId,
                source_id: sourceId,
                source_type: sourceType,
                target_id: targetId,
                target_type: targetType,
                type,
                strength
            }
        });

        res.status(201).json(connection);
    } catch (error) {
        console.error('Error creating connection:', error);
        res.status(500).json({ error: 'Failed to create connection' });
    }
});

// Generate connections using AI
router.post('/generate', async (req, res) => {
    try {
        const userId = (req as any).user.id;

        // 1. Fetch all items with embeddings
        const [subjects, modules, resources] = await Promise.all([
            prisma.learningSubject.findMany({
                where: { user_id: userId, is_active: true, embedding: { not: null } }
            }),
            prisma.learningModule.findMany({
                where: { subject: { user_id: userId }, embedding: { not: null } }
            }),
            prisma.resource.findMany({
                where: { user_id: userId, embedding: { not: null } }
            })
        ]);

        const newConnections = [];

        // Helper to calculate cosine similarity
        const cosineSimilarity = (vecA: number[], vecB: number[]) => {
            const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
            const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
            const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
            return dotProduct / (magA * magB);
        };

        // 2. Compare Subjects <-> Resources
        for (const subject of subjects) {
            if (!subject.embedding) continue;
            const subjectVec = JSON.parse(subject.embedding);

            for (const resource of resources) {
                if (!resource.embedding) continue;
                const resourceVec = JSON.parse(resource.embedding);

                const similarity = cosineSimilarity(subjectVec, resourceVec);
                if (similarity > 0.75) { // Threshold
                    // Check if exists
                    const exists = await prisma.knowledgeConnection.findFirst({
                        where: {
                            user_id: userId,
                            source_id: subject.id,
                            target_id: resource.id
                        }
                    });

                    if (!exists) {
                        const conn = await prisma.knowledgeConnection.create({
                            data: {
                                user_id: userId,
                                source_id: subject.id,
                                source_type: 'subject',
                                target_id: resource.id,
                                target_type: 'resource',
                                strength: similarity,
                                type: 'semantic'
                            }
                        });
                        newConnections.push(conn);
                    }
                }
            }
        }

        // TODO: Add more comparisons (Module <-> Resource, Module <-> Module) as needed

        res.json({ message: `Generated ${newConnections.length} new connections`, connections: newConnections });

    } catch (error) {
        console.error('Error generating connections:', error);
        res.status(500).json({ error: 'Failed to generate connections' });
    }
});

export default router;
