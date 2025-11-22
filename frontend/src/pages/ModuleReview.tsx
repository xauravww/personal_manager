import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, CheckCircle, Clock, Calendar, Award,
    BookOpen, Code, Brain, Lightbulb, Target
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { apiClient } from '../api/client';

const ModuleReview: React.FC = () => {
    const { moduleId } = useParams<{ moduleId: string }>();
    const navigate = useNavigate();
    const [module, setModule] = useState<any>(null);
    const [subject, setSubject] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchModuleData = async () => {
            try {
                const res = await apiClient.getLearningSubjects();
                if (res.success && res.data) {
                    for (const sub of res.data) {
                        const foundModule = sub.modules?.find((m: any) => m.id === moduleId);
                        if (foundModule) {
                            setModule(foundModule);
                            setSubject(sub);
                            break;
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch module', error);
            } finally {
                setLoading(false);
            }
        };

        fetchModuleData();
    }, [moduleId]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!module) {
        return (
            <DashboardLayout>
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Module Not Found</h2>
                    <button
                        onClick={() => navigate('/learning')}
                        className="text-blue-600 hover:underline"
                    >
                        Back to Learning Hub
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const progress = module.progress?.[0];

    // Parse personalized data
    const chatHistory = progress?.chat_history ? JSON.parse(progress.chat_history) : [];
    const quizAttempts = progress?.quiz_attempts ? JSON.parse(progress.quiz_attempts) : [];
    const identifiedWeaknesses = progress?.identified_weaknesses ? JSON.parse(progress.identified_weaknesses) : [];
    const codeSnippets = progress?.code_snippets ? JSON.parse(progress.code_snippets) : [];

    const correctQuizzes = quizAttempts.filter((q: any) => q.isCorrect).length;
    const totalQuizzes = quizAttempts.length;

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto py-8 px-4">
                <button
                    onClick={() => navigate('/learning')}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Learning Hub
                </button>

                {/* Hero */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 mb-8 border border-green-200">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="text-sm font-medium text-green-600 mb-2">{subject?.name}</div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-3">{module.title}</h1>
                            <p className="text-slate-600 text-lg">{module.description}</p>
                        </div>
                        <div className="p-4 bg-green-200 text-green-700 rounded-2xl">
                            <Award className="w-10 h-10" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-6">
                        <div className="bg-white/60 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-green-600 mb-1">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-medium">Status</span>
                            </div>
                            <div className="text-lg font-bold text-slate-900">Completed</div>
                        </div>
                        <div className="bg-white/60 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-blue-600 mb-1">
                                <Clock className="w-4 h-4" />
                                <span className="text-xs font-medium">Duration</span>
                            </div>
                            <div className="text-lg font-bold text-slate-900">{module.estimated_time} mins</div>
                        </div>
                        <div className="bg-white/60 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-purple-600 mb-1">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs font-medium">Completed</span>
                            </div>
                            <div className="text-lg font-bold text-slate-900">
                                {progress?.completed_at ? new Date(progress.completed_at).toLocaleDateString() : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Performance */}
                {quizAttempts.length > 0 && (
                    <div className="bg-white rounded-2xl p-8 mb-8 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                <Target className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Your Performance</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                                <div className="text-sm font-medium text-purple-600 mb-2">Quiz Score</div>
                                <div className="text-4xl font-bold text-slate-900 mb-2">
                                    {totalQuizzes > 0 ? Math.round((correctQuizzes / totalQuizzes) * 100) : 0}%
                                </div>
                                <div className="text-sm text-slate-600">
                                    {correctQuizzes} out of {totalQuizzes} questions correct
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                                <div className="text-sm font-medium text-green-600 mb-2">Overall Score</div>
                                <div className="text-4xl font-bold text-slate-900 mb-2">{progress?.score || 0}%</div>
                                <div className="text-sm text-slate-600">Great job!</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Problems Solved */}
                {quizAttempts.length > 0 && (
                    <div className="bg-white rounded-2xl p-8 mb-8 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <Lightbulb className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Problems You Solved</h2>
                        </div>
                        <div className="space-y-4">
                            {quizAttempts.map((quiz: any, idx: number) => (
                                <div key={idx} className={`p-4 rounded-xl border-2 ${quiz.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`p-1.5 rounded-lg mt-0.5 ${quiz.isCorrect ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'
                                            }`}>
                                            {quiz.isCorrect ? <CheckCircle className="w-4 h-4" /> : '✗'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-slate-900 mb-2">{quiz.question}</p>
                                            <div className="space-y-1">
                                                {quiz.options?.map((option: string, optIdx: number) => (
                                                    <div key={optIdx} className={`text-sm px-3 py-1.5 rounded ${optIdx === quiz.correctAnswer
                                                            ? 'bg-green-100 text-green-800 font-medium'
                                                            : optIdx === quiz.userAnswer && !quiz.isCorrect
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'text-slate-600'
                                                        }`}>
                                                        {option}
                                                        {optIdx === quiz.correctAnswer && ' ✓'}
                                                        {optIdx === quiz.userAnswer && optIdx !== quiz.correctAnswer && ' (Your answer)'}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Weaknesses */}
                {identifiedWeaknesses.length > 0 && (
                    <div className="bg-white rounded-2xl p-8 mb-8 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                <Target className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Areas to Improve</h2>
                        </div>
                        <div className="space-y-3">
                            {identifiedWeaknesses.map((weakness: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                                    <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                                        !
                                    </div>
                                    <p className="text-slate-700 flex-1">{weakness}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Code */}
                {codeSnippets.length > 0 && (
                    <div className="bg-white rounded-2xl p-8 mb-8 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                <Code className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Code You Wrote</h2>
                        </div>
                        <div className="space-y-4">
                            {codeSnippets.map((snippet: any, idx: number) => (
                                <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                                    {snippet.checkpoint && (
                                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                                            <span className="text-sm font-medium text-slate-600">{snippet.checkpoint}</span>
                                        </div>
                                    )}
                                    <pre className="p-4 bg-slate-900 text-slate-100 overflow-x-auto">
                                        <code>{snippet.code}</code>
                                    </pre>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tips */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-200 text-blue-700 rounded-lg">
                            <Brain className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Review Tips</h2>
                    </div>
                    <ul className="space-y-2 text-slate-700">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>Review these concepts regularly to reinforce your understanding</span>
                        </li>
                        {identifiedWeaknesses.length > 0 && (
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">•</span>
                                <span>Focus extra attention on the areas marked for improvement</span>
                            </li>
                        )}
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>Try explaining each topic to someone else or write about it</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>Practice with real-world examples to solidify your knowledge</span>
                        </li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        onClick={() => navigate('/learning')}
                        className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
                    >
                        Back to Learning Hub
                    </button>
                    <button
                        onClick={() => alert('Retake functionality coming soon!')}
                        className="flex-1 py-3 bg-white text-slate-900 font-bold rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-all"
                    >
                        Retake Module
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ModuleReview;
