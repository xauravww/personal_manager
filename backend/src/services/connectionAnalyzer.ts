import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calculate cosine similarity between two embedding vectors
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));

    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (magA * magB);
};

/**
 * Analyze a completed module and create automatic connections
 * based on content similarity with other modules
 */
export const analyzeModuleConnections = async (
    userId: string,
    moduleId: string,
    similarityThreshold: number = 0.75
): Promise<number> => {
    try {
        // Get the completed module with its embedding
        const currentModule = await prisma.learningModule.findUnique({
            where: { id: moduleId },
            select: {
                id: true,
                title: true,
                description: true,
                content: true,
                embedding: true,
                subject_id: true,
                difficulty: true
            }
        });

        if (!currentModule || !currentModule.embedding) {
            console.log('Module not found or has no embedding');
            return 0;
        }

        const currentEmbedding = JSON.parse(currentModule.embedding);

        // Get all other modules from different subjects with embeddings
        const otherModules = await prisma.learningModule.findMany({
            where: {
                subject: { user_id: userId },
                embedding: { not: null },
                id: { not: moduleId },
                subject_id: { not: currentModule.subject_id } // Different subject
            },
            select: {
                id: true,
                title: true,
                description: true,
                embedding: true,
                subject_id: true,
                difficulty: true
            }
        });

        console.log(`Analyzing ${otherModules.length} modules for connections`);

        let connectionsCreated = 0;

        for (const otherModule of otherModules) {
            if (!otherModule.embedding) continue;

            const otherEmbedding = JSON.parse(otherModule.embedding);
            const similarity = cosineSimilarity(currentEmbedding, otherEmbedding);

            if (similarity >= similarityThreshold) {
                // Determine connection type based on difficulty and similarity
                let connectionType = 'related';
                if (similarity > 0.9) {
                    connectionType = 'applied'; // Very similar - likely applied concept
                } else if (otherModule.difficulty && currentModule.difficulty) {
                    // Lower difficulty module might be a prerequisite
                    const diffDiff = getDifficultyValue(currentModule.difficulty) -
                        getDifficultyValue(otherModule.difficulty);
                    if (diffDiff > 0) {
                        connectionType = 'prerequisite';
                    }
                }

                // Check if connection already exists
                const existingConnection = await prisma.knowledgeConnection.findFirst({
                    where: {
                        user_id: userId,
                        source_id: otherModule.id,
                        target_id: currentModule.id,
                        user_deleted: false
                    }
                });

                if (!existingConnection) {
                    // Create connection
                    await prisma.knowledgeConnection.create({
                        data: {
                            user_id: userId,
                            source_id: otherModule.id,
                            source_type: 'module',
                            target_id: currentModule.id,
                            target_type: 'module',
                            type: connectionType,
                            strength: similarity,
                            auto_generated: true,
                            confidence: similarity,
                            reason: `Content similarity: ${Math.round(similarity * 100)}%. Both modules cover related concepts.`
                        }
                    });

                    connectionsCreated++;
                    console.log(`Created ${connectionType} connection: ${otherModule.title} -> ${currentModule.title} (${Math.round(similarity * 100)}%)`);
                }
            }
        }

        return connectionsCreated;
    } catch (error) {
        console.error('Error analyzing module connections:', error);
        return 0;
    }
};

/**
 * Convert difficulty string to numeric value for comparison
 */
const getDifficultyValue = (difficulty: string): number => {
    const difficultyMap: { [key: string]: number } = {
        'beginner': 1,
        'easy': 1,
        'intermediate': 2,
        'medium': 2,
        'advanced': 3,
        'hard': 3,
        'expert': 4
    };
    return difficultyMap[difficulty.toLowerCase()] || 2;
};

/**
 * Analyze and create connections for all user's completed modules
 * Useful for initial setup or re-analysis
 */
export const analyzeAllUserModules = async (userId: string): Promise<number> => {
    const completedModules = await prisma.learningProgress.findMany({
        where: {
            user_id: userId,
            status: 'completed'
        },
        select: {
            module_id: true
        }
    });

    let totalConnections = 0;
    for (const progress of completedModules) {
        const count = await analyzeModuleConnections(userId, progress.module_id);
        totalConnections += count;
    }

    return totalConnections;
};
