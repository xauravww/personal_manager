import * as youtubeSearch from 'youtube-search-api';
import { getSubtitles } from 'youtube-caption-extractor';
import prisma from '../config/database';

interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    channelTitle: string;
    publishedAt: string;
    duration?: string;
    viewCount?: string;
    url: string;
}

interface YouTubeSearchResult {
    videos: YouTubeVideo[];
    fromCache: boolean;
}

interface VideoTranscript {
    text: string;
    start: number;
    dur: number;
}

// In-memory cache for YouTube search results
const searchCache = new Map<string, { videos: YouTubeVideo[]; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

// In-memory cache for video transcripts
const transcriptCache = new Map<string, { transcript: string; timestamp: number }>();
const TRANSCRIPT_CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
        /^([a-zA-Z0-9_-]{11})$/  // Direct video ID
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
}

/**
 * Check if a URL is a YouTube video
 */
export function isYouTubeUrl(url: string): boolean {
    return /(?:youtube\.com|youtu\.be)/.test(url);
}

/**
 * Search YouTube for videos related to a query
 */
export async function searchYouTubeVideos(
    query: string,
    maxResults: number = 10
): Promise<YouTubeSearchResult> {
    const cacheKey = `${query}-${maxResults}`;

    // Check cache first
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('Returning cached YouTube search results');
        return { videos: cached.videos, fromCache: true };
    }

    try {
        console.log(`🔍 Searching YouTube for: "${query}"`);

        // Use youtube-search-api to search
        const result = await youtubeSearch.GetListByKeyword(query, false, maxResults);

        if (!result || !result.items) {
            console.warn('No YouTube results found');
            return { videos: [], fromCache: false };
        }

        const videos: YouTubeVideo[] = result.items
            .filter((item: any) => item.type === 'video' && item.id)
            .map((item: any) => ({
                id: item.id,
                title: item.title || 'Untitled Video',
                description: item.description || '',
                thumbnail: item.thumbnail?.thumbnails?.[0]?.url || '',
                channelTitle: item.channelTitle || 'Unknown Channel',
                publishedAt: item.publishedAt || '',
                duration: item.length?.simpleText || '',
                viewCount: item.viewCount || '',
                url: `https://www.youtube.com/watch?v=${item.id}`
            }));

        // Cache the results
        searchCache.set(cacheKey, { videos, timestamp: Date.now() });

        console.log(`✅ Found ${videos.length} YouTube videos`);
        return { videos, fromCache: false };
    } catch (error) {
        console.error('Error searching YouTube:', error);
        return { videos: [], fromCache: false };
    }
}

/**
 * Extract video transcript/captions
 */
export async function extractVideoTranscript(videoId: string): Promise<string | null> {
    // Check cache first
    const cached = transcriptCache.get(videoId);
    if (cached && Date.now() - cached.timestamp < TRANSCRIPT_CACHE_DURATION) {
        console.log('Returning cached transcript');
        return cached.transcript;
    }

    try {
        console.log(`📝 Extracting transcript for video: ${videoId}`);

        // Extract captions using youtube-caption-extractor
        const rawSubtitles = await getSubtitles({ videoID: videoId, lang: 'en' });

        if (!rawSubtitles || rawSubtitles.length === 0) {
            console.warn('No captions available for this video');
            return null;
        }

        // Transform subtitles to match our VideoTranscript interface
        const subtitles: VideoTranscript[] = rawSubtitles.map(sub => ({
            text: sub.text,
            start: typeof sub.start === 'string' ? parseFloat(sub.start) : sub.start,
            dur: typeof sub.dur === 'string' ? parseFloat(sub.dur) : sub.dur
        }));

        // Combine all subtitle text
        const transcript = subtitles.map((sub: VideoTranscript) => sub.text).join(' ');

        // Cache the transcript
        transcriptCache.set(videoId, { transcript, timestamp: Date.now() });

        console.log(`✅ Extracted transcript (${transcript.length} characters)`);
        return transcript;
    } catch (error) {
        console.error('Error extracting transcript:', error);
        return null;
    }
}

/**
 * Create a Resource from YouTube video data
 */
export async function createResourceFromVideo(
    videoData: YouTubeVideo,
    userId: string,
    includeTranscript: boolean = true
): Promise<any> {
    try {
        let transcript: string | null = null;

        if (includeTranscript) {
            transcript = await extractVideoTranscript(videoData.id);
        }

        const metadata = {
            videoId: videoData.id,
            channelTitle: videoData.channelTitle,
            publishedAt: videoData.publishedAt,
            duration: videoData.duration,
            viewCount: videoData.viewCount,
            thumbnail: videoData.thumbnail
        };

        const resource = await prisma.resource.create({
            data: {
                user_id: userId,
                title: videoData.title,
                description: videoData.description,
                url: videoData.url,
                type: 'video',
                content: transcript || videoData.description,
                metadata: metadata,
                // Embedding will be generated elsewhere
            }
        });

        console.log(`✅ Created resource from YouTube video: ${videoData.title}`);
        return resource;
    } catch (error) {
        console.error('Error creating resource from video:', error);
        throw error;
    }
}

/**
 * Determine if a query should trigger YouTube search
 */
export function shouldIncludeYouTubeResults(query: string): boolean {
    const educationalKeywords = [
        'tutorial', 'learn', 'how to', 'course', 'lesson', 'guide',
        'introduction', 'beginner', 'advanced', 'programming', 'coding',
        'development', 'design', 'lecture', 'explain', 'teach', 'study',
        'education', 'training', 'workshop', 'master', 'fundamentals'
    ];

    const queryLower = query.toLowerCase();
    return educationalKeywords.some(keyword => queryLower.includes(keyword));
}

/**
 * Clear old cache entries
 */
export function clearExpiredCache(): void {
    const now = Date.now();

    // Clear search cache
    for (const [key, value] of searchCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            searchCache.delete(key);
        }
    }

    // Clear transcript cache
    for (const [key, value] of transcriptCache.entries()) {
        if (now - value.timestamp > TRANSCRIPT_CACHE_DURATION) {
            transcriptCache.delete(key);
        }
    }
}

// Clear expired cache every 10 minutes
setInterval(clearExpiredCache, 1000 * 60 * 10);

export default {
    searchYouTubeVideos,
    extractVideoTranscript,
    extractVideoId,
    isYouTubeUrl,
    createResourceFromVideo,
    shouldIncludeYouTubeResults,
    clearExpiredCache
};
