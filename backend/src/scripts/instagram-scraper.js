#!/usr/bin/env node

/**
 * Standalone Instagram Metadata Scraper
 * Extracts metadata from Instagram posts using web scraping
 *
 * Usage:
 * node instagram-scraper.js <instagram-url>
 *
 * Example:
 * node instagram-scraper.js https://www.instagram.com/p/ABC123/
 */

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { chromium } = require('patchright');
const path = require('path');

class StandaloneInstagramMetadataExtractor {
    constructor() {
        this.USER_DATA_DIR = path.join(__dirname, 'patchright_profile_metadata');
        this.browser = null;
    }

    async initBrowser() {
        if (!this.browser) {
            console.error('🚀 Initializing browser...');
            this.browser = await chromium.launchPersistentContext(this.USER_DATA_DIR, {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            console.error('✅ Browser initialized');
        }
        return this.browser;
    }

    async closeBrowser() {
        if (this.browser) {
            console.error('🛑 Closing browser...');
            await this.browser.close();
            this.browser = null;
            console.error('✅ Browser closed');
        }
    }

    extractMetadataFromHtml(html) {
        const $ = cheerio.load(html);

        // Check if this post exists
        const isNotFound = $('main > div > div > span').length > 0;
        if (isNotFound) {
            throw new Error("This post is private or does not exist");
        }

        // Check if instagram redirected the page to a login page
        const isLoginPage = $('input[name="username"]').length > 0;
        if (isLoginPage) {
            throw new Error("Something went wrong, please try again");
        }

        let metadata = {};

        try {
            // Extract from meta tags (most reliable)
            metadata.ogTitle = $('meta[property="og:title"]').attr('content') || '';
            metadata.ogDescription = $('meta[property="og:description"]').attr('content') || '';
            metadata.ogImage = $('meta[property="og:image"]').attr('content') || '';
            metadata.ogVideo = $('meta[property="og:video"]').attr('content') || '';
            metadata.ogUrl = $('meta[property="og:url"]').attr('content') || '';

            // Extract additional meta tags
            metadata.twitterTitle = $('meta[name="twitter:title"]').attr('content') || '';
            metadata.twitterDescription = $('meta[name="twitter:description"]').attr('content') || '';
            metadata.twitterImage = $('meta[name="twitter:image"]').attr('content') || '';

            // Extract video URL and poster
            metadata.videoUrl = $("video").attr("src") || '';
            metadata.posterImage = $("video").attr("poster") || '';

            // Extract hashtags from caption or title
            const textToSearch = metadata.ogTitle || metadata.ogDescription || '';
            if (textToSearch) {
                const hashtagRegex = /#[\w\u00c0-\u024f\u1e00-\u1eff]+/g;
                metadata.hashtags = textToSearch.match(hashtagRegex) || [];
            }

            // Extract mentions
            if (textToSearch) {
                const mentionRegex = /@[\w.]+/g;
                metadata.mentions = textToSearch.match(mentionRegex) || [];
            }

            // Parse title to extract username if not found elsewhere
            if (!metadata.username && metadata.ogTitle) {
                const titleMatch = metadata.ogTitle.match(/^(.+?)\s+on\s+Instagram:/);
                if (titleMatch) {
                    metadata.username = titleMatch[1].trim();
                }
            }

            // Clean up and format the metadata
            metadata.extractedAt = new Date().toISOString();
            metadata.hasVideo = !!metadata.videoUrl;
            metadata.hasImage = !!metadata.ogImage;

        } catch (error) {
            console.error('Error extracting metadata:', error);
            metadata.extractedAt = new Date().toISOString();
            metadata.error = error.message;
        }

        return metadata;
    }

    getPostId(postUrl) {
        const postRegex = /^https:\/\/(?:www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)\/?/;
        const reelRegex = /^https:\/\/(?:www\.)?instagram\.com\/reels?\/([a-zA-Z0-9_-]+)\/?/;

        if (!postUrl) {
            throw new Error("Post URL is required");
        }

        const postCheck = postUrl.match(postRegex);
        if (postCheck) {
            return postCheck[1];
        }

        const reelCheck = postUrl.match(reelRegex);
        if (reelCheck) {
            return reelCheck[1];
        }

        throw new Error("Invalid URL, post ID not found");
    }

    // Helper method to extract caption from Instagram title
    extractCaptionFromTitle(title) {
        if (!title) return '';

        // Instagram titles are in format: "Username on Instagram: "Caption text""
        const match = title.match(/on Instagram:\s*"(.+)"$/);
        if (match) {
            return match[1];
        }

        return title;
    }

    async extractMetadata(postUrl) {
        try {
            const postId = this.getPostId(postUrl);

            console.error(`📊 Extracting metadata for post: ${postId}`);
            console.error(`🌐 URL: ${postUrl}`);

            // Fallback to web scraping
            return await this.extractMetadataViaScraping(postUrl);

        } catch (error) {
            console.error('Error extracting Instagram metadata:', error);
            throw error;
        }
    }

    async extractMetadataViaScraping(postUrl) {
        try {
            const postId = this.getPostId(postUrl);

            console.error(`🌐 Extracting metadata via web scraping for post: ${postId}`);

            const browser = await this.initBrowser();
            const page = await browser.newPage();

            try {
                const instagramUrl = `https://www.instagram.com/p/${postId}/`;
                console.error(`📍 Navigating to: ${instagramUrl}`);
                await page.goto(instagramUrl, { waitUntil: 'networkidle0', timeout: 30000 });

                const html = await page.content();
                const metadata = this.extractMetadataFromHtml(html);

                console.error(`✅ Successfully extracted metadata via scraping`);

                return {
                    postId,
                    url: postUrl,
                    ...metadata,
                    // Map the fields to match our database schema
                    caption: this.extractCaptionFromTitle(metadata.ogTitle),
                    username: metadata.username,
                    mediaUrl: metadata.videoUrl || metadata.ogVideo,
                    thumbnailUrl: metadata.ogImage,
                    likesCount: 0, // Not available from meta tags
                    commentsCount: 0, // Not available from meta tags
                    viewCount: 0, // Not available from meta tags
                };

            } finally {
                await page.close();
            }

        } catch (error) {
            console.error('Error extracting Instagram metadata via scraping:', error);
            throw error;
        }
    }
}

// Main execution function
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('❌ Error: Please provide an Instagram post URL');
        process.exit(1);
    }

