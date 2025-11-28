import React from 'react';
import { Search, FolderOpen, Database, ArrowRight, X, Check } from 'lucide-react';
import Card from '../ui/Card';

const ProblemSolution: React.FC = () => {
    return (
        <section className="py-32 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-24">
                    <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
                        How We Solve Your Biggest<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">Knowledge Problems</span>
                    </h2>
                    <p className="text-lg text-starlight-400 max-w-2xl mx-auto">
                        Stop wasting time searching and start actually using your knowledge.
                    </p>
                </div>

                {/* Problem 1: The Search Problem */}
                <div className="grid md:grid-cols-2 gap-12 items-center mb-32">
                    <div className="space-y-8 order-2 md:order-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider">
                            The "I Know I Saved This" Problem
                        </div>
                        <h3 className="text-3xl font-display font-bold">
                            Lost in the <span className="text-red-400">Digital Void</span>
                        </h3>
                        <p className="text-starlight-400 leading-relaxed text-lg">
                            You remember seeing that perfect article 3 months ago, but now it's lost in your browser bookmarks, email archives, or that "misc" folder on your desktop. With traditional tools, finding it means hours of frustrated searching.
                        </p>

                        <div className="p-6 rounded-2xl bg-void-800/50 border border-starlight-100/5">
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-neon-green/20 flex items-center justify-center flex-shrink-0 mt-1">
                                    <Check className="w-4 h-4 text-neon-green" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-starlight-100 mb-1">Our Solution</h4>
                                    <p className="text-starlight-400">
                                        Ask "that productivity article about time blocking" and get instant results. Our AI understands context, not just keywords.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative order-1 md:order-2 perspective-1000">
                        <div className="absolute inset-0 bg-red-500/5 blur-[100px] rounded-full" />

                        {/* Chaos Visual */}
                        <div className="relative h-[400px] w-full">
                            {/* Floating "Lost" Items */}
                            {[
                                { icon: FolderOpen, label: "Misc Folder", x: "10%", y: "20%", rot: "-12deg" },
                                { icon: Database, label: "Old Backup", x: "70%", y: "10%", rot: "15deg" },
                                { icon: Search, label: "Where is it?", x: "40%", y: "50%", rot: "-5deg" },
                                { icon: X, label: "404 Not Found", x: "20%", y: "70%", rot: "8deg" },
                                { icon: FolderOpen, label: "New Folder (2)", x: "80%", y: "60%", rot: "-10deg" },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="absolute p-4 rounded-xl bg-void-800/80 backdrop-blur-sm border border-red-500/20 shadow-lg flex items-center gap-3 animate-float"
                                    style={{
                                        left: item.x,
                                        top: item.y,
                                        transform: `rotate(${item.rot})`,
                                        animationDelay: `${i * 0.5}s`
                                    }}
                                >
                                    <item.icon className="w-5 h-5 text-red-400" />
                                    <span className="text-sm font-mono text-red-200/70">{item.label}</span>
                                </div>
                            ))}

                            {/* Connection Lines (SVG) */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                                <path d="M100,100 Q200,200 300,100" fill="none" stroke="#F87171" strokeWidth="1" strokeDasharray="4 4" />
                                <path d="M50,300 Q150,150 250,300" fill="none" stroke="#F87171" strokeWidth="1" strokeDasharray="4 4" />
                                <path d="M300,50 Q350,250 400,150" fill="none" stroke="#F87171" strokeWidth="1" strokeDasharray="4 4" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Problem 2: The Scattering Problem */}
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="relative perspective-1000">
                        <div className="absolute inset-0 bg-neon-blue/5 blur-[100px] rounded-full" />

                        {/* Order Visual */}
                        <div className="relative">
                            <Card glass className="p-8 border-neon-blue/20 relative z-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-neon-blue/20 flex items-center justify-center text-neon-blue">
                                            <Database className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-starlight-100">Unified Knowledge Base</h4>
                                            <p className="text-xs text-starlight-500">All sources connected</p>
                                        </div>
                                    </div>
                                    <div className="px-2 py-1 rounded bg-neon-green/10 text-neon-green text-xs font-bold">ACTIVE</div>
                                </div>

                                <div className="space-y-3">
                                    {['Notion', 'Google Drive', 'Slack', 'Browser Bookmarks'].map((app, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-void-900/50 border border-starlight-100/5 group hover:border-neon-blue/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-neon-blue" />
                                                <span className="text-sm text-starlight-300">{app}</span>
                                            </div>
                                            <Check className="w-4 h-4 text-neon-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Background Cards for Depth */}
                            <div className="absolute top-4 left-4 right-4 bottom-4 bg-void-800/50 rounded-2xl border border-starlight-100/5 -z-10 transform rotate-3" />
                            <div className="absolute top-8 left-8 right-8 bottom-0 bg-void-800/30 rounded-2xl border border-starlight-100/5 -z-20 transform -rotate-2" />
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider">
                            The "Too Many Apps" Chaos
                        </div>
                        <h3 className="text-3xl font-display font-bold">
                            Knowledge <span className="text-orange-400">Scattered Everywhere</span>
                        </h3>
                        <p className="text-starlight-400 leading-relaxed text-lg">
                            Your knowledge is scattered across Evernote, Notion, Google Keep, browser bookmarks, voice memos, and who-knows-what-else. Switching between apps wastes time and breaks your flow.
                        </p>

                        <div className="p-6 rounded-2xl bg-void-800/50 border border-starlight-100/5">
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-neon-blue/20 flex items-center justify-center flex-shrink-0 mt-1">
                                    <Check className="w-4 h-4 text-neon-blue" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-starlight-100 mb-1">Our Solution</h4>
                                    <p className="text-starlight-400">
                                        One place for everything, accessible from anywhere. Connect your apps and let NexusBrain be your central intelligence.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProblemSolution;
