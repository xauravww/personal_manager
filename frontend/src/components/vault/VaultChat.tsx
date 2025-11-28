import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, X, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { apiClient } from '../../api/client';
import { VaultItem } from './VaultSidebar';

interface VaultChatProps {
    contextItem: VaultItem | null;
    isOpen: boolean;
    onClose: () => void;
    onNotesUpdated?: (moduleId: string, newNotes: string) => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    quiz?: {
        question: string;
        options: string[];
        correctAnswer: number;
    };
    code?: {
        language: string;
        snippet: string;
    };
    savePrompt?: {
        title: string;
        content: string;
    };
}

const VaultChat: React.FC<VaultChatProps> = ({ contextItem, isOpen, onClose, onNotesUpdated }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [quizAnswered, setQuizAnswered] = useState<Set<number>>(new Set());
    // Track if there is an active unanswered quiz
    const [isQuizActive, setIsQuizActive] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Check if the current context is a locked module
    const isLocked = React.useMemo(() => {
        if (contextItem?.type === 'module') {
            // Check if status is explicitly completed
            return contextItem.data?.status !== 'completed';
        }
        return false;
    }, [contextItem]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Add welcome message when context changes
    useEffect(() => {
        if (contextItem && messages.length === 0 && !isLocked) {
            setMessages([
                {
                    role: 'assistant',
                    content: `I see you're looking at **${contextItem.title}**. How can I help you with this?`
                }
            ]);
        }
    }, [contextItem?.id, isLocked]);

    const saveToNotes = async (title: string, content: string) => {
        try {
            // Check if this is a learning module
            if (contextItem?.type === 'module' && contextItem?.data?.id) {
                // For learning modules, update the progress with new notes
                const moduleId = contextItem.data.id;

                // Get current notes from context if available (may be undefined)
                const currentNotes = contextItem.data?.notes || '';

                // Append new note with timestamp
                const timestamp = new Date().toLocaleString();
                const newNote = `\n\n---\n**${title}** (${timestamp})\n${content}`;
                const updatedNotes = currentNotes + newNote;

                // Update the progress with new notes
                await apiClient.updateProgress({
                    module_id: moduleId,
                    status: contextItem.data?.status || 'in_progress',
                    notes: updatedNotes
                });

                // Notify parent to update state
                if (onNotesUpdated) {
                    onNotesUpdated(moduleId, updatedNotes);
                }

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '✅ **Saved to module notes!** You can review this in your learning progress.'
                }]);
            } else {
                // For non-learning content, save as resource
                await apiClient.createResource({
                    title: `📝 ${title}`,
                    description: `Notes from ${contextItem?.title}`,
                    content: content,
                    type: 'note',
                    tag_names: [contextItem?.title || 'notes', 'ai-assistant']
                });

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '✅ **Saved to your notes!** You can find this in your Resources.'
                }]);
            }
        } catch (error) {
            console.error('Failed to save note:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Failed to save note. Please try again.'
            }]);
        }
    };

    const handleQuizAnswer = async (messageIndex: number, selectedOption: string, correctAnswer: number, selectedIndex: number) => {
        setQuizAnswered(prev => new Set(prev).add(messageIndex));
        // After answering, deactivate quiz mode
        setIsQuizActive(false);

        const isCorrect = selectedIndex === correctAnswer;
        const feedback = isCorrect
            ? `✅ **Correct!** Great job!`
            : `❌ **Incorrect.** The correct answer was: ${messages[messageIndex].quiz?.options[correctAnswer]}`;

        // Send the answer to continue the conversation
        await handleSend(`I choose: ${selectedOption}`, false);

        // If there was a mistake, suggest saving it
        if (!isCorrect && contextItem) {
            const mistakeNote = {
                title: `Mistake in ${contextItem.title}`,
                content: `**Question:** ${messages[messageIndex].quiz?.question}\n\n**My Answer:** ${selectedOption}\n\n**Correct Answer:** ${messages[messageIndex].quiz?.options[correctAnswer]}\n\n**Notes:** [Add your notes here about why this was confusing]`
            };

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: feedback,
                savePrompt: mistakeNote
            }]);
        } else {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: feedback
            }]);
        }
    };

    const handleSend = async (text?: string, addUserMessage: boolean = true) => {
        // Prevent sending new messages while a quiz is active
        if (isQuizActive) {
            // Optionally show a warning or ignore
            return;
        }
        const messageText = text || input;
        if (!messageText.trim() || isTyping) return;

        if (addUserMessage) {
            const userMsg: Message = { role: 'user', content: messageText };
            setMessages(prev => [...prev, userMsg]);
        }

        setInput('');
        setIsTyping(true);

        try {
            // Check if this is a learning module context
            const isLearningModule = contextItem?.type === 'module';

            if (isLearningModule && contextItem?.data?.id) {
                // Use the learning module chat API which supports quizzes
                const response = await apiClient.chatWithModule({
                    module_id: contextItem.data.id,
                    message: messageText,
                    conversation_history: messages.filter(m => !m.savePrompt).map(m => ({ role: m.role, content: m.content }))
                });

                if (response.data) {
                    const aiMsg: Message = {
                        role: 'assistant',
                        content: response.data.response || "I'm processing that...",
                        quiz: response.data.quiz,
                        code: response.data.code
                    };
                    // If a quiz is present, activate quiz mode
                    if (response.data.quiz) {
                        setIsQuizActive(true);
                    }
                    // Check if mastery was achieved
                    if (response.data.mastery_achieved && contextItem) {
                        aiMsg.savePrompt = {
                            title: `Mastered: ${contextItem.title}`,
                            content: `🎉 **Achievement Unlocked!**\n\nI've successfully mastered the concepts in **${contextItem.title}**.\n\n**Key Takeaways:**\n[Add your summary of what you learned]`
                        };
                    }
                    setMessages(prev => [...prev, aiMsg]);
                } else {
                    setMessages(prev => [...prev, { role: 'assistant', content: "I couldn't process that request." }]);
                }
            } else {
                // Use the search/chat API for other contexts
                const context = {
                    type: contextItem?.type,
                    title: contextItem?.title,
                    content: contextItem?.data?.content || contextItem?.data?.description || '',
                    id: contextItem?.id
                };

                const response = await apiClient.searchResources({
                    q: messageText,
                    learningContext: context,
                    conversation: messages.filter(m => !m.savePrompt).map(m => ({ type: m.role, content: m.content }))
                });

                let aiResponse = "I couldn't process that request.";
                if (response.ai?.chatResponse) {
                    aiResponse = response.ai.chatResponse;
                } else if (response.ai?.summary) {
                    aiResponse = response.ai.summary;
                }

                setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
            }
        } catch (error) {
            console.error("Chat error", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error." }]);
        } finally {
            setIsTyping(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-void-950 shadow-2xl border-l border-starlight-100/10 z-[100] flex flex-col transform transition-transform duration-300 h-[100dvh]">
            {/* Header */}
            <div className="p-4 border-b border-starlight-100/10 flex items-center justify-between bg-void-900">
                <div className="flex items-center gap-2 font-bold text-starlight-100">
                    <Sparkles className="w-5 h-5 text-neon-purple" />
                    AI Assistant
                </div>
                <button onClick={onClose} className="p-1 hover:bg-void-800 rounded text-starlight-500 hover:text-starlight-100 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Context Indicator */}
            {contextItem && (
                <div className="px-4 py-2 bg-neon-purple/5 border-b border-neon-purple/10 text-xs text-neon-purple flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider">Context:</span>
                    <span className="truncate">{contextItem.title}</span>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-void-950" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center text-starlight-500 mt-10">
                        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20 text-neon-purple" />
                        <p>Ask me anything about your notes or modules.</p>
                        <p className="text-xs mt-2">I'll remember our conversation!</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className="space-y-2">
                        <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                            <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user'
                                ? 'bg-neon-blue text-white rounded-tr-none shadow-lg shadow-neon-blue/20'
                                : 'bg-void-900 border border-starlight-100/10 text-starlight-200 rounded-tl-none shadow-sm'
                                }`}>
                                <div className="prose prose-invert max-w-none prose-p:text-inherit prose-headings:text-inherit prose-code:text-neon-purple">
                                    <ReactMarkdown>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>

                        {/* Quiz UI with clickable buttons */}
                        {msg.quiz && !quizAnswered.has(idx) && (
                            <div className="bg-neon-purple/5 rounded-xl p-4 border border-neon-purple/20 shadow-sm animate-fadeIn">
                                <div className="flex items-center gap-2 mb-3 text-neon-purple font-bold text-sm">
                                    <Sparkles className="w-4 h-4" />
                                    Quiz Time!
                                </div>
                                <p className="text-starlight-100 font-medium mb-3 text-sm">{msg.quiz.question}</p>
                                <div className="space-y-2">
                                    {msg.quiz.options.map((option, optIdx) => (
                                        <button
                                            key={optIdx}
                                            onClick={() => handleQuizAnswer(idx, option, msg.quiz!.correctAnswer, optIdx)}
                                            className="w-full text-left p-3 rounded-lg border border-starlight-100/10 hover:border-neon-purple hover:bg-neon-purple/10 transition-all text-sm text-starlight-300 hover:text-starlight-100 font-medium"
                                        >
                                            {String.fromCharCode(65 + optIdx)}. {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Code block */}
                        {msg.code && (
                            <div className="bg-void-900 rounded-lg p-4 overflow-x-auto border border-starlight-100/10">
                                <div className="text-xs text-starlight-500 mb-2">{msg.code.language}</div>
                                <pre className="text-sm text-starlight-200">
                                    <code>{msg.code.snippet}</code>
                                </pre>
                            </div>
                        )}

                        {/* Save to Notes prompt */}
                        {msg.savePrompt && (
                            <div className="bg-neon-blue/5 rounded-lg p-3 border border-neon-blue/20 animate-fadeIn">
                                <p className="text-xs text-neon-blue mb-2 font-medium">💡 Save this to your notes?</p>
                                <button
                                    onClick={() => saveToNotes(msg.savePrompt!.title, msg.savePrompt!.content)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-neon-blue text-white text-xs font-medium rounded-lg hover:bg-neon-blue/90 transition-colors shadow-lg shadow-neon-blue/20"
                                >
                                    <Save className="w-3 h-3" />
                                    Save to Notes
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start animate-fadeIn">
                        <div className="bg-void-900 border border-starlight-100/10 rounded-2xl rounded-tl-none p-4 shadow-sm">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 bg-void-900 border-t border-starlight-100/10">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Ask a question..."
                        disabled={isTyping || isQuizActive}
                        className="w-full pl-4 pr-12 py-3 bg-void-950 border border-starlight-100/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-purple/50 focus:border-transparent text-starlight-100 placeholder-starlight-600 transition-all disabled:opacity-50"
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isTyping}
                        className="absolute right-2 top-2 p-1.5 bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-neon-purple/20"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                {messages.length > 0 && (
                    <p className="text-xs text-starlight-500 mt-2 text-center">
                        💬 Conversation is maintained for context
                    </p>
                )}
            </div>
        </div>
    );
};

export default VaultChat;
