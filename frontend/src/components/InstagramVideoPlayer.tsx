import React, { useEffect } from 'react';
import { Loader2, Play, AlertTriangle } from 'lucide-react';

interface Resource {
    id: string;
    title: string;
    type: string;
    url?: string;
    fileUrl?: string;
    metadata?: any;
}

interface InstagramVideoPlayerProps {
    resource: Resource;
    videoUrl: string | null;
    videoLoading: boolean;
    videoError: string | null;
    onLoadVideo: () => void;
}

const InstagramVideoPlayer: React.FC<InstagramVideoPlayerProps> = ({
    resource,
    videoUrl,
    videoLoading,
    videoError,
    onLoadVideo
}) => {
    // Robustly determine the Instagram permalink
    const getInstagramPermalink = () => {
        const isPermalink = (url?: string) => {
            return url && (url.includes('instagram.com/reel/') || url.includes('instagram.com/p/'));
        };

        // 1. Check resource.url
        if (isPermalink(resource.url)) {
            return resource.url;
        }
        // 2. Check metadata.url
        if (isPermalink(resource.metadata?.url)) {
            return resource.metadata.url;
        }
        // 3. Check metadata.video
        if (isPermalink(resource.metadata?.video)) {
            return resource.metadata.video;
        }
        // 4. Check fileUrl
        if (isPermalink(resource.fileUrl)) {
            return resource.fileUrl;
        }
        // 5. Construct from reel_id
        if (resource.metadata?.reel_id) {
            return `https://www.instagram.com/reel/${resource.metadata.reel_id}/`;
        }

        return null;
    };

    const instagramPermalink = getInstagramPermalink();
    const videoSource = resource.url || resource.fileUrl;
    const isInstagram = !!instagramPermalink || videoSource?.includes('instagram.com');

    // Auto-load Instagram videos when component mounts
    useEffect(() => {
        if (isInstagram && !videoUrl && !videoLoading && !videoError) {
            onLoadVideo();
        }
    }, [isInstagram, videoUrl, videoLoading, videoError, onLoadVideo]);

    // Regular video (not Instagram)
    if (!isInstagram && videoSource) {
        return (
            <video
                src={videoSource}
                controls
                className="max-w-full max-h-96 rounded-lg"
            />
        );
    }

    // Instagram video - Loading state
    if (videoLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" strokeWidth={1.5} />
                <p className="text-gray-600">Fetching fresh video URL...</p>
                <p className="text-xs text-gray-500 mt-1">This may take a few seconds</p>
            </div>
        );
    }

    // Instagram video - Error state
    // Instagram video - Error state (Fallback to Embed)
    // Instagram video - Error state (Fallback to Embed)
    if (videoError) {
        // Ensure we have a valid permalink for the embed
        const permalink = instagramPermalink || videoSource;
        const embedUrl = permalink?.endsWith('/')
            ? `${permalink}embed`
            : `${permalink}/embed`;

        return (
            <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                <div className="w-full bg-yellow-50 p-3 flex items-center justify-between border-b border-yellow-100">
                    <div className="flex items-center text-yellow-700 text-sm">
                        <AlertTriangle className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        <span>Direct playback failed, loading embed...</span>
                    </div>
                    <button
                        onClick={onLoadVideo}
                        className="text-xs bg-white border border-yellow-200 px-2 py-1 rounded hover:bg-yellow-50 text-yellow-700 transition-colors"
                    >
                        Retry Direct
                    </button>
                </div>
                <div className="w-full flex justify-center bg-white py-4">
                    <iframe
                        src={embedUrl}
                        className="w-full max-w-[350px] h-[500px] border rounded shadow-sm"
                        frameBorder="0"
                        scrolling="no"
                        allowTransparency={true}
                    ></iframe>
                </div>
            </div>
        );
    }

    // Instagram video - Ready to play
    if (videoUrl) {
        return (
            <div className="space-y-3">
                <video
                    src={videoUrl}
                    controls
                    className="max-w-full max-h-96 rounded-lg"
                />
                <p className="text-xs text-gray-500 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" strokeWidth={1.5} />
                    Fresh CDN URL fetched • Will expire in a few hours
                </p>
                {videoSource && (
                    <a
                        href={videoSource}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
                    >
                        View on Instagram ↗
                    </a>
                )}
            </div>
        );
    }

    // Fallback - No video available
    return (
        <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
            <Play className="w-12 h-12 text-gray-400 mb-3" strokeWidth={1.5} />
            <p className="text-gray-600 mb-4">Video not available</p>
            {isInstagram && (
                <button
                    onClick={onLoadVideo}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Play className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Load Video
                </button>
            )}
        </div>
    );
};

export default InstagramVideoPlayer;
