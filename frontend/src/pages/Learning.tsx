import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BookOpen, Brain, Target, Zap, ChevronRight, CheckCircle,
  Play, Clock, Award, ArrowRight, Sparkles, Layout, Search,
  MessageSquare, BarChart3, ChevronLeft, Send, RefreshCw,
  GraduationCap, FileText, Video, Link as LinkIcon, Lock, Unlock,
  Archive, Trash2, AlertTriangle, X, Menu, PanelLeft
} from 'lucide-react';
import { apiClient } from '../api/client';
import DashboardLayout from '../components/layout/DashboardLayout';
import ReactMarkdown from 'react-markdown';
import VaultSidebar, { VaultItem } from '../components/vault/VaultSidebar';
import VaultContent from '../components/vault/VaultContent';
import VaultChat from '../components/vault/VaultChat';

// --- Types ---
// (Keep existing types)
interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface AssessmentResult {
  score: number;
  weakAreas: string[];
}

interface Module {
  id?: string;
  title: string;
  description: string;
  estimated_time: number;
  difficulty: string;
  order_index: number;
  status?: 'locked' | 'unlocked' | 'in_progress' | 'completed';
  checkpoints?: string | any[];
}

interface Course {
  id?: string;
  title: string;
  description: string;
  modules: Module[];
  progress?: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  quiz?: {
    question: string;
    options: string[];
    correctAnswer: number;
    codeSnippet?: string;
  };
  code?: { language: string; snippet: string };
  action?: 'next_topic' | 'complete_module';
}

// --- Components (Keep existing logic components) ---

const LoadingState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <div className="relative w-24 h-24 mb-8">
      <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Brain className="w-8 h-8 text-blue-600 animate-pulse" />
      </div>
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-2">{message}</h3>
    <p className="text-slate-500 max-w-md">Our AI is analyzing your request and structuring your personalized learning path...</p>
  </div>
);

const SkillInput = ({ onAnalyze }: { onAnalyze: (topic: string) => void }) => {
  const [topic, setTopic] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) onAnalyze(topic);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 md:py-12">
      <div className="text-center mb-8 md:mb-12">
        <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4 md:mb-6 tracking-tight">
          What do you want to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">master today?</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
          Your AI Study Partner will assess your current level, identify gaps, and build a custom curriculum just for you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
        <div className="relative flex items-center bg-white rounded-2xl p-2 shadow-xl border border-slate-100">
          <div className="pl-4 md:pl-6 pr-2 md:pr-4">
            <Search className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
          </div>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., React Hooks, Astrophysics..."
            className="flex-1 py-3 md:py-4 text-base md:text-xl text-slate-900 placeholder-slate-400 bg-transparent border-none focus:ring-0 focus:outline-none min-w-0"
            autoFocus
          />
          <button
            type="submit"
            disabled={!topic.trim()}
            className="bg-slate-900 text-white px-4 md:px-8 py-2 md:py-3 rounded-xl font-medium hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm md:text-base whitespace-nowrap"
          >
            Start
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </form>

      {/* Suggestions */}
      <div className="mt-8 md:mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {['Python Programming', 'Machine Learning', 'World History', 'Public Speaking'].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onAnalyze(suggestion)}
            className="p-3 md:p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
          >
            <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600">{suggestion}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ... (Rest of file)

// In the main component render:
//      <div className="flex h-[calc(100dvh-120px)] md:h-[calc(100vh-100px)] overflow-hidden bg-white rounded-lg shadow-sm border border-slate-200">

// ... (Assessment, CurriculumPreview, ModulePlayer components - I will include them fully in the file write, but for brevity in this prompt I'm skipping their full definition if I was just showing a snippet. Since I'm writing the whole file, I need to include them.)
// To ensure I don't lose the logic, I will copy the logic from the previous read.

