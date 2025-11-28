import React from 'react';
import { Loader2, Search, Brain, Sparkles } from 'lucide-react';

interface StandardSearchLoadingProps {
    query: string;
}

const StandardSearchLoading: React.FC<StandardSearchLoadingProps> = ({ query }) => {
    return (
        <div className="w-full max-w-2xl bg-void-900/50 border border-starlight-100/10 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="p-4 border-b border-starlight-100/5 flex items-center justify-between bg-void-900/80">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Brain className="w-5 h-5 text-neon-blue animate-pulse" />
                        <div className="absolute inset-0 bg-neon-blue/20 blur-lg rounded-full animate-pulse" />
                    </div>
                    <span className="text-sm font-medium text-starlight-100 tracking-wide">
                        Thinking...
                    </span>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Searching Action */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-starlight-500 uppercase tracking-wider">
                        <Search className="w-3 h-3" />
                        Searching
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-2 px-3 py-2 bg-void-950 rounded-lg border border-neon-blue/30 text-xs text-starlight-100 animate-pulse">
                            <Loader2 className="w-3 h-3 text-neon-blue animate-spin" />
                            <span className="truncate max-w-[300px]">"{query}"</span>
                        </div>
                    </div>
                </div>

                {/* Placeholder for "Reading" to give it that "premium" feel even if static for a moment */}
                <div className="opacity-50">
                    <div className="flex items-center gap-2 text-xs font-bold text-starlight-600 uppercase tracking-wider mb-2">
                        <Sparkles className="w-3 h-3" />
                        Synthesizing
                    </div>
                    <div className="h-2 w-24 bg-starlight-100/10 rounded-full overflow-hidden">
                        <div className="h-full bg-neon-blue/50 w-1/2 animate-progress" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StandardSearchLoading;