    const postUrl = args[0];
    const extractor = new StandaloneInstagramMetadataExtractor();

    try {
        const metadata = await extractor.extractMetadata(postUrl);

        // Log details to stderr so it doesn't break JSON output
        console.error('✅ Metadata extracted successfully!');
        console.error('='.repeat(50));
        console.error('RESULTS:');
        console.error('='.repeat(50));
        console.error(`Post ID: ${metadata.postId}`);
        console.error(`Username: ${metadata.username || 'N/A'}`);
        console.error(`Caption: ${metadata.caption || 'N/A'}`);
        console.error(`Has Video: ${metadata.hasVideo ? 'Yes' : 'No'}`);
        console.error(`Has Image: ${metadata.hasImage ? 'Yes' : 'No'}`);
        console.error(`Media URL: ${metadata.mediaUrl || 'N/A'}`);
        console.error(`Thumbnail URL: ${metadata.thumbnailUrl || 'N/A'}`);
        console.error('='.repeat(50));

        // Output ONLY JSON to stdout so the caller can parse it
        console.log(JSON.stringify(metadata));

    } catch (error) {
        console.error('❌ Extraction failed:', error.message);
        process.exit(1);
    } finally {
        await extractor.closeBrowser();
    }
}

// Run the script if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}

module.exports = StandaloneInstagramMetadataExtractor;
