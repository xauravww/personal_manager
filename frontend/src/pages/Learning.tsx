import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BookOpen, Brain, Target, Zap, ChevronRight, CheckCircle,
  Play, Clock, Award, ArrowRight, Sparkles, Layout, Search,
  MessageSquare, BarChart3, ChevronLeft, Send, RefreshCw,
  GraduationCap, FileText, Video, Link as LinkIcon, Lock, Unlock,
  Archive, Trash2, AlertTriangle, X, Menu, PanelLeft
} from 'lucide-react';
import { apiClient } from '../api/client';
import LayoutComponent from '../components/Layout';
import ReactMarkdown from 'react-markdown';
import VaultSidebar, { VaultItem } from '../components/vault/VaultSidebar';
import VaultContent from '../components/vault/VaultContent';
import VaultChat from '../components/vault/VaultChat';
import KnowledgeGraph from '../components/learning/KnowledgeGraph';

// --- Types ---
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

// --- Components ---

const LoadingState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <div className="relative w-24 h-24 mb-8">
      <div className="absolute inset-0 border-4 border-starlight-100/10 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-neon-blue rounded-full border-t-transparent animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Brain className="w-8 h-8 text-neon-blue animate-pulse" />
      </div>
    </div>
    <h3 className="text-xl font-semibold text-starlight-100 mb-2">{message}</h3>
    <p className="text-starlight-400 max-w-md">Our AI is analyzing your request and structuring your personalized learning path...</p>
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
        <h1 className="text-3xl md:text-5xl font-extralight text-starlight-100 mb-4 md:mb-6 tracking-tight font-display">
          What do you want to <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple font-semibold">master today?</span>
        </h1>
        <p className="text-lg md:text-xl text-starlight-400 leading-relaxed">
          Your AI Study Partner will assess your current level, identify gaps, and build a custom curriculum just for you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-neon-blue to-neon-purple rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
        <div className="relative flex items-center bg-void-900 rounded-2xl p-2 shadow-xl border border-starlight-100/10">
          <div className="pl-4 md:pl-6 pr-2 md:pr-4">
            <Search className="w-5 h-5 md:w-6 md:h-6 text-starlight-500" />
          </div>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., React Hooks, Astrophysics..."
            className="flex-1 py-3 md:py-4 text-base md:text-xl text-starlight-100 placeholder-starlight-600 bg-transparent border-none focus:ring-0 focus:outline-none min-w-0"
            autoFocus
          />
          <button
            type="submit"
            disabled={!topic.trim()}
            className="bg-neon-blue text-white px-4 md:px-8 py-2 md:py-3 rounded-xl font-semibold hover:bg-neon-blue/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm md:text-base whitespace-nowrap shadow-lg shadow-neon-blue/20"
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
            className="p-3 md:p-4 bg-void-900 rounded-xl border border-starlight-100/10 hover:border-neon-blue/50 hover:bg-void-800 hover:shadow-lg hover:shadow-neon-blue/5 transition-all text-left group"
          >
            <span className="text-sm font-semibold text-starlight-400 group-hover:text-starlight-100">{suggestion}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

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
        weakAreas.push(q.question);
      }
    });

    const score = Math.round((correct / questions.length) * 100);
    onComplete({ score, weakAreas });
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (!questions || questions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-24 px-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
        <p className="text-starlight-400">Loading assessment questions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-starlight-100 font-display">Skill Assessment: <span className="text-neon-blue">{topic}</span></h2>
          <span className="text-sm font-medium text-starlight-500">Question {currentQuestion + 1} of {questions.length}</span>
        </div>
        <div className="h-2 bg-void-800 rounded-full overflow-hidden">
          <div className="h-full bg-neon-blue transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="bg-void-900 rounded-2xl shadow-xl border border-starlight-100/10 p-8 mb-8">
        <h3 className="text-xl font-medium text-starlight-100 mb-8 leading-relaxed">
          {questions[currentQuestion].question}
        </h3>

        <div className="space-y-4">
          {questions[currentQuestion].options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              className={`w-full p-5 rounded-xl text-left border transition-all flex items-center justify-between group ${answers[currentQuestion] === idx
                ? 'border-neon-blue bg-neon-blue/10 text-neon-blue shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                : 'border-starlight-100/10 hover:border-starlight-100/30 hover:bg-void-800 text-starlight-300'
                }`}
            >
              <span className="font-medium">{option}</span>
              {answers[currentQuestion] === idx && (
                <CheckCircle className="w-5 h-5 text-neon-blue" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={() => setCurrentQuestion(curr => Math.max(0, curr - 1))}
          disabled={currentQuestion === 0}
          className="text-starlight-500 hover:text-starlight-100 font-medium disabled:opacity-30 transition-colors"
        >
          Previous
        </button>

        {currentQuestion === questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={answers.includes(-1)}
            className="bg-neon-blue text-white px-8 py-3 rounded-xl font-semibold hover:bg-neon-blue/90 transition-all disabled:opacity-50 shadow-lg shadow-neon-blue/20"
          >
            Complete Assessment
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestion(curr => Math.min(questions.length - 1, curr + 1))}
            className="bg-starlight-100 text-void-950 px-8 py-3 rounded-xl font-semibold hover:bg-white transition-all shadow-lg shadow-starlight-100/10"
          >
            Next Question
          </button>
        )}
      </div>
    </div>
  );
};

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
        <div className="inline-flex items-center justify-center w-20 h-20 bg-neon-blue/10 text-neon-blue rounded-full mb-6 border border-neon-blue/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
          <Award className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-extralight text-starlight-100 mb-2 font-display tracking-tight">Assessment Complete!</h2>
        <p className="text-starlight-400">You scored <span className="font-semibold text-neon-blue text-xl">{result.score}%</span> on {topic}.</p>
      </div>

      <div className="bg-void-900 rounded-2xl shadow-xl border border-starlight-100/10 p-8 mb-8 text-left">
        <h3 className="font-semibold text-starlight-100 mb-4">Analysis</h3>
        {result.score > 80 ? (
          <p className="text-starlight-300 mb-4">You have a strong grasp of the fundamentals! We'll tailor the course to focus on advanced concepts and practical applications.</p>
        ) : result.score > 50 ? (
          <p className="text-starlight-300 mb-4">You have a good foundation. We'll reinforce core concepts while introducing new material to help you master the subject.</p>
        ) : (
          <p className="text-starlight-300 mb-4">This is a great starting point! We'll build your knowledge from the ground up with clear explanations and hands-on practice.</p>
        )}

        {result.weakAreas.length > 0 && (
          <div className="mt-6 pt-6 border-t border-starlight-100/10">
            <h4 className="text-sm font-semibold text-starlight-500 uppercase tracking-wider mb-3">Areas to Focus On</h4>
            <div className="space-y-3">
              {result.weakAreas.map((area, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-semibold mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-sm text-starlight-200 leading-relaxed flex-1">{area}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {existingSubject && (
        <div className="bg-neon-blue/10 rounded-xl p-6 mb-8 border border-neon-blue/20">
          <div className="flex items-start gap-4 text-left">
            <div className="p-2 bg-neon-blue/20 rounded-lg text-neon-blue">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-starlight-100 mb-1">Existing Course Found</h4>
              <p className="text-sm text-starlight-400 mb-3">You already have a course related to "{existingSubject.title}". Would you like to continue that instead?</p>
              <button
                onClick={onContinue}
                className="text-neon-blue font-semibold text-sm hover:text-neon-blue/80 transition-colors"
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
          className="bg-neon-blue text-white px-8 py-3 rounded-xl font-semibold hover:bg-neon-blue/90 transition-all shadow-lg shadow-neon-blue/20 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Generate Custom Course
        </button>
        {existingSubject && (
          <button
            onClick={onContinue}
            className="px-8 py-3 rounded-xl font-semibold border border-starlight-100/10 hover:bg-void-800 transition-all text-starlight-300"
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
        <div className="inline-flex items-center justify-center p-3 bg-neon-green/10 text-neon-green rounded-full mb-6 border border-neon-green/20 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-3xl md:text-4xl font-extralight text-starlight-100 mb-4 font-display tracking-tight">Your Custom Curriculum is Ready</h2>
        <p className="text-xl text-starlight-400 max-w-2xl mx-auto">
          Based on your assessment, we've designed this path to take you from your current level to mastery.
        </p>
      </div>

      <div className="bg-void-900 rounded-2xl shadow-xl border border-starlight-100/10 overflow-hidden mb-8">
        <div className="p-8 border-b border-starlight-100/10 bg-void-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-starlight-100 mb-2 font-display">{course.title}</h3>
            <p className="text-starlight-400">{course.description}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRegenerate}
              className="p-2 text-starlight-500 hover:bg-void-800 hover:text-starlight-100 rounded-lg transition-colors tooltip"
              title="Regenerate Curriculum"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={onChat}
              className="p-2 text-neon-blue hover:bg-neon-blue/10 rounded-lg transition-colors tooltip"
              title="Chat about this course"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="divide-y divide-starlight-100/5">
          {course.modules.map((module, idx) => (
            <div key={idx} className="p-6 hover:bg-void-800/50 transition-colors flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-neon-blue/10 text-neon-blue rounded-lg flex items-center justify-center font-semibold border border-neon-blue/20">
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-semibold text-starlight-100">{module.title}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${module.difficulty === 'beginner' ? 'bg-neon-green/10 text-neon-green border border-neon-green/20' :
                    module.difficulty === 'intermediate' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' :
                      'bg-red-400/10 text-red-400 border border-red-400/20'
                    }`}>
                    {module.difficulty}
                  </span>
                </div>
                <p className="text-starlight-400 text-sm mb-3">{module.description}</p>
                <div className="flex items-center gap-4 text-xs text-starlight-500">
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
          className="bg-neon-blue text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-neon-blue/90 transition-all shadow-lg shadow-neon-blue/20 transform hover:-translate-y-1 flex items-center gap-3"
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

  const handleSend = useCallback(async (textInput?: string) => {
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
  }, [input, isCodeMode, module.id, messages, currentCheckpointIndex, checkpoints]);


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
    <div className="flex h-full bg-void-900 rounded-2xl shadow-xl overflow-hidden border border-starlight-100/10 relative">
      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div
          className="absolute inset-0 bg-void-950/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        absolute inset-y-0 left-0 z-50 w-80 bg-void-900 border-r border-starlight-100/10 p-6 flex flex-col transition-transform duration-300
        md:relative md:translate-x-0
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="flex items-center text-starlight-500 hover:text-starlight-100 transition-colors">
            <ChevronLeft className="w-5 h-5 mr-1" /> Back
          </button>
          <button
            onClick={() => setShowMobileSidebar(false)}
            className="md:hidden p-2 text-starlight-500 hover:bg-void-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-8">
          <h3 className="font-semibold text-starlight-100 text-lg mb-2">{module.title}</h3>
          <div className="flex items-center gap-2 text-sm text-starlight-500">
            <Clock className="w-4 h-4" /> {module.estimated_time} mins
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <h4 className="text-xs font-semibold text-starlight-600 uppercase tracking-wider mb-4">Checkpoints</h4>
          <ul className="space-y-3">
            {checkpoints.length > 0 ? checkpoints.map((cp: any, i: number) => (
              <li key={i} className={`flex items-center gap-3 text-sm ${i === currentCheckpointIndex ? 'text-neon-blue font-medium' : 'text-starlight-400'}`}>
                <div className={`w-2 h-2 rounded-full ${i === currentCheckpointIndex ? 'bg-neon-blue shadow-[0_0_8px_rgba(59,130,246,0.5)]' : i < currentCheckpointIndex ? 'bg-neon-green' : 'bg-void-700'}`}></div>
                {cp.title}
                {i === currentCheckpointIndex && masteryAchieved && <CheckCircle className="w-4 h-4 text-neon-green ml-auto" />}
              </li>
            )) : (
              <li className="text-starlight-600 italic">No checkpoints defined</li>
            )}
          </ul>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-void-900/50">
        <div className="md:hidden p-4 border-b border-starlight-100/10 flex items-center justify-between bg-void-900">
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="p-2 -ml-2 text-starlight-400 hover:bg-void-800 rounded-lg flex items-center gap-2"
          >
            <Menu className="w-5 h-5" />
            <span className="text-sm font-medium">Checkpoints</span>
          </button>
          <span className="text-sm font-semibold text-starlight-100 truncate max-w-[150px]">{module.title}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" ref={scrollRef}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-2xl rounded-2xl p-5 ${msg.role === 'user'
                ? 'bg-neon-blue/10 text-starlight-100 border border-neon-blue/20'
                : 'bg-void-800 text-starlight-200 border border-starlight-100/5'
                }`}>
                <div className={`prose prose-invert prose-sm max-w-none ${msg.role === 'user' ? 'text-starlight-100' : 'text-starlight-300'}`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
              {msg.quiz && (
                <div className="mt-4 max-w-2xl w-full bg-void-900 rounded-xl p-4 border border-starlight-100/10 shadow-lg">
                  <div className="flex items-center gap-2 mb-3 text-neon-purple font-semibold">
                    <div className="p-1 bg-neon-purple/10 rounded-lg"><Brain className="w-4 h-4" /></div>
                    Quiz Time
                  </div>
                  <p className="text-starlight-100 font-medium mb-4">{msg.quiz.question}</p>
                  <div className="space-y-2">
                    {msg.quiz.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(`I choose: ${option}`)}
                        className="w-full text-left p-3 rounded-lg border border-starlight-100/10 hover:border-neon-purple/50 hover:bg-neon-purple/5 transition-all text-sm text-starlight-300 hover:text-starlight-100"
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
                    className="w-full py-3 bg-neon-blue text-white font-semibold rounded-xl hover:bg-neon-blue/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-neon-blue/20"
                  >
                    <Unlock className="w-5 h-5" /> Proceed to Next Topic <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
              {msg.action === 'complete_module' && (
                <div className="mt-4">
                  <button
                    onClick={handleModuleComplete}
                    className="w-full py-3 bg-neon-green text-void-950 font-semibold rounded-xl hover:bg-neon-green/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-neon-green/20"
                  >
                    <CheckCircle className="w-5 h-5" /> Complete Module
                  </button>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start">
              <div className="max-w-xs rounded-2xl p-4 bg-void-800 text-starlight-200 border border-starlight-100/5">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-neon-blue rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-neon-blue rounded-full animate-bounce delay-200"></div>
                  <div className="w-2 h-2 bg-neon-blue rounded-full animate-bounce delay-300"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-void-900 border-t border-starlight-100/10">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your answer or ask a question..."
              className="w-full pl-4 pr-12 py-3 bg-void-950 border border-starlight-100/10 rounded-xl focus:outline-none focus:border-neon-blue/50 text-starlight-100 placeholder-starlight-600 transition-all"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="absolute right-2 top-2 p-1.5 bg-neon-blue text-white rounded-lg hover:bg-neon-blue/90 disabled:opacity-50 transition-colors shadow-lg shadow-neon-blue/20"
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
  const [viewMode, setViewMode] = useState<'study' | 'vault' | 'graph'>('study');
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State for Study Mode Logic
  const [step, setStep] = useState<'input' | 'assessment' | 'result' | 'curriculum' | 'module' | 'loading'>('input');
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
  const fetchVaultData = useCallback(async () => {
    try {
      if (items.length === 0) setIsLoading(true);
      console.log('Fetching vault data...');

      const subjectsRes = await apiClient.getLearningSubjects();
      console.log('Subjects response:', subjectsRes);

      if (subjectsRes.success && subjectsRes.data) {
        const subjects = subjectsRes.data;

        const tree: VaultItem[] = await Promise.all(subjects.map(async (subject: any) => {
          const modulesRes = await apiClient.getLearningModules(subject.id);
          const modules = modulesRes.data?.modules || [];

          const children: VaultItem[] = modules.map((m: any) => {
            const moduleNotes: VaultItem[] = [
              {
                id: `${m.id}-practice`,
                title: 'Learning Notes.md',
                type: 'note',
                data: {
                  id: m.id,
                  title: 'Learning Notes',
                  content: 'Loading notes...',
                  status: 'unknown',
                  notes: '',
                  isLoaded: false
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

        console.log('Built vault tree:', tree);
        setItems(tree);
      } else {
        console.error('Failed to fetch subjects:', subjectsRes.error);
      }
    } catch (error) {
      console.error("Failed to fetch vault data", error);
    } finally {
      setIsLoading(false);
    }
  }, [items.length]);

  useEffect(() => {
    fetchVaultData();
  }, []);

  // --- Handlers ---

  const handleAnalyze = async (inputTopic: string) => {
    setTopic(inputTopic);
    setLoadingMessage(`Analyzing "${inputTopic}"...`);
    setStep('loading');

    const match = items.find(item => item.title.toLowerCase().includes(inputTopic.toLowerCase()));
    if (match) {
      setExistingSubjectMatch(match);
    } else {
      setExistingSubjectMatch(undefined);
    }

    try {
      const response = await apiClient.assessSkill(inputTopic);
      if (response.success && response.data) {
        setAssessmentQuestions(response.data.questions);
        setStep('assessment');
      }
    } catch (error) {
      console.error("Failed to generate assessment", error);
    } finally {
      setLoadingMessage('');
    }
  };

  const handleAssessmentComplete = (result: AssessmentResult) => {
    setAssessmentResult(result);
    setStep('result');
  };

  const handleGenerateCourse = async () => {
    setLoadingMessage('Designing your custom curriculum...');
    setStep('loading');

    try {
      const response = await apiClient.generateCurriculum(
        topic,
        {
          score: assessmentResult?.score || 0,
          weakAreas: assessmentResult?.weakAreas || []
        }
      );

      if (response.success && response.data) {
        setGeneratedCourse(response.data);
        setStep('curriculum');
      }
    } catch (error) {
      console.error("Failed to generate curriculum", error);
    } finally {
      setLoadingMessage('');
    }
  };

  const handleStartLearning = async () => {
    if (!generatedCourse) return;

    // Validate required fields
    if (!generatedCourse.title || !generatedCourse.description) {
      console.error('Generated course is missing required fields:', generatedCourse);
      setLoadingMessage('');
      return;
    }

    setLoadingMessage('Setting up your learning environment...');
    setStep('loading');

    try {
      const response = await apiClient.createLearningPath({
        title: generatedCourse.title,
        description: generatedCourse.description,
        modules: generatedCourse.modules || []
      });

      if (response.success) {
        await fetchVaultData();

        const createdModules = response.data.modules;
        if (createdModules && createdModules.length > 0) {
          setCurrentModule(createdModules[0]);
          setStep('module');
        }
      }
    } catch (error) {
      console.error("Failed to create learning path", error);
    } finally {
      setLoadingMessage('');
    }
  };

  const handleContinueExisting = () => {
    if (existingSubjectMatch) {
      setViewMode('vault');
      setSelectedItem(existingSubjectMatch);
      setStep('input');
    }
  };

  const handleModuleComplete = async (sessionData: any) => {
    if (currentModule?.id) {
      try {
        await apiClient.updateModuleProgress(currentModule.id, {
          status: 'completed',
          sessionData
        });
      } catch (error) {
        console.error("Failed to save progress", error);
      }
    }

    setViewMode('vault');
    setStep('input');
    fetchVaultData();
  };

  // --- Render ---

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-starlight-100/10 bg-void-900/50 backdrop-blur-sm flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-starlight-400 hover:text-starlight-100 hover:bg-void-800 rounded-lg transition-colors"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-starlight-100 font-display">
              {viewMode === 'study' ? 'Learning Center' : viewMode === 'graph' ? 'Knowledge Graph' : 'My Vault'}
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-void-950 p-1 rounded-lg border border-starlight-100/10">
            <button
              onClick={() => setViewMode('study')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'study'
                ? 'bg-neon-blue text-white shadow-lg shadow-neon-blue/20'
                : 'text-starlight-400 hover:text-starlight-100 hover:bg-void-800'
                }`}
            >
              Study
            </button>
            <button
              onClick={() => setViewMode('vault')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'vault'
                ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/20'
                : 'text-starlight-400 hover:text-starlight-100 hover:bg-void-800'
                }`}
            >
              Vault
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'graph'
                ? 'bg-neon-green text-void-950 shadow-lg shadow-neon-green/20'
                : 'text-starlight-400 hover:text-starlight-100 hover:bg-void-800'
                }`}
            >
              Graph
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-hidden relative">
          {viewMode === 'study' ? (
            <div className="h-full overflow-y-auto custom-scrollbar">
              {step === 'input' && <SkillInput onAnalyze={handleAnalyze} />}
              {step === 'assessment' && (
                <Assessment
                  topic={topic}
                  questions={assessmentQuestions}
                  onComplete={handleAssessmentComplete}
                />
              )}
              {step === 'result' && assessmentResult && (
                <AssessmentResultView
                  result={assessmentResult}
                  topic={topic}
                  existingSubject={existingSubjectMatch}
                  onGenerate={handleGenerateCourse}
                  onContinue={handleContinueExisting}
                />
              )}
              {step === 'curriculum' && generatedCourse && (
                <CurriculumPreview
                  course={generatedCourse}
                  onStart={handleStartLearning}
                  onRegenerate={() => handleAnalyze(topic)}
                  onChat={() => {
                    setIsChatOpen(true);
                    setViewMode('vault');
                  }}
                />
              )}
              {step === 'module' && currentModule && (
                <ModulePlayer
                  module={currentModule}
                  onBack={() => {
                    // Smart navigation: return to vault if opened from vault, otherwise to curriculum
                    if (generatedCourse && generatedCourse.modules) {
                      // Opened from study flow - return to curriculum
                      setStep('curriculum');
                    } else {
                      // Opened from vault - return to vault view
                      setViewMode('vault');
                      setStep('input');
                    }
                  }}
                  onComplete={handleModuleComplete}
                />
              )}

              {/* Loading Overlay */}
              {(step === 'loading' || (step === 'assessment' && assessmentQuestions.length === 0)) && (
                <div className="absolute inset-0 bg-void-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
                  <LoadingState message={loadingMessage || "Preparing..."} />
                </div>
              )}
            </div>
          ) : viewMode === 'graph' ? (
            <div className="h-full p-6">
              <KnowledgeGraph
                onNodeClick={(node) => console.log('Clicked node:', node)}
                onNavigate={(node) => {
                  console.log('Navigating to node:', node);
                  if (node.type === 'subject') {
                    const subjectItem = items.find(item => item.id === node.id && item.type === 'subject');
                    if (subjectItem) {
                      setViewMode('vault');
                      setSelectedItem(subjectItem);
                    } else {
                      console.warn('Subject not found in items:', node.id);
                    }
                  } else if (node.type === 'module') {
                    // Ensure node.data has necessary module fields
                    if (node.data && node.data.title) {
                      setCurrentModule(node.data);
                      setViewMode('study');
                      setStep('module');
                    } else {
                      console.warn('Module data incomplete:', node.data);
                    }
                  } else {
                    console.log('Unknown node type for navigation:', node.type);
                  }
                }}
              />
            </div>
          ) : (
            <div className="h-full flex relative">
              {/* Vault Sidebar */}
              <div className={`
                  ${isSidebarOpen ? 'w-80' : 'w-0'} flex-shrink-0 bg-void-900 border-r border-starlight-100/10 overflow-hidden transition-all duration-300 ease-in-out flex flex-col
                `}>
                <VaultSidebar
                  items={items}
                  onSelect={setSelectedItem}
                  selectedItem={selectedItem}
                />
              </div>

              {/* Sidebar Toggle Button (when closed) */}
              {!isSidebarOpen && (
                <div className="absolute left-0 top-6 z-20">
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 bg-void-900 rounded-r-lg border-y border-r border-starlight-100/10 text-starlight-500 hover:text-neon-blue hover:bg-void-800 transition-colors shadow-lg"
                    title="Open Sidebar"
                  >
                    <PanelLeft className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Vault Content / Chat */}
              <div className="flex-1 bg-void-900 overflow-hidden flex flex-col relative">
                <div className="h-14 border-b border-starlight-100/10 flex items-center justify-between px-6 bg-void-900/50">
                  <div className="flex items-center gap-3">
                    {isSidebarOpen && (
                      <button onClick={() => setIsSidebarOpen(false)} className="mr-2 text-starlight-500 hover:text-starlight-100" title="Close Sidebar">
                        <PanelLeft className="w-4 h-4" />
                      </button>
                    )}
                    <h3 className="font-semibold text-starlight-100">
                      {selectedItem ? selectedItem.title : 'Vault Browser'}
                    </h3>
                  </div>
                  {selectedItem && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsChatOpen(prev => !prev)}
                        className={`p-2 rounded-lg transition-colors ${isChatOpen ? 'bg-neon-blue text-white' : 'text-starlight-500 hover:text-starlight-100 hover:bg-void-800'}`}
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setSelectedItem(null)}
                        className="p-2 text-starlight-500 hover:text-red-400 hover:bg-void-800 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex overflow-hidden">
                  {/* Content View */}
                  <div className={`flex-1 overflow-y-auto custom-scrollbar transition-all duration-300 ${isChatOpen ? 'w-1/2 md:w-2/3' : 'w-full'}`}>
                    {selectedItem ? (
                      <VaultContent
                        selectedItem={selectedItem}
                        viewMode={viewMode}
                        onAction={(action, data) => {
                          if (action === 'start_module') {
                            // Handle start module
                            setCurrentModule(data);
                            setViewMode('study');
                            setStep('module');
                          } else if (action === 'update_note') {
                            // Handle note update if needed
                            console.log('Update note:', data);
                          }
                        }}
                      />
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-starlight-500 p-8 h-full">
                        <div className="w-16 h-16 bg-void-800 rounded-full flex items-center justify-center mb-4 border border-starlight-100/10">
                          <Archive className="w-8 h-8 text-starlight-600" />
                        </div>
                        <p className="font-medium">Select an item from the library to view</p>
                        <p className="text-sm text-starlight-600 mt-1">Courses, Modules, and Notes are stored here.</p>
                      </div>
                    )}
                  </div>

                  {/* Chat Sidebar */}
                  {isChatOpen && selectedItem && (
                    <div className="w-full md:w-1/3 border-l border-starlight-100/10 flex-shrink-0 bg-void-950/50">
                      <VaultChat initialQuery={`Chat about ${selectedItem.title}`} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Learning;