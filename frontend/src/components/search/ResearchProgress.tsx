import React from 'react';
import { Loader2, Globe, Search, ChevronRight, Brain } from 'lucide-react';

interface ResearchProgressProps {
    currentStep: string;
    actionLog: string[];
    currentThought?: any;
    currentQuery?: string;
    searchResults?: Array<{ title: string; url: string }>;
}

const ResearchProgress: React.FC<ResearchProgressProps> = ({
    currentStep,
    actionLog,
    currentThought,
    currentQuery,
    searchResults
}) => {
    // Parse actions for better display
    const searchActions = actionLog.filter(l => l.includes('search:'));
    const readActions = actionLog.filter(l => l.includes('read_url:'));

    // Get current active action details
    const isSearching = currentThought?.action === 'search';
    const isReading = currentThought?.action === 'read_url';

    return (
        <div className="w-full max-w-2xl bg-void-900/50 border border-starlight-100/10 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="p-4 border-b border-starlight-100/5 flex items-center justify-between bg-void-900/80">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Brain className="w-5 h-5 text-neon-purple animate-pulse" />
                        <div className="absolute inset-0 bg-neon-purple/20 blur-lg rounded-full animate-pulse" />
                    </div>
                    <span className="text-sm font-medium text-starlight-100 tracking-wide">
                        {currentStep}
                    </span>
                </div>
                <Loader2 className="w-4 h-4 text-starlight-500 animate-spin" />
            </div>

            <div className="p-4 space-y-6">
                {/* Show current search query (Perplexity style) */}
                {currentQuery && (
                    <div className="p-3 bg-void-950/50 border border-starlight-100/5 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-starlight-400 font-mono">
                            <Search className="w-3 h-3 text-neon-blue" />
                            <span>{currentQuery}</span>
                        </div>
                    </div>
                )}

                {/* Search Results Preview - Perplexity style with domain tags */}
                {searchResults && searchResults.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-starlight-500">
                            READING
                            <div className="flex items-center justify-center w-5 h-5 rounded bg-starlight-100/10 text-starlight-100 text-[10px]">
                                {searchResults.length}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {searchResults.slice(0, 8).map((result, idx) => {
                                let hostname = result.title;
                                try {
                                    const url = new URL(result.url);
                                    hostname = url.hostname.replace('www.', '').split('.')[0]; // Get just the domain name (e.g., "playstation" from "playstation.com")
                                } catch (e) {
                                    // Use title if URL parsing fails, take first word
                                    hostname = result.title.toLowerCase().split(' ')[0].substring(0, 15);
                                }

                                return (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-void-950/80 rounded-full border border-starlight-100/20 text-xs text-starlight-200 hover:border-starlight-100/40 transition-colors"
                                        title={result.url}
                                    >
                                        <div className="w-1 h-1 rounded-full bg-starlight-400" />
                                        <span className="font-mono">{hostname}</span>
                                    </div>
                                );
                            })}
                            {searchResults.length > 8 && (
                                <div className="flex items-center px-2.5 py-1 text-xs text-starlight-500 font-mono">
                                    + {searchResults.length - 8} more
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Fallback to old UI if no new data */}
                {!currentQuery && !searchResults && (
                    <>
                        {/* Searching Section */}
                        {(searchActions.length > 0 || isSearching) && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-starlight-500 uppercase tracking-wider">
                                    <Search className="w-3 h-3" />
                                    Searching
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {searchActions.map((action, i) => (
                                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-void-950 rounded-lg border border-starlight-100/10 text-xs text-starlight-300">
                                            <Search className="w-3 h-3 text-neon-blue" />
                                            <span className="truncate max-w-[200px]">{action.replace('search: ', '')}</span>
                                        </div>
                                    ))}
                                    {isSearching && currentThought?.actionDetails && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-void-950 rounded-lg border border-neon-blue/30 text-xs text-starlight-100 animate-pulse">
                                            <Loader2 className="w-3 h-3 text-neon-blue animate-spin" />
                                            <span className="truncate max-w-[200px]">{currentThought.actionDetails}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Reading Section */}
                        {(readActions.length > 0 || isReading) && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-starlight-500 uppercase tracking-wider">
                                    <div className="flex items-center justify-center w-4 h-4 rounded bg-starlight-100/10 text-starlight-100 text-[10px]">
                                        {readActions.length + (isReading ? 1 : 0)}
                                    </div>
                                    Reading Sources
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {readActions.map((action, i) => {
                                        const url = action.replace('read_url: ', '');
                                        let hostname = url;
                                        try { hostname = new URL(url).hostname.replace('www.', ''); } catch (e) { }

                                        return (
                                            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-void-950 rounded-lg border border-starlight-100/10 text-xs text-starlight-300">
                                                <Globe className="w-3 h-3 text-neon-green" />
                                                <span className="truncate max-w-[150px]">{hostname}</span>
                                            </div>
                                        );
                                    })}
                                    {isReading && currentThought?.actionDetails && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-void-950 rounded-lg border border-neon-green/30 text-xs text-starlight-100 animate-pulse">
                                            <Loader2 className="w-3 h-3 text-neon-green animate-spin" />
                                            <span className="truncate max-w-[150px]">
                                                {(() => {
                                                    try { return new URL(currentThought.actionDetails).hostname.replace('www.', ''); }
                                                    catch (e) { return 'source'; }
                                                })()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Thinking/Analyzing Log */}
                <div className="pt-2 border-t border-starlight-100/5">
                    <div className="flex items-center gap-2 text-xs text-starlight-600 font-mono">
                        <ChevronRight className="w-3 h-3" />
                        <span className="truncate">
                            {currentThought?.thought || "Synthesizing information..."}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResearchProgress;
