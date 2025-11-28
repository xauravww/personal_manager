import React from 'react';
import { Check, ArrowRight, Zap } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

const Pricing: React.FC = () => {
    return (
        <section className="py-32 relative" id="pricing">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
                        Choose Your <span className="text-starlight-100">Knowledge Freedom</span>
                    </h2>
                    <p className="text-lg text-starlight-400 max-w-2xl mx-auto">
                        Start free, upgrade when you're ready. No tricks, no hidden fees, no vendor lock-in.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
                    {/* Starter Plan */}
                    <Card glass className="p-8 border-starlight-100/10 hover:border-starlight-100/20 transition-colors">
                        <h3 className="text-xl font-bold text-starlight-100 mb-2">Starter</h3>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-4xl font-display font-bold text-starlight-100">$0</span>
                            <span className="text-starlight-500">/forever</span>
                        </div>
                        <p className="text-starlight-400 text-sm mb-8">Perfect for getting organized.</p>

                        <ul className="space-y-4 mb-8">
                            {['Up to 100 resources', 'Basic search', 'Web app access', 'Community support'].map((feature) => (
                                <li key={feature} className="flex items-center gap-3 text-sm text-starlight-300">
                                    <Check className="w-4 h-4 text-starlight-500" />
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <Button variant="outline" fullWidth>Start Free</Button>
                    </Card>

                    {/* Professional Plan */}
                    <div className="relative transform scale-105 z-10">
                        <div className="absolute -top-10 left-0 right-0 flex justify-center">
                            <div className="bg-neon-blue text-void-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-neon-blue/20">
                                Most Popular
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-neon-blue/20 blur-xl rounded-2xl -z-10" />
                        <Card glass className="p-8 border-neon-blue/50 bg-void-900/80">
                            <h3 className="text-xl font-bold text-starlight-100 mb-2">Professional</h3>
                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-5xl font-display font-bold text-starlight-100">$12</span>
                                <span className="text-starlight-500">/month</span>
                            </div>
                            <p className="text-xs text-neon-blue mb-6">or $99/year (save 25%)</p>

                            <ul className="space-y-4 mb-8">
                                {[
                                    'Unlimited resources',
                                    'AI-powered search',
                                    'Smart capture & tagging',
                                    'Priority support',
                                    'Advanced analytics',
                                    'API access'
                                ].map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm text-starlight-100 font-medium">
                                        <div className="w-5 h-5 rounded-full bg-neon-blue/20 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-neon-blue" />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Button variant="primary" fullWidth size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                Start Free 14-Day Trial
                            </Button>
                            <p className="text-center text-xs text-starlight-500 mt-4">No credit card required</p>
                        </Card>
                    </div>

                    {/* Enterprise Plan */}
                    <Card glass className="p-8 border-starlight-100/10 hover:border-starlight-100/20 transition-colors">
                        <h3 className="text-xl font-bold text-starlight-100 mb-2">Enterprise</h3>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-4xl font-display font-bold text-starlight-100">Custom</span>
                        </div>
                        <p className="text-starlight-400 text-sm mb-8">For teams & organizations.</p>

                        <ul className="space-y-4 mb-8">
                            {['Everything in Professional', 'Team collaboration', 'SSO & Advanced Security', 'Dedicated success manager'].map((feature) => (
                                <li key={feature} className="flex items-center gap-3 text-sm text-starlight-300">
                                    <Check className="w-4 h-4 text-starlight-500" />
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <Button variant="outline" fullWidth>Contact Sales</Button>
                    </Card>
                </div>

                {/* Guarantee */}
                <div className="mt-20 grid md:grid-cols-3 gap-6 text-center max-w-4xl mx-auto">
                    {[
                        { title: "Enterprise-grade Security", desc: "Bank-level encryption & protection" },
                        { title: "SOC 2 Compliant", desc: "Industry-standard security practices" },
                        { title: "Easy Data Export", desc: "Your data, your control, anytime" }
                    ].map((item, i) => (
                        <div key={i} className="p-4">
                            <div className="w-10 h-10 rounded-full bg-void-800 flex items-center justify-center mx-auto mb-3 text-starlight-400">
                                <Zap className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-starlight-200 mb-1">{item.title}</h4>
                            <p className="text-xs text-starlight-500">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Pricing;
