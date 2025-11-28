import React from 'react';
import { BookOpen, Database, CheckCircle2, ArrowRight, Zap, Share2, PenTool, Calendar } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

const DeepDives: React.FC = () => {
    return (
        <div className="space-y-32 py-32">
            {/* Learning Hub Section */}
            <section className="relative">
                <div className="absolute inset-0 bg-neon-purple/5 skew-y-3 transform origin-top-left" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="flex-1 space-y-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-purple/10 border border-neon-purple/20 text-neon-purple text-xs font-bold uppercase tracking-wider">
                                New Feature
                            </div>
                            <h2 className="text-4xl md:text-5xl font-display font-bold leading-tight">
                                The Unified <span className="text-neon-purple">Learning Hub</span>
                            </h2>
                            <p className="text-lg text-starlight-400 leading-relaxed">
                                Experience the power of a second brain. Switch seamlessly between active Study Mode and reflective Vault Mode.
                            </p>

                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center flex-shrink-0 text-neon-purple">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold mb-2">Study Mode</h4>
                                        <p className="text-starlight-400">Active learning with AI-generated curriculums. Master any skill with interactive modules, quizzes, and coding challenges.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-neon-blue/20 flex items-center justify-center flex-shrink-0 text-neon-blue">
                                        <Database className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold mb-2">Vault Mode</h4>
                                        <p className="text-starlight-400">Your knowledge, organized. Browse your learning history in an Obsidian-like file tree with auto-generated Markdown notes.</p>
                                    </div>
                                </div>
                            </div>

                            <Button rightIcon={<ArrowRight className="w-4 h-4" />}>
                                Explore Learning Hub
                            </Button>
                        </div>

                        <div className="flex-1 relative perspective-1000">
                            <div className="absolute inset-0 bg-neon-purple/20 blur-[80px] rounded-full" />
                            <Card glass className="relative p-8 border-neon-purple/20 transform rotate-y-12 hover:rotate-y-0 transition-transform duration-700">
                                <div className="flex items-center justify-between mb-8 border-b border-starlight-100/10 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                    </div>
                                    <div className="text-xs font-mono text-starlight-500">learning_hub.tsx</div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-lg">Machine Learning Path</h3>
                                        <span className="text-neon-purple text-sm font-bold">65% Complete</span>
                                    </div>
                                    <div className="w-full h-2 bg-void-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-neon-purple w-[65%] animate-pulse" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div className="p-4 rounded-lg bg-void-900/50 border border-starlight-100/5">
                                            <div className="text-2xl font-bold text-starlight-100 mb-1">12</div>
                                            <div className="text-xs text-starlight-500 uppercase">Modules</div>
                                        </div>
                                        <div className="p-4 rounded-lg bg-void-900/50 border border-starlight-100/5">
                                            <div className="text-2xl font-bold text-starlight-100 mb-1">850</div>
                                            <div className="text-xs text-starlight-500 uppercase">XP Earned</div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* Universal Capture & Automation Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-16">
                    {/* Universal Capture */}
                    <div className="space-y-8">
                        <h3 className="text-3xl font-display font-bold">Universal Capture</h3>
                        <p className="text-starlight-400">
                            The ultimate resource dump. Throw files, text, URLs, or voice notes into your second brain. Our AI instantly analyzes, categorizes, and stores it for you.
                        </p>

                        <div className="relative h-[400px] border border-starlight-100/10 rounded-2xl bg-void-800/30 overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />

                            {/* Drop Zone Visual */}
                            <div className="w-64 h-64 rounded-full border-2 border-dashed border-starlight-100/20 flex flex-col items-center justify-center text-center p-6 animate-pulse-soft">
                                <Database className="w-12 h-12 text-neon-blue mb-4" />
                                <p className="font-bold text-starlight-200">Drop anything here...</p>
                                <p className="text-xs text-starlight-500 mt-2">PDFs, Images, Docs, URLs</p>
                            </div>

                            {/* Floating Icons */}
                            <div className="absolute top-10 left-10 p-3 rounded-lg bg-void-900 border border-starlight-100/10 animate-float">
                                <Zap className="w-5 h-5 text-neon-yellow" />
                            </div>
                            <div className="absolute bottom-10 right-10 p-3 rounded-lg bg-void-900 border border-starlight-100/10 animate-float animation-delay-200">
                                <Share2 className="w-5 h-5 text-neon-pink" />
                            </div>
                        </div>
                    </div>

                    {/* Smart Automation */}
                    <div className="space-y-8">
                        <h3 className="text-3xl font-display font-bold">Smart Task Automation</h3>
                        <p className="text-starlight-400">
                            Your tasks, automated. The AI learns from your daily routine and helps you track, manage, and complete your goals without the manual effort.
                        </p>

                        <Card glass className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="font-bold">Daily Routine</h4>
                                <span className="text-xs text-starlight-500">Today</span>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { text: "Review daily research papers", tag: "Auto-tracked", color: "text-neon-green" },
                                    { text: "Analyze competitor social strategy", tag: "AI Suggested", color: "text-neon-purple" },
                                    { text: "Update weekly content calendar", tag: "Pending", color: "text-starlight-500" }
                                ].map((task, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-void-900/50 border border-starlight-100/5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded border ${i === 2 ? 'border-starlight-500' : 'bg-neon-blue border-neon-blue flex items-center justify-center'}`}>
                                                {i !== 2 && <CheckCircle2 className="w-3 h-3 text-void-950" />}
                                            </div>
                                            <span className={`text-sm ${i === 2 ? 'text-starlight-300' : 'text-starlight-500 line-through'}`}>{task.text}</span>
                                        </div>
                                        <span className={`text-xs font-medium ${task.color}`}>{task.tag}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 p-4 rounded-lg bg-neon-blue/10 border border-neon-blue/20 flex gap-3">
                                <Zap className="w-5 h-5 text-neon-blue flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-neon-blue mb-1">Optimization Insight</p>
                                    <p className="text-xs text-starlight-300">
                                        You usually complete "Research" tasks in the morning. I've rescheduled your calendar to match your peak productivity.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Social Media Engine */}
            <section className="bg-void-950/50 py-24 border-y border-starlight-100/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-pink/10 border border-neon-pink/20 text-neon-pink text-xs font-bold uppercase tracking-wider mb-6">
                        Growth Engine
                    </div>
                    <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
                        Your Autonomous <span className="text-neon-pink">Social Media Engine</span>
                    </h2>
                    <p className="text-lg text-starlight-400 max-w-2xl mx-auto mb-16">
                        Generate content, schedule posts, and engage with your audience automatically. All based on your unique knowledge base and writing style.
                    </p>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: PenTool, title: "Content Generation", desc: "The AI reads your resources and drafts high-quality posts for LinkedIn, Twitter, and Instagram that sound exactly like you." },
                            { icon: Calendar, title: "Smart Scheduling", desc: "Review and approve posts in one click. The AI handles the posting at optimal times for maximum engagement." },
                            { icon: Share2, title: "Auto-Engagement", desc: "Automatically generate thoughtful comments and replies to grow your network while you sleep." }
                        ].map((item, i) => (
                            <div key={i} className="p-6 rounded-2xl bg-void-900 border border-starlight-100/5 hover:border-neon-pink/30 transition-colors text-left">
                                <div className="w-12 h-12 rounded-xl bg-neon-pink/20 flex items-center justify-center mb-6 text-neon-pink">
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                                <p className="text-starlight-400 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default DeepDives;
