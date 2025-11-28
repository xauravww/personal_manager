import React from 'react';
import { FileText, Globe, ExternalLink, ChevronRight, BookOpen } from 'lucide-react';

interface Resource {
    title: string;
    url: string;
    type?: 'web' | 'local' | 'academic';
    snippet?: string;
}

interface ResourceCarouselProps {
    resources: Resource[];
}

const ResourceCarousel: React.FC<ResourceCarouselProps> = ({ resources }) => {
    if (!resources || resources.length === 0) return null;

    return (
        <div className="w-full my-4">
            <div className="flex items-center gap-2 mb-3 px-1">
                <BookOpen className="w-4 h-4 text-neon-purple" />
                <span className="text-xs font-bold text-starlight-400 uppercase tracking-wider">
                    Sources ({resources.length})
                </span>
            </div>

            <div className="flex overflow-x-auto gap-3 pb-4 -mx-4 px-4 scrollbar-hide snap-x">
                {resources.map((resource, idx) => (
                    <a
                        key={idx}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 w-60 p-3 rounded-xl bg-void-950 border border-starlight-100/10 hover:border-neon-blue/30 hover:bg-void-900 transition-all group snap-start flex flex-col justify-between h-32"
                    >
                        <div>
                            <div className="flex items-start justify-between mb-2">
                                <div className={`p-1.5 rounded-lg ${resource.type === 'web' ? 'bg-neon-blue/10 text-neon-blue' :
                                        resource.type === 'academic' ? 'bg-neon-purple/10 text-neon-purple' :
                                            'bg-neon-green/10 text-neon-green'
                                    }`}>
                                    {resource.type === 'web' ? <Globe className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                </div>
                                <ExternalLink className="w-3 h-3 text-starlight-600 group-hover:text-starlight-300 transition-colors" />
                            </div>

                            <h4 className="text-xs font-medium text-starlight-200 line-clamp-2 leading-relaxed group-hover:text-neon-blue transition-colors">
                                {resource.title || 'Untitled Resource'}
                            </h4>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-starlight-500 font-mono mt-2">
                            <span className="truncate max-w-[120px]">
                                {(() => {
                                    try {
                                        return new URL(resource.url).hostname.replace('www.', '');
                                    } catch {
                                        return 'Local Resource';
                                    }
                                })()}
                            </span>
                        </div>
                    </a>
                ))}

                {/* View All Card */}
                {resources.length > 4 && (
                    <button className="flex-shrink-0 w-24 p-3 rounded-xl bg-void-950/50 border border-starlight-100/5 hover:border-starlight-100/20 hover:bg-void-900 transition-all group snap-start flex flex-col items-center justify-center h-32 gap-2">
                        <div className="w-8 h-8 rounded-full bg-starlight-100/5 flex items-center justify-center group-hover:bg-starlight-100/10 transition-colors">
                            <ChevronRight className="w-4 h-4 text-starlight-400" />
                        </div>
                        <span className="text-[10px] text-starlight-500 font-medium">View All</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default ResourceCarousel;
