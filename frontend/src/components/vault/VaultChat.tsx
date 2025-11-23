import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { apiClient } from '../../api/client';
import { VaultItem } from './VaultSidebar';

interface VaultChatProps {
    contextItem: VaultItem | null;
    isOpen: boolean;
    onClose: () => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const VaultChat: React.FC<VaultChatProps> = ({ contextItem, isOpen, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Add welcome message when context changes
    useEffect(() => {
        if (contextItem && messages.length === 0) {
            setMessages([
                {
                    role: 'assistant',
                    content: `I see you're looking at **${contextItem.title}**. How can I help you with this?`
                }
            ]);
        }
    }, [contextItem?.id]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            // Prepare context with conversation history
            const context = {
                type: contextItem?.type,
                title: contextItem?.title,
                content: contextItem?.data?.content || contextItem?.data?.description || '',
                id: contextItem?.id
            };

            // Pass full conversation history for context
            const response = await apiClient.searchResources({
                q: input,
                learningContext: context,
                conversation: messages.map(m => ({ type: m.role, content: m.content }))
            });

            let aiResponse = "I couldn't process that request.";
            if (response.ai?.chatResponse) {
                aiResponse = response.ai.chatResponse;
            } else if (response.ai?.summary) {
                aiResponse = response.ai.summary;
            }

            setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        } catch (error) {
            console.error("Chat error", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error." }]);
        } finally {
            setIsTyping(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl border-l border-slate-200 z-[100] flex flex-col transform transition-transform duration-300 h-[100dvh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    AI Assistant
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/50 rounded text-slate-500 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Context Indicator */}
            {contextItem && (
                <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 text-xs text-purple-700 flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider">Context:</span>
                    <span className="truncate">{contextItem.title}</span>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center text-slate-400 mt-10">
                        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>Ask me anything about your notes or modules.</p>
                        <p className="text-xs mt-2">I'll remember our conversation!</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user'
                            ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-tr-none shadow-lg'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                            }`}>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start animate-fadeIn">
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-200">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Ask a question..."
                        disabled={isTyping}
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="absolute right-2 top-2 p-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                {messages.length > 0 && (
                    <p className="text-xs text-slate-400 mt-2 text-center">
                        💬 Conversation is maintained for context
                    </p>
                )}
            </div>
        </div>
    );
};

export default VaultChat;