const Assessment = ({ topic, questions, onComplete }: { topic: string, questions: Question[], onComplete: (result: AssessmentResult) => void }) => {
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIndex;
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(curr => curr + 1), 500);
    }
  };

  const handleSubmit = () => {
    let correct = 0;
    const weakAreas: string[] = [];

    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        correct++;
      } else {
        // Store the full question text for weak areas
        weakAreas.push(q.question);
      }
    });

    const score = Math.round((correct / questions.length) * 100);
    onComplete({ score, weakAreas });
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Skill Assessment: {topic}</h2>
          <span className="text-sm font-medium text-slate-500">Question {currentQuestion + 1} of {questions.length}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 mb-8">
        <h3 className="text-xl font-medium text-slate-900 mb-8 leading-relaxed">
          {questions[currentQuestion].question}
        </h3>

        <div className="space-y-4">
          {questions[currentQuestion].options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              className={`w-full p-5 rounded-xl text-left border-2 transition-all flex items-center justify-between group ${answers[currentQuestion] === idx
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50 text-slate-700'
                }`}
            >
              <span className="font-medium">{option}</span>
              {answers[currentQuestion] === idx && (
                <CheckCircle className="w-5 h-5 text-blue-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={() => setCurrentQuestion(curr => Math.max(0, curr - 1))}
          disabled={currentQuestion === 0}
          className="text-slate-500 hover:text-slate-900 font-medium disabled:opacity-50"
        >
          Previous
        </button>

        {currentQuestion === questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={answers.includes(-1)}
            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            Complete Assessment
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestion(curr => Math.min(questions.length - 1, curr + 1))}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-all"
          >
            Next Question
          </button>
        )}
      </div>
    </div>
  );
};

