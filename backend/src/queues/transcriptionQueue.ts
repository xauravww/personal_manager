import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Create Redis connection
const connection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null
});

// Create transcription queue
export const transcriptionQueue = new Queue('instagram-transcription', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: {
            count: 100, // Keep last 100 completed jobs
            age: 24 * 3600 // Keep for 24 hours
        },
        removeOnFail: {
            count: 50 // Keep last 50 failed jobs
        }
    }
});

// Export connection for workers
export { connection };
