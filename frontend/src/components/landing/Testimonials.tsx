import React from 'react';
import { Star, Quote } from 'lucide-react';
import Card from '../ui/Card';

const Testimonials: React.FC = () => {
    const testimonials = [
        {
            name: "Sarah Johnson",
            role: "Content Creator & Entrepreneur",
            initials: "SJ",
            quote: "I used to spend 2 hours every week searching for content I knew I had saved. Now I find anything in 30 seconds. This app paid for itself in the first month.",
            color: "bg-neon-pink"
        },
        {
            name: "Marcus Rodriguez",
            role: "Graduate Student",
            initials: "MR",
            quote: "As a PhD student, I collect hundreds of research papers and articles. Before this, organization was impossible. Now I can ask 'papers about machine learning ethics' and get exactly what I need.",
            color: "bg-neon-blue"
        },
        {
            name: "Lisa Kim",
            role: "Product Manager",
            initials: "LK",
            quote: "I save everything - meeting notes, competitor research, user feedback, design inspiration. This app turned my scattered knowledge into a superpower. My work quality improved dramatically.",
            color: "bg-neon-purple"
        }
    ];

    return (
        <section className="py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-void-950/50" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
                        Real Stories from <span className="text-starlight-100">Real Users</span>
                    </h2>
                    <p className="text-lg text-starlight-400 max-w-2xl mx-auto">
                        See how people just like you transformed their knowledge management.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((t, i) => (
                        <Card key={i} glass className="p-8 relative group hover:-translate-y-2 transition-transform duration-300">
                            <div className="absolute top-6 right-8 text-void-800 group-hover:text-void-700 transition-colors">
                                <Quote className="w-12 h-12 fill-current" />
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                <div className={`w-12 h-12 rounded-full ${t.color} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                                    {t.initials}
                                </div>
                                <div>
                                    <h4 className="font-bold text-starlight-100">{t.name}</h4>
                                    <p className="text-xs text-starlight-400 uppercase tracking-wider">{t.role}</p>
                                </div>
                            </div>

                            <div className="flex gap-1 mb-4 text-neon-yellow">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-current" />
                                ))}
                            </div>

                            <p className="text-starlight-300 leading-relaxed relative z-10">
                                "{t.quote}"
                            </p>
                        </Card>
                    ))}
                </div>

                {/* Trusted By Logos */}
                <div className="mt-24 pt-12 border-t border-starlight-100/5 text-center">
                    <p className="text-sm font-mono text-starlight-500 uppercase tracking-widest mb-12">Trusted by professionals at</p>
                    <div className="flex flex-wrap justify-center gap-12 md:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                        {['Google', 'Microsoft', 'Adobe', 'Shopify', 'Notion'].map((name) => (
                            <span key={name} className="text-xl font-display font-bold text-starlight-300">{name}</span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
