import React from 'react';
import { Share2, Youtube, Brain, Zap, Smartphone, Lock, ArrowUpRight } from 'lucide-react';
import Card from '../ui/Card';

const FeatureGrid: React.FC = () => {
    return (
        <section className="py-32 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
                        Everything You Need to<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">Master Your Knowledge</span>
                    </h2>
                    <p className="text-lg text-starlight-400 max-w-2xl mx-auto">
                        Powerful features designed to help you capture, organize, and retrieve information instantly.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
                    {/* Social Intelligence - Large Card */}
                    <Card glass className="md:col-span-2 md:row-span-1 p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Share2 className="w-64 h-64 text-neon-pink" />
                        </div>
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-xl bg-neon-pink/20 flex items-center justify-center mb-6 text-neon-pink">
                                    <Share2 className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">Social Intelligence</h3>
                                <p className="text-starlight-400 max-w-md">
                                    Never lose a reel or post. Automatically capture and transcribe content from Instagram to build your library.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-neon-pink text-sm font-bold uppercase tracking-wider">
                                Auto-Capture Active <ArrowUpRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Card>

                    {/* Video Search */}
                    <Card glass className="p-8 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mb-6 text-red-500">
                                <Youtube className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Video Search</h3>
                            <p className="text-starlight-400 text-sm">
                                Don't just watch, understand. Search inside YouTube videos to find exact moments and concepts instantly.
                            </p>
                        </div>
                    </Card>

                    {/* Personalized AI */}
                    <Card glass className="p-8 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center mb-6 text-neon-purple">
                                <Brain className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Personalized AI</h3>
                            <p className="text-starlight-400 text-sm">
                                An intelligent agent that learns your style, strengths, and weak points to give you tailored suggestions.
                            </p>
                        </div>
                    </Card>

                    {/* Smart Capture - Large Card */}
                    <Card glass className="md:col-span-2 md:row-span-1 p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Zap className="w-64 h-64 text-neon-yellow" />
                        </div>
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-xl bg-neon-yellow/20 flex items-center justify-center mb-6 text-neon-yellow">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">Smart Capture</h3>
                                <p className="text-starlight-400 max-w-md">
                                    Save articles, PDFs, and notes with a single click. Our extension works everywhere you do, processing content instantly.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {['PDF', 'Web', 'Notes', 'Images'].map((tag) => (
                                    <span key={tag} className="px-2 py-1 rounded bg-void-900/50 border border-starlight-100/10 text-xs text-starlight-400">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* Cross Platform */}
                    <Card glass className="p-8 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-neon-blue/20 flex items-center justify-center mb-6 text-neon-blue">
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Cross-Platform</h3>
                            <p className="text-starlight-400 text-sm">
                                Seamlessly sync across all your devices. Your second brain is always with you, wherever you go.
                            </p>
                        </div>
                    </Card>

                    {/* Secure & Private */}
                    <Card glass className="p-8 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-neon-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-neon-green/20 flex items-center justify-center mb-6 text-neon-green">
                                <Lock className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
                            <p className="text-starlight-400 text-sm">
                                Your data is encrypted and private. We never share your personal information. SOC 2 Compliant.
                            </p>
                        </div>
                    </Card>

                    {/* Growth Engine */}
                    <Card glass className="p-8 relative overflow-hidden group bg-gradient-to-br from-void-800 to-void-900">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
                        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple p-0.5 mb-4 animate-spin-slow">
                                <div className="w-full h-full rounded-full bg-void-900 flex items-center justify-center">
                                    <ArrowUpRight className="w-8 h-8 text-starlight-100" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold mb-1">Growth Engine</h3>
                            <p className="text-starlight-400 text-sm">AI-driven skill gap analysis</p>
                        </div>
                    </Card>
                </div>
            </div>
        </section>
    );
};

export default FeatureGrid;
