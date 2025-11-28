import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const FAQ: React.FC = () => {
    const faqs = [
        {
            question: "What is the difference between Study Mode and Vault Mode?",
            answer: "Think of Study Mode as your classroom where you actively learn new concepts with an AI tutor. Vault Mode is your library—an Obsidian-like file tree where all your generated notes, summaries, and code snippets are automatically organized for review and reference."
        },
        {
            question: "How does the AI search work?",
            answer: "Our AI understands context and meaning, not just keywords. When you search for 'that productivity technique from the YouTube video,' it finds relevant content even if those exact words aren't in your saved notes. It's like having a personal research assistant who knows your knowledge base intimately."
        },
        {
            question: "Can I import my data from other apps?",
            answer: "Absolutely! We support importing from Evernote, Notion, Google Keep, browser bookmarks, and most major note-taking apps. Our migration tools make it easy to consolidate all your scattered knowledge into one powerful system."
        },
        {
            question: "Is my data private and secure?",
            answer: "Your privacy is our top priority. All data is encrypted end-to-end, and we never share your personal information. Your knowledge stays yours - we only use it to provide better search results within your own content. SOC 2 compliant and GDPR ready."
        },
        {
            question: "What happens after my free trial?",
            answer: "You'll get a friendly reminder 3 days before your trial ends. If you decide to continue, we'll seamlessly transition you to a paid plan. If not, your data remains accessible in read-only mode for 30 days to export your content. No surprises, no automatic charges."
        }
    ];

    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="py-32 bg-void-950/50 border-t border-starlight-100/5">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                        Frequently Asked <span className="text-starlight-100">Questions</span>
                    </h2>
                    <p className="text-starlight-400">
                        Everything you need to know before getting started with your knowledge revolution.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, i) => (
                        <div
                            key={i}
                            className={`rounded-2xl border transition-all duration-300 ${openIndex === i
                                    ? 'bg-void-900 border-neon-blue/30 shadow-lg shadow-neon-blue/5'
                                    : 'bg-void-900/30 border-starlight-100/5 hover:border-starlight-100/10'
                                }`}
                        >
                            <button
                                className="w-full px-6 py-5 flex items-center justify-between text-left"
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                            >
                                <span className={`font-medium text-lg ${openIndex === i ? 'text-starlight-100' : 'text-starlight-300'}`}>
                                    {faq.question}
                                </span>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${openIndex === i ? 'bg-neon-blue/20 text-neon-blue' : 'bg-void-800 text-starlight-500'
                                    }`}>
                                    {openIndex === i ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </div>
                            </button>

                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                            >
                                <div className="px-6 pb-6 text-starlight-400 leading-relaxed">
                                    {faq.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-starlight-400">
                        Still have questions? <a href="#" className="text-neon-blue hover:text-neon-purple transition-colors font-medium">Contact our support team</a>
                    </p>
                </div>
            </div>
        </section>
    );
};

export default FAQ;
