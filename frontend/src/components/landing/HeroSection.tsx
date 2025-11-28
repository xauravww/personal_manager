import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Star } from 'lucide-react';
import Button from '../ui/Button';

const HeroSection: React.FC = () => {
    return (
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
            {/* Abstract Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-neon-blue/20 rounded-full blur-[120px] opacity-30 animate-pulse-soft" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-neon-purple/10 rounded-full blur-[100px] opacity-20" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="text-center max-w-5xl mx-auto space-y-8">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-void-800/50 border border-starlight-100/10 backdrop-blur-sm animate-fade-in hover:border-neon-blue/30 transition-colors cursor-default">
                        <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                        <span className="text-xs font-medium text-starlight-300 uppercase tracking-wider">v2.0 Now Live</span>
                        <span className="w-px h-3 bg-starlight-100/10 mx-1" />
                        <span className="text-xs font-medium text-neon-blue">Join 10,000+ Users</span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tighter leading-[1.1] animate-slide-up">
                        Never Lose Another<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink animate-gradient-x">
                            Great Idea Again
                        </span>
                    </h1>

                    {/* Subheading */}
                    <p className="text-lg md:text-xl text-starlight-400 max-w-2xl mx-auto leading-relaxed animate-slide-up animation-delay-200">
                        Stop wasting hours searching for that article you saved 6 months ago. Our AI understands your thoughts and finds exactly what you need in seconds.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 animate-slide-up animation-delay-400">
                        <Link to="/signup">
                            <Button size="lg" rightIcon={<ArrowRight className="w-5 h-5" />} className="px-8 py-6 text-lg shadow-lg shadow-neon-blue/20 hover:shadow-neon-blue/40">
                                Start Free Trial
                            </Button>
                        </Link>
                        <Button variant="secondary" size="lg" leftIcon={<Play className="w-4 h-4" />} className="px-8 py-6 text-lg">
                            Watch Demo
                        </Button>
                    </div>

                    {/* Trust Badges */}
                    <div className="pt-8 flex flex-col items-center gap-4 animate-slide-up animation-delay-600">
                        <div className="flex items-center gap-1 text-neon-yellow">
                            <Star className="w-5 h-5 fill-current" />
                            <Star className="w-5 h-5 fill-current" />
                            <Star className="w-5 h-5 fill-current" />
                            <Star className="w-5 h-5 fill-current" />
                            <Star className="w-5 h-5 fill-current" />
                        </div>
                        <p className="text-sm text-starlight-500">
                            <span className="font-bold text-starlight-200">4.9/5</span> from 10,000+ knowledge workers
                        </p>
                    </div>

                    {/* Hero Visual / Dashboard Preview */}
                    <div className="mt-20 relative mx-auto max-w-6xl animate-slide-up animation-delay-600 perspective-1000">
                        <div className="relative rounded-2xl border border-starlight-100/10 bg-void-800/50 backdrop-blur-xl shadow-2xl overflow-hidden transform rotate-x-12 hover:rotate-x-0 transition-transform duration-1000 ease-out group">
                            <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            {/* Mockup Header */}
                            <div className="h-10 bg-void-900/80 border-b border-starlight-100/5 flex items-center px-4 gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                                </div>
                                <div className="flex-1 text-center">
                                    <div className="inline-block px-3 py-1 rounded-md bg-void-800 text-[10px] font-mono text-starlight-500">nexusbrain.app</div>
                                </div>
                            </div>

                            {/* Image Placeholder */}
                            <div className="aspect-[16/9] bg-void-900 relative group-hover:scale-[1.02] transition-transform duration-700">
                                <img
                                    src="/assets/dashboard-preview.png"
                                    alt="NexusBrain Dashboard"
                                    className="w-full h-full object-cover opacity-90"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement!.innerHTML += `
                      <div class="absolute inset-0 flex items-center justify-center">
                        <div class="text-center space-y-4">
                          <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple mx-auto flex items-center justify-center shadow-lg shadow-neon-blue/20">
                            <span class="text-4xl font-bold text-white">N</span>
                          </div>
                          <p class="text-starlight-500 font-mono text-sm">DASHBOARD PREVIEW</p>
                        </div>
                      </div>
                    `;
                                    }}
                                />

                                {/* Floating Elements */}
                                <div className="absolute top-1/4 -left-12 p-4 rounded-xl bg-void-800/90 backdrop-blur-md border border-starlight-100/10 shadow-xl transform -rotate-6 hover:rotate-0 transition-transform duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center text-neon-purple">
                                            <Star className="w-5 h-5 fill-current" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-starlight-500 uppercase tracking-wider">AI Insight</p>
                                            <p className="text-sm font-medium text-starlight-100">Pattern detected in research</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute bottom-1/4 -right-12 p-4 rounded-xl bg-void-800/90 backdrop-blur-md border border-starlight-100/10 shadow-xl transform rotate-6 hover:rotate-0 transition-transform duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-neon-green/20 flex items-center justify-center text-neon-green">
                                            <div className="w-5 h-5 border-2 border-current rounded-full border-t-transparent animate-spin" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-starlight-500 uppercase tracking-wider">Sync Status</p>
                                            <p className="text-sm font-medium text-starlight-100">All systems operational</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
