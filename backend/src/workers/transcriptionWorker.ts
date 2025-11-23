import { Worker, Job } from 'bullmq';
import { connection } from '../queues/transcriptionQueue';
import transcriptionService from '../services/transcriptionService';
import { PrismaClient } from '@prisma/client';
import { aiService } from '../services/aiService';
import embeddingService from '../services/embeddingService';

const prisma = new PrismaClient();

interface TranscriptionJobData {
    videoUrl: string;
    metadata: {
        title: string;
        description: string;
        thumbnail: string;
        video: string;
        url: string;
        reel_id: string;
    };
    userId: string;
}

// Create worker for transcription jobs
export const transcriptionWorker = new Worker<TranscriptionJobData>(
    'instagram-transcription',
    async (job: Job<TranscriptionJobData>) => {
        const { videoUrl, metadata, userId } = job.data;

        console.log(`\n🎬 Processing transcription job: ${job.id}`);
        console.log(`   Reel: ${metadata.title?.substring(0, 50)}...`);

        try {
            // Step 1: Transcribe video
            let contentForAI = `${metadata.title}\n${metadata.description}`;
            let transcript = '';
            let detectedLanguage = '';

            try {
                console.log('🎙️  Starting transcription...');
                const language = (job.data as any).language || 'hi'; // Extract language from job data
                const result = await transcriptionService.transcribeVideo(videoUrl, language);
                transcript = result.transcript;
                detectedLanguage = result.language;

                if (transcript) {
                    console.log('✅ Transcript (romanized):', transcript.substring(0, 100) + '...');
                    console.log(`   Detected language: ${detectedLanguage}`);
                    contentForAI += `\n\nTranscript (${detectedLanguage}): ${transcript}`;
                }
            } catch (transcriptError) {
                console.warn('⚠️  Transcription failed (continuing without):', transcriptError);
            }

            // Step 2: AI analysis with transcript
            const aiResult = await aiService.analyzeAndCategorizeContent(contentForAI);

            // Step 3: Generate embedding
            const embedding = await embeddingService.generateEmbedding(
                aiResult.summary + (transcript ? `\n${transcript}` : '')
            );

            // Step 4: Create/upsert tags
            const tagRecords = await Promise.all(
                aiResult.tags.map(async (tagName: string) => {
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

            // Determine final title:
            // 1. If metadata.title is specific (user provided text), keep it.
            // 2. If metadata.title is generic ("DM Video...", "Instagram Reel"), use AI title.
            // 3. Fallback to metadata.title or 'Instagram Post'
            const isGenericTitle = !metadata.title ||
                metadata.title.startsWith('DM Video') ||
                metadata.title === 'Instagram Reel';

            console.log('🤔 Title Decision:', {
                original: metadata.title,
                isGeneric: isGenericTitle,
                aiTitle: aiResult.title,
                final: isGenericTitle ? (aiResult.title || metadata.title) : metadata.title
            });

            const finalTitle = isGenericTitle ? (aiResult.title || metadata.title) : metadata.title;

            // Step 5: Create resource
            const resource = await prisma.resource.create({
                data: {
                    user_id: userId,
                    title: finalTitle || 'Instagram Post',
                    description: metadata.description || aiResult.description, // Use user's title/caption as description, fallback to AI
                    type: 'video', // Instagram webhook content is always video (reels/DM videos)
                    content: contentForAI,
                    url: metadata.url,
                    metadata: {
                        ...aiResult,
                        source: 'instagram_webhook',
                        thumbnail: metadata.thumbnail,
                        video: metadata.video,
                        reel_id: metadata.reel_id,
                        original_caption: (metadata as any).original_caption || null, // Store reel's original caption
                        original_transcript: transcript || null, // Raw Whisper output
                        transcript: transcript || null, // Could be AI-processed later
                        transcript_language: detectedLanguage || null,
                        has_transcript: !!transcript
                    },
                    embedding: JSON.stringify(embedding),
                    tags: {
                        connect: tagRecords.map(tag => ({ id: tag.id }))
                    }
                },
                include: {
                    tags: true
                }
            });

            console.log('✅ Resource created successfully:', resource.id);
            return { resourceId: resource.id, hasTranscript: !!transcript };

        } catch (error) {
            console.error('❌ Job processing failed:', error);
            throw error; // Will trigger retry
        }
    },
    {
        connection,
        concurrency: 2, // Process 2 jobs simultaneously
        limiter: {
            max: 10, // Max 10 jobs
            duration: 60000 // per minute
        }
    }
);

// Worker event listeners
transcriptionWorker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);
});

transcriptionWorker.on('failed', (job, error) => {
    console.error(`❌ Job ${job?.id} failed:`, error.message);
});

transcriptionWorker.on('error', (error) => {
    console.error('Worker error:', error);
});

console.log('👷 Transcription worker started');

export default transcriptionWorker;