// --- New Component: Assessment Result View ---
const AssessmentResultView = ({
  result,
  topic,
  existingSubject,
  onGenerate,
  onContinue
}: {
  result: AssessmentResult,
  topic: string,
  existingSubject?: VaultItem,
  onGenerate: () => void,
  onContinue: () => void
}) => {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 text-blue-600 rounded-full mb-6">
          <Award className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Assessment Complete!</h2>
        <p className="text-slate-600">You scored <span className="font-bold text-blue-600 text-xl">{result.score}%</span> on {topic}.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8 text-left">
        <h3 className="font-bold text-slate-900 mb-4">Analysis</h3>
        {result.score > 80 ? (
          <p className="text-slate-600 mb-4">You have a strong grasp of the fundamentals! We'll tailor the course to focus on advanced concepts and practical applications.</p>
        ) : result.score > 50 ? (
          <p className="text-slate-600 mb-4">You have a good foundation. We'll reinforce core concepts while introducing new material to help you master the subject.</p>
        ) : (
          <p className="text-slate-600 mb-4">This is a great starting point! We'll build your knowledge from the ground up with clear explanations and hands-on practice.</p>
        )}

        {result.weakAreas.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Areas to Focus On</h4>
            <div className="space-y-3">
              {result.weakAreas.map((area, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-xs font-bold mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed flex-1">{area}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {existingSubject && (
        <div className="bg-blue-50 rounded-xl p-6 mb-8 border border-blue-100">
          <div className="flex items-start gap-4 text-left">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Existing Course Found</h4>
              <p className="text-sm text-slate-600 mb-3">You already have a course related to "{existingSubject.title}". Would you like to continue that instead?</p>
              <button
                onClick={onContinue}
                className="text-blue-700 font-bold text-sm hover:underline"
              >
                Continue "{existingSubject.title}"
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onGenerate}
          className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Generate Custom Course
        </button>
        {existingSubject && (
          <button
            onClick={onContinue}
            className="px-8 py-3 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-all text-slate-700"
          >
            Continue Existing
          </button>
        )}
      </div>
    </div>
  );
};

const CurriculumPreview = ({
  course,
  onStart,
  onRegenerate,
  onChat
}: {
  course: Course,
  onStart: () => void,
  onRegenerate: () => void,
  onChat: () => void
}) => {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-3 bg-green-100 text-green-700 rounded-full mb-6">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Your Custom Curriculum is Ready</h2>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Based on your assessment, we've designed this path to take you from your current level to mastery.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-8">
        <div className="p-8 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{course.title}</h3>
            <p className="text-slate-600">{course.description}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRegenerate}
              className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors tooltip"
              title="Regenerate Curriculum"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={onChat}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip"
              title="Chat about this course"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {course.modules.map((module, idx) => (
            <div key={idx} className="p-6 hover:bg-slate-50 transition-colors flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-bold text-slate-900">{module.title}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${module.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                    module.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                    {module.difficulty}
                  </span>
                </div>
                <p className="text-slate-600 text-sm mb-3">{module.description}</p>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {module.estimated_time} mins</span>
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> 3 Topics</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onStart}
          className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-3"
        >
          Start Learning Now
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

const ModulePlayer = ({ module, onBack, onComplete }: { module: Module, onBack: () => void, onComplete: (sessionData?: any) => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);
  const [masteryAchieved, setMasteryAchieved] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Track learning session data
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [codeSnippets, setCodeSnippets] = useState<any[]>([]);
  const [identifiedWeaknesses, setIdentifiedWeaknesses] = useState<string[]>([]);

  // Parse checkpoints
  const checkpoints = useMemo(() => {
    if (typeof module.checkpoints === 'string') {
      try {
        return JSON.parse(module.checkpoints);
      } catch {
        return [];
      }
    }
    return module.checkpoints || [];
  }, [module.checkpoints]);

  const currentCheckpoint = checkpoints[currentCheckpointIndex];

  useEffect(() => {
    if (messages.length === 0) {
      const introMsg = currentCheckpoint
        ? `Welcome to **${module.title}**. We'll start with **${currentCheckpoint.title}**.\n\n${currentCheckpoint.description}\n\nWhat do you already know about this?`
        : `Welcome to **${module.title}**! I'm your AI tutor. Let's get started.`;

      setMessages([{ role: 'assistant', content: introMsg, timestamp: new Date() }]);
    }
  }, [module, currentCheckpoint, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (textInput?: string) => {
    let msgContent = textInput || input;
    if (!msgContent.trim()) return;

    if (isCodeMode && !msgContent.startsWith('```')) {
      msgContent = `\`\`\`\n${msgContent}\n\`\`\``;
    }

    const userMsg: ChatMessage = { role: 'user', content: msgContent, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    if (isCodeMode) setIsCodeMode(false);

    try {
      const response = await apiClient.chatWithModule({
        module_id: module.id!,
        message: userMsg.content,
        conversation_history: messages.map(m => ({ role: m.role, content: m.content }))
      });

      const aiMsg: ChatMessage = {
        role: 'assistant',
        content: response.data?.response || "I'm processing that...",
        timestamp: new Date(),
        quiz: response.data?.quiz,
        code: response.data?.code
      };
      setMessages(prev => [...prev, aiMsg]);

      if (response.data?.mastery_achieved) {
        setMasteryAchieved(true);
        const isLastCheckpoint = currentCheckpointIndex >= checkpoints.length - 1;

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `🎉 **Checkpoint Mastered!** You've demonstrated a solid understanding of this topic. Click the button below to move forward.`,
          timestamp: new Date(),
          action: isLastCheckpoint ? 'complete_module' : 'next_topic'
        }]);
      }

    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again.", timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNextTopic = () => {
    setMessages(prev => {
      const newMessages = [...prev];
      const lastMsgIndex = newMessages.findLastIndex(m => m.action === 'next_topic');
      if (lastMsgIndex !== -1) {
        newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], action: undefined };
      }
      return newMessages;
    });

    if (currentCheckpointIndex < checkpoints.length - 1) {
      setCurrentCheckpointIndex(prev => prev + 1);
      setMasteryAchieved(false);
      const nextCp = checkpoints[currentCheckpointIndex + 1];
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Great! Let's move on to **${nextCp.title}**.\n\n${nextCp.description}`,
        timestamp: new Date()
      }]);
    } else {
      onComplete();
    }
  };

  const handleModuleComplete = () => {
    setMessages(prev => {
      const newMessages = [...prev];
      const lastMsgIndex = newMessages.findLastIndex(m => m.action === 'complete_module');
      if (lastMsgIndex !== -1) {
        newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], action: undefined };
      }
      return newMessages;
    });

    const sessionData = {
      chatHistory: messages,
      quizAttempts,
      identifiedWeaknesses,
      codeSnippets
    };

    onComplete(sessionData);
  };

  return (
    <div className="flex h-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 relative">
      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div
          className="absolute inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        absolute inset-y-0 left-0 z-50 w-80 bg-slate-50 border-r border-slate-200 p-6 flex flex-col transition-transform duration-300
        md:relative md:translate-x-0
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-900 transition-colors">
            <ChevronLeft className="w-5 h-5 mr-1" /> Back
          </button>
          <button
            onClick={() => setShowMobileSidebar(false)}
            className="md:hidden p-2 text-slate-500 hover:bg-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-8">
          <h3 className="font-bold text-slate-900 text-lg mb-2">{module.title}</h3>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" /> {module.estimated_time} mins
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Checkpoints</h4>
          <ul className="space-y-3">
            {checkpoints.length > 0 ? checkpoints.map((cp: any, i: number) => (
              <li key={i} className={`flex items-center gap-3 text-sm ${i === currentCheckpointIndex ? 'text-blue-600 font-medium' : 'text-slate-600'}`}>
                <div className={`w-2 h-2 rounded-full ${i === currentCheckpointIndex ? 'bg-blue-600' : i < currentCheckpointIndex ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                {cp.title}
                {i === currentCheckpointIndex && masteryAchieved && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
              </li>
            )) : (
              <li className="text-slate-400 italic">No checkpoints defined</li>
            )}
          </ul>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="md:hidden p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-200 rounded-lg flex items-center gap-2"
          >
            <Menu className="w-5 h-5" />
            <span className="text-sm font-medium">Checkpoints</span>
          </button>
          <span className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{module.title}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-2xl rounded-2xl p-5 ${msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-800'
                }`}>
                <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'text-white' : 'text-slate-700'}`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
              {msg.quiz && (
                <div className="mt-4 max-w-2xl w-full bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3 text-purple-600 font-bold">
                    <div className="p-1 bg-purple-100 rounded-lg"><Brain className="w-4 h-4" /></div>
                    Quiz Time
                  </div>
                  <p className="text-slate-800 font-medium mb-4">{msg.quiz.question}</p>
                  <div className="space-y-2">
                    {msg.quiz.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(`I choose: ${option}`)}
                        className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-sm text-slate-600"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {msg.action === 'next_topic' && (
                <div className="mt-4">
                  <button
                    onClick={handleNextTopic}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                  >
                    <Unlock className="w-5 h-5" /> Proceed to Next Topic <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
              {msg.action === 'complete_module' && (
                <div className="mt-4">
                  <button
                    onClick={handleModuleComplete}
                    className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                  >
                    <CheckCircle className="w-5 h-5" /> Complete Module
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your answer or ask a question..."
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Learning Hub Component ---

const Learning = () => {
  // State for Vault/Hub Layout
  const [viewMode, setViewMode] = useState<'study' | 'vault'>('study');
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State for Study Mode Logic
  const [step, setStep] = useState<'input' | 'assessment' | 'result' | 'curriculum' | 'module'>('input');
  const [topic, setTopic] = useState('');
  const [assessmentQuestions, setAssessmentQuestions] = useState<Question[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [generatedCourse, setGeneratedCourse] = useState<Course | null>(null);
  const [currentModule, setCurrentModule] = useState<Module | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [existingSubjectMatch, setExistingSubjectMatch] = useState<VaultItem | undefined>(undefined);

  // Chat history from navigation
  const location = useLocation();
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  // Check for chat context from navigation
  useEffect(() => {
    if (location.state?.fromChat && location.state?.chatHistory) {
      setChatHistory(location.state.chatHistory);
      if (location.state?.initialQuery) {
        setTopic(location.state.initialQuery);
        setViewMode('study');
        setStep('input');
      }
    }
  }, [location.state]);

  // Fetch Vault Data
  const fetchVaultData = React.useCallback(async () => {
    try {
      // Only set loading on initial fetch if items are empty
      if (items.length === 0) setIsLoading(true);

      const subjectsRes = await apiClient.getLearningSubjects();

      if (subjectsRes.success && subjectsRes.data) {
        const subjects = subjectsRes.data;

        const tree: VaultItem[] = await Promise.all(subjects.map(async (subject: any) => {
          const modulesRes = await apiClient.getLearningModules(subject.id);
          const modules = modulesRes.data?.modules || [];

          const children: VaultItem[] = modules.map((m: any) => {
            // Initial state: Not loaded
            // We create a placeholder note item that will be populated on demand
            const moduleNotes: VaultItem[] = [
              {
                id: `${m.id}-practice`,
                title: 'Learning Notes.md',
                type: 'note',
                data: {
                  id: m.id,
                  title: 'Learning Notes',
                  content: 'Loading notes...', // Placeholder
                  status: 'unknown',
                  notes: '',
                  isLoaded: false // Flag to track if we need to fetch
                }
              }
            ];

            return {
              id: m.id,
              title: m.title,
              type: 'module',
              data: { ...m, status: 'unknown', isLoaded: false },
              children: moduleNotes
            };
          });

          return {
            id: subject.id,
            title: subject.name,
            type: 'subject',
            children,
            data: subject
          };
        }));

        setItems(tree);
      }
    } catch (error) {
      console.error("Failed to fetch vault data", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVaultData();
  }, [fetchVaultData]);

  // Function to load module data on demand
  const loadModuleData = async (moduleId: string) => {
    try {
      // Find the module in the items tree to check if already loaded
      // This is a bit complex with the nested structure, so we'll just fetch and update
      // Optimization: In a real app with Redux/Context, check state first.

      const progressRes = await apiClient.getProgressOverview();
      let progressNotes = '# Learning Progress\n\n*No notes saved yet. Use the AI Assistant to save your learnings!*';
      let moduleStatus = 'not_started';

      if (progressRes.success && progressRes.data) {
        const moduleProgress = progressRes.data.find((p: any) => p.module_id === moduleId);
        if (moduleProgress) {
          if (moduleProgress.notes) progressNotes = moduleProgress.notes;
          if (moduleProgress.status) moduleStatus = moduleProgress.status;
        }
      }

      // Update the items state with the fetched data
      setItems(prevItems => {
        return prevItems.map(subject => {
          if (!subject.children) return subject;

          const updatedModules = subject.children.map(module => {
            if (module.id === moduleId) {
              // Update this module
              const updatedModule: VaultItem = {
                ...module,
                data: { ...module.data, status: moduleStatus, notes: progressNotes, isLoaded: true },
                children: [
                  {
                    id: `${moduleId}-practice`,
                    title: 'Learning Notes.md',
                    type: 'note',
                    data: {
                      id: moduleId,
                      title: 'Learning Notes',
                      content: progressNotes,
                      status: moduleStatus,
                      notes: progressNotes,
                      created_at: new Date().toISOString(),
                      isLoaded: true
                    }
                  }
                ]
              };
              return updatedModule;
            }
            return module;
          });

          return { ...subject, children: updatedModules };
        });
      });

      // Return the updated data for immediate use if needed
      return { status: moduleStatus, notes: progressNotes };

    } catch (error) {
      console.error('Failed to load module data:', error);
      return null;
    }
  };

  // Mobile responsive check
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  // --- Study Mode Handlers ---

  const handleAnalyze = async (selectedTopic: string) => {
    // Clear previous state
    setAssessmentQuestions([]);
    setAssessmentResult(null);
    setGeneratedCourse(null);
    setExistingSubjectMatch(undefined);

    setTopic(selectedTopic);
    setLoadingMessage(`Analyzing your knowledge of ${selectedTopic}...`);
    setStep('assessment');

    // Check for existing subject
    const match = items.find(item => item.title.toLowerCase().includes(selectedTopic.toLowerCase()) || selectedTopic.toLowerCase().includes(item.title.toLowerCase()));
    if (match) {
      setExistingSubjectMatch(match);
    }

    try {
      const res = await apiClient.assessSkill(selectedTopic, chatHistory.length > 0 ? chatHistory : undefined);
      if (res.success && res.data) {
        setAssessmentQuestions(res.data.questions);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssessmentComplete = async (result: AssessmentResult) => {
    setAssessmentResult(result);
    setStep('result');
  };

  const handleGenerateCourse = async () => {
    if (!assessmentResult) return;

    setLoadingMessage('Designing your custom curriculum...');
    // Show loading state temporarily if needed, but we can just use the loading message in a loading component
    // For now, let's switch to a loading view or just show loading overlay
    // We'll reuse the LoadingState component by temporarily setting step to a loading state if we had one, 
    // or just conditionally rendering. 
    // Let's add a 'loading' step to the type or just use a flag.
    // For simplicity, I'll add a 'loading' step to the state type in the next refactor, 
    // but here I'll just set step to 'curriculum' and let it show loading if generatedCourse is null.
    setGeneratedCourse(null);
    setStep('curriculum');

    try {
      const res = await apiClient.generateCurriculum(topic, { score: assessmentResult.score, weakAreas: assessmentResult.weakAreas }, chatHistory.length > 0 ? chatHistory : undefined);
      if (res.success && res.data) {
        const courseData: Course = {
          title: res.data.subject.name,
          description: res.data.subject.description,
          modules: res.data.modules
        };
        setGeneratedCourse(courseData);

        // Refresh sidebar to show new course
        fetchVaultData();
      }
    } catch (e) {
      console.error(e);
      setStep('result'); // Go back on error
    }
  };

  const handleContinueExisting = () => {
    if (existingSubjectMatch) {
      setSelectedItem(existingSubjectMatch);
      setViewMode('vault');
      // Optionally expand sidebar item
    }
  };

  const handleRegenerate = () => {
    handleGenerateCourse();
  };

  const handleChatAboutCourse = () => {
    setIsChatOpen(true);
    // Ideally set context for chat
  };

  const handleStartCourse = () => {
    if (generatedCourse && generatedCourse.modules.length > 0) {
      setCurrentModule(generatedCourse.modules[0]);
      setStep('module');
    }
  };

  const handleModuleComplete = async (sessionData: any) => {
    setStep('curriculum');
  };

  // --- Vault Actions ---
  const handleVaultAction = (action: string, data?: any) => {
    if (action === 'start_module') {
      setViewMode('study');
      setCurrentModule(data);
      setStep('module');
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        await apiClient.deleteLearningSubject(subjectId);
        setItems(prev => prev.filter(item => item.id !== subjectId));
        if (selectedItem?.id === subjectId) {
          setSelectedItem(null);
          setViewMode('study');
          setStep('input');
        }
      } catch (error) {
        console.error('Failed to delete subject', error);
        alert('Failed to delete course');
      }
    }
  };

  // --- Render Content Area based on Mode ---
  const renderContent = () => {
    if (viewMode === 'vault') {
      return <VaultContent selectedItem={selectedItem} onAction={handleVaultAction} viewMode="vault" onSelect={setSelectedItem} />;
    }

    // Study Mode Content
    if (step === 'input') return <SkillInput onAnalyze={handleAnalyze} />;
    if (step === 'assessment') {
      if (assessmentQuestions.length === 0) return <LoadingState message={loadingMessage} />;
      return <Assessment topic={topic} questions={assessmentQuestions} onComplete={handleAssessmentComplete} />;
    }
    if (step === 'result') {
      if (!assessmentResult) return <div>Error: No result</div>;
      return (
        <AssessmentResultView
          result={assessmentResult}
          topic={topic}
          existingSubject={existingSubjectMatch}
          onGenerate={handleGenerateCourse}
          onContinue={handleContinueExisting}
        />
      );
    }
    if (step === 'curriculum') {
      if (!generatedCourse) return <LoadingState message={loadingMessage} />;
      return (
        <CurriculumPreview
          course={generatedCourse}
          onStart={handleStartCourse}
          onRegenerate={handleRegenerate}
          onChat={handleChatAboutCourse}
        />
      );
    }
    if (step === 'module') {
      if (!currentModule) return <div>Error: No module selected</div>;
      return <ModulePlayer module={currentModule} onBack={() => setStep('curriculum')} onComplete={handleModuleComplete} />;
    }

    return <div>Unknown step</div>;
  };

  const handleNotesUpdated = (moduleId: string, newNotes: string) => {
    // Update items state
    setItems(prevItems => {
      return prevItems.map(subject => {
        if (!subject.children) return subject;

        const updatedModules = subject.children.map(module => {
          if (module.id === moduleId) {
            // Update module data
            const updatedModuleData = { ...module.data, notes: newNotes };

            // Update children (notes file)
            const updatedChildren = module.children?.map(child => {
              if (child.id === `${moduleId}-practice`) {
                return {
                  ...child,
                  data: { ...child.data, content: newNotes, notes: newNotes }
                };
              }
              return child;
            });

            const updatedModule: VaultItem = {
              ...module,
              data: updatedModuleData,
              children: updatedChildren
            };
            return updatedModule;
          }
          return module;
        });
        return { ...subject, children: updatedModules };
      });
    });

    // Update selected item if it matches
    if (selectedItem) {
      if (selectedItem.id === moduleId) {
        setSelectedItem(prev => prev ? { ...prev, data: { ...prev.data, notes: newNotes } } : null);
      } else if (selectedItem.id === `${moduleId}-practice`) {
        setSelectedItem(prev => prev ? { ...prev, data: { ...prev.data, content: newNotes, notes: newNotes } } : null);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100dvh-160px)] md:h-[calc(100vh-100px)] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 relative">

        {/* Sidebar */}
        <VaultSidebar
          items={items}
          onSelect={async (item) => {
            setSelectedItem(item);

            // Lazy load data if needed
            if (item.type === 'module' || (item.type === 'note' && item.id.endsWith('-practice'))) {
              const moduleId = item.type === 'module' ? item.id : item.data.id;
              // Check if we need to load (simplified check, ideally check isLoaded flag from item)
              // Since item comes from state, we can check data.isLoaded
              if (item.data && !item.data.isLoaded) {
                const loadedData = await loadModuleData(moduleId);
                // Update the selected item with loaded data so the view updates immediately
                if (loadedData) {
                  setSelectedItem(prev => prev ? {
                    ...prev,
                    data: { ...prev.data, ...loadedData, isLoaded: true }
                  } : null);
                }
              }
            }

            if (item.type !== 'subject') {
              setViewMode('vault');
            }
          }}
          selectedId={selectedItem?.id}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onDelete={handleDeleteSubject} // Pass delete handler
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white relative">
          {/* Toolbar */}
          <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-white">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
              <div className="text-sm text-slate-500 breadcrumbs">
                {viewMode === 'study' ? (
                  <span className="font-medium text-slate-800">Study Session</span>
                ) : (
                  selectedItem ? (
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{selectedItem.title}</span>
                    </span>
                  ) : (
                    <span>Select a file</span>
                  )
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {viewMode === 'study' && (
                <button
                  onClick={() => setStep('input')}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  Create Course
                </button>
              )}

              {/* Only show global AI Assistant if NOT in module player (which has its own chat) */}
              {!(viewMode === 'study' && step === 'module') && (
                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${isChatOpen ? 'bg-purple-100 text-purple-700' : 'hover:bg-slate-100 text-slate-600'
                    }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden md:inline">AI Assistant</span>
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
              </div>
            ) : (
              viewMode === 'vault' ? (
                <VaultContent
                  selectedItem={selectedItem}
                  onAction={handleVaultAction}
                  viewMode="vault"
                  onSelect={setSelectedItem}
                />
              ) : (
                renderContent()
              )
            )}
          </div>
        </div>

        {/* Chat Sidebar (Right) */}
        <VaultChat
          contextItem={selectedItem}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onNotesUpdated={handleNotesUpdated}
        />

      </div>
    </DashboardLayout>
  );
};

export default Learning;