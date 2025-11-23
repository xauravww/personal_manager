import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Instagram Service
 * Handles fetching fresh Instagram content and CDN URLs
 */
class InstagramService {
    /**
     * Fetch fresh Instagram reel data including CDN URL
     * The CDN URLs expire, so this allows us to get a fresh one when needed
     */
    /**
     * Fetch fresh Instagram reel data including CDN URL
     * Uses yt-dlp for robust extraction
     */
    async fetchInstagramReelData(reelUrl: string): Promise<{
        videoUrl: string;
        thumbnail: string;
        title: string;
        description: string;
    }> {
        console.log('📱 Fetching Instagram reel data:', reelUrl);

        try {
            // Try yt-dlp first (most robust)
            return await this.fetchWithYtDlp(reelUrl);
        } catch (ytError: any) {
            console.warn('⚠️  yt-dlp failed, trying simple scraping:', ytError.message);

            try {
                // Fallback to simple scraping
                return await this.scrapeInstagramPage(reelUrl);
            } catch (scrapeError: any) {
                console.warn('⚠️  Simple scraping failed, trying Patchright browser:', scrapeError.message);

                // Final fallback: Patchright browser script
                return await this.fetchWithPatchright(reelUrl);
            }
        }
    }

    /**
     * Fetch video data using Patchright browser script (Node.js)
     */
    private async fetchWithPatchright(url: string): Promise<any> {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const path = require('path');
        const execAsync = promisify(exec);

        const scriptPath = path.join(__dirname, '../scripts/instagram-scraper.js');
        const command = `node "${scriptPath}" "${url}"`;

        try {
            console.log('🚀 Launching Patchright browser scraper...');
            const { stdout } = await execAsync(command);

            // The script outputs JSON to stdout
            const data = JSON.parse(stdout);

            console.log('📊 Patchright Output:', JSON.stringify(data, null, 2));

            if (!data.mediaUrl) {
                throw new Error('No video URL found in Patchright output');
            }

            return {
                videoUrl: data.mediaUrl,
                thumbnail: data.thumbnailUrl || '',
                title: data.caption || 'Instagram Reel',
                description: data.caption || ''
            };
        } catch (error: any) {
            throw new Error(`Patchright scraper failed: ${error.message}`);
        }
    }

    /**
     * Fetch video data using yt-dlp (Python)
     */
    private async fetchWithYtDlp(url: string): Promise<any> {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        // -J: Dump JSON data
        // --flat-playlist: Don't download playlist videos
        // --no-warnings: Suppress warnings
        const command = `yt-dlp -J --flat-playlist --no-warnings "${url}"`;

        try {
            const { stdout } = await execAsync(command);
            const data = JSON.parse(stdout);

            console.log('📊 yt-dlp Output:', JSON.stringify({
                title: data.title,
                url: data.url,
                formats_count: data.formats?.length || 0,
                thumbnail: data.thumbnail
            }, null, 2));

            if (!data.url && !data.formats) {
                throw new Error('No video URL found in yt-dlp output');
            }

            // Find best video URL
            let videoUrl = data.url;
            if (!videoUrl && data.formats) {
                // Get best mp4 format
                const bestFormat = data.formats
                    .filter((f: any) => f.ext === 'mp4' && f.vcodec !== 'none')
                    .sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0];

                if (bestFormat) {
                    videoUrl = bestFormat.url;
                }
            }

            if (!videoUrl) {
                throw new Error('Could not extract video URL from yt-dlp data');
            }

            return {
                videoUrl,
                thumbnail: data.thumbnail || '',
                title: data.title || 'Instagram Reel',
                description: data.description || data.title || ''
            };
        } catch (error: any) {
            throw new Error(`yt-dlp failed: ${error.message}`);
        }
    }

    /**
     * Fallback: Scrape Instagram page directly
     */
    private async scrapeInstagramPage(reelUrl: string): Promise<any> {
        try {
            const response = await axios.get(reelUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Cache-Control': 'max-age=0'
                }
            });

            const html = response.data;
            const $ = cheerio.load(html);

            const ogVideo = $('meta[property="og:video"]').attr('content') ||
                $('meta[property="og:video:secure_url"]').attr('content') || '';
            const ogImage = $('meta[property="og:image"]').attr('content') || '';
            const ogTitle = $('meta[property="og:title"]').attr('content') || '';
            const ogDescription = $('meta[property="og:description"]').attr('content') || '';

            if (!ogVideo) {
                throw new Error('Could not extract video URL from Instagram page');
            }

            return {
                videoUrl: ogVideo,
                thumbnail: ogImage,
                title: ogTitle,
                description: ogDescription
            };
        } catch (error: any) {
            throw new Error(`Scraping failed: ${error.message}`);
        }
    }

    /**
     * Extract reel ID from various Instagram URL formats
     */
    extractReelId(url: string): string | null {
        // Match patterns like:
        // https://www.instagram.com/reel/ABC123/
        // https://instagram.com/reel/ABC123
        // https://www.instagram.com/p/ABC123/
        const match = url.match(/instagram\.com\/(?:reel|p)\/([^/?]+)/);
        return match ? match[1] : null;
    }

    /**
     * Construct Instagram reel URL from reel ID
     */
    constructReelUrl(reelId: string): string {
        return `https://www.instagram.com/reel/${reelId}/`;
    }
}

// Export singleton instance
export default new InstagramService();
