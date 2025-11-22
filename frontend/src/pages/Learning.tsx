import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BookOpen, Brain, Target, Zap, ChevronRight, CheckCircle,
  Play, Clock, Award, ArrowRight, Sparkles, Layout, Search,
  MessageSquare, BarChart3, ChevronLeft, Send, RefreshCw,
  GraduationCap, FileText, Video, Link as LinkIcon, Lock, Unlock,
  Archive, Trash2, AlertTriangle
} from 'lucide-react';
import { apiClient } from '../api/client';
import DashboardLayout from '../components/layout/DashboardLayout';
import ReactMarkdown from 'react-markdown';

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
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
          What do you want to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">master today?</span>
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          Your AI Study Partner will assess your current level, identify gaps, and build a custom curriculum just for you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
        <div className="relative flex items-center bg-white rounded-2xl p-2 shadow-xl border border-slate-100">
          <div className="pl-6 pr-4">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., React Hooks, Astrophysics, Digital Marketing..."
            className="flex-1 py-4 text-lg md:text-xl text-slate-900 placeholder-slate-400 bg-transparent border-none focus:ring-0 focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            disabled={!topic.trim()}
            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Start Journey
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Suggestions */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        {['Python Programming', 'Machine Learning', 'World History', 'Public Speaking'].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onAnalyze(suggestion)}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
          >
            <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600">{suggestion}</span>
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

    // Auto-advance after short delay
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(curr => curr + 1), 500);
    }
  };

  const handleSubmit = () => {
    // Calculate score
    let correct = 0;
    const weakAreas: string[] = [];

    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        correct++;
      } else {
        // Simple logic: assume question text implies the area
        weakAreas.push(`Concept related to: ${q.question.substring(0, 30)}...`);
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

const CurriculumPreview = ({ course, onStart }: { course: Course, onStart: () => void }) => {
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
        <div className="p-8 border-b border-slate-100 bg-slate-50">
          <h3 className="text-2xl font-bold text-slate-900 mb-2">{course.title}</h3>
          <p className="text-slate-600">{course.description}</p>
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

const KnowledgeGraph = ({ subjects }: { subjects: any[] }) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate nodes and links only when subjects change
  const { nodes, links } = useMemo(() => {
    const centerX = 400;
    const centerY = 300;
    const nodesList: any[] = [{ id: 'root', x: centerX, y: centerY, label: 'My Brain', type: 'root' }];
    const linksList: any[] = [];

    subjects.forEach((subject, i) => {
      const angle = (i / subjects.length) * 2 * Math.PI;
      const r = 200;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);

      // Only show if active
      if (subject.is_active !== false) {
        nodesList.push({ id: subject.id, x, y, label: subject.name, type: 'subject' });
        linksList.push({ source: 'root', target: subject.id });

        if (subject.modules) {
          subject.modules.forEach((mod: any, j: number) => {
            // Filter for completed modules if needed, or show all
            // For "Real Knowledge Graph", maybe we highlight completed ones?
            const subAngle = angle + ((j - subject.modules.length / 2) * 0.3);
            const subR = 350;
            const subX = centerX + subR * Math.cos(subAngle);
            const subY = centerY + subR * Math.sin(subAngle);

            nodesList.push({ id: mod.id, x: subX, y: subY, label: mod.title, type: 'module', status: 'completed' }); // Assuming completed for visual demo
            linksList.push({ source: subject.id, target: mod.id });
          });
        }
      }
    });
    return { nodes: nodesList, links: linksList };
  }, [subjects]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartPan({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-4 px-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-400" /> Knowledge Graph
        </h3>
        <div className="flex gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Subject</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Concept</span>
          <span className="text-slate-600 ml-2">(Drag to pan)</span>
        </div>
      </div>
      <div
        ref={containerRef}
        className="w-full h-[600px] bg-slate-950 rounded-xl relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <svg width="2000" height="2000" viewBox="0 0 2000 2000" className="absolute -top-[700px] -left-[600px]">
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="20" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#475569" />
              </marker>
            </defs>
            {links.map((link, i) => {
              const source = nodes.find(n => n.id === link.source);
              const target = nodes.find(n => n.id === link.target);
              if (!source || !target) return null;
              return (
                <line
                  key={i}
                  x1={source.x} y1={source.y}
                  x2={target.x} y2={target.y}
                  stroke="#334155"
                  strokeWidth="1"
                  markerEnd="url(#arrow)"
                />
              );
            })}
            {nodes.map((node, i) => (
              <g key={i} transform={`translate(${node.x},${node.y})`}>
                <circle
                  r={node.type === 'root' ? 30 : node.type === 'subject' ? 20 : 8}
                  fill={node.type === 'root' ? '#fff' : node.type === 'subject' ? '#3b82f6' : '#a855f7'}
                  className="transition-all hover:scale-110"
                />
                <text
                  y={node.type === 'root' ? 45 : node.type === 'subject' ? 35 : 20}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize={node.type === 'root' ? 14 : 12}
                  className="select-none font-medium"
                >
                  {node.label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Grid Background Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            transform: `translate(${offset.x}px, ${offset.y}px)`
          }}
        />
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

  // Track learning session data
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [codeSnippets, setCodeSnippets] = useState<any[]>([]);
  const [identifiedWeaknesses, setIdentifiedWeaknesses] = useState<string[]>([]);

  // Parse checkpoints if they are a string (from DB) or use as is
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
    // Initial greeting for the module or checkpoint
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

    // If in code mode, wrap in markdown code block if not already wrapped
    if (isCodeMode && !msgContent.startsWith('```')) {
      msgContent = `\`\`\`\n${msgContent}\n\`\`\``;
    }

    const userMsg: ChatMessage = { role: 'user', content: msgContent, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    // Reset code mode after sending
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
        // Add a system message celebrating mastery with the appropriate action button
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
    // Remove the action from the last message to prevent re-clicking
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
      setMasteryAchieved(false); // Reset mastery for next topic
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
    // Remove the action from the last message
    setMessages(prev => {
      const newMessages = [...prev];
      const lastMsgIndex = newMessages.findLastIndex(m => m.action === 'complete_module');
      if (lastMsgIndex !== -1) {
        newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], action: undefined };
      }
      return newMessages;
    });

    // Collect session data
    const sessionData = {
      chatHistory: messages,
      quizAttempts,
      identifiedWeaknesses,
      codeSnippets
    };

    onComplete(sessionData);
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      {/* Sidebar */}
      <div className="w-80 bg-slate-50 border-r border-slate-200 p-6 hidden md:flex flex-col">
        <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-900 mb-8 transition-colors">
          <ChevronLeft className="w-5 h-5 mr-1" /> Back to Course
        </button>

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
        <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-2xl rounded-2xl p-5 ${msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-800'
                }`}>
                {/* Message Content */}
                <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'text-white' : 'text-slate-700'}`}>
                  <ReactMarkdown
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');

                        // Helper to normalize code for comparison (ignore whitespace differences)
                        const normalize = (str: string) => str.replace(/\s+/g, '').trim();

                        // Check if this code block matches the structured snippet
                        const isDuplicate = !inline && msg.code &&
                          (normalize(String(children)) === normalize(msg.code.snippet) ||
                            normalize(String(children)).includes(normalize(msg.code.snippet.substring(0, 50))));

                        if (isDuplicate) {
                          return null; // Hide duplicate code block
                        }

                        return !inline && match ? (
                          <div className="rounded-lg overflow-hidden my-2 bg-slate-900">
                            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700">
                              <span className="text-xs text-slate-400 font-mono">{match[1]}</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(String(children))}
                                className="text-xs text-slate-400 hover:text-white uppercase tracking-wider"
                              >
                                Copy
                              </button>
                            </div>
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </div>
                        ) : (
                          <code className={`${inline ? 'bg-black/10 px-1 py-0.5 rounded font-mono text-sm' : ''}`} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Render Quiz if present */}
              {msg.quiz && (
                <div className="mt-4 max-w-2xl w-full bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3 text-purple-600 font-bold">
                    <div className="p-1 bg-purple-100 rounded-lg">
                      <Brain className="w-4 h-4" />
                    </div>
                    Quiz Time
                  </div>
                  <p className="text-slate-800 font-medium mb-4">{msg.quiz.question}</p>

                  {/* Quiz Code Snippet */}
                  {msg.quiz.codeSnippet && (
                    <div className="mb-4 bg-slate-900 rounded-lg overflow-hidden">
                      <div className="px-3 py-1.5 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                        <span className="text-xs text-slate-400 font-mono">Code Context</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(msg.quiz!.codeSnippet!)}
                          className="text-xs text-slate-400 hover:text-white uppercase tracking-wider"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="p-3 overflow-x-auto">
                        <pre className="text-xs font-mono text-blue-300">
                          <code>{msg.quiz.codeSnippet}</code>
                        </pre>
                      </div>
                    </div>
                  )}

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

              {/* Render Code Snippet if present */}
              {msg.code && (
                <div className="mt-4 max-w-2xl w-full bg-slate-900 rounded-xl overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                    <span className="text-xs text-slate-400 font-mono">{msg.code.language}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.code!.snippet);
                          // Could add a toast here
                        }}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Copy code"
                      >
                        <div className="flex items-center gap-1 text-xs">
                          <span className="uppercase tracking-wider">Copy</span>
                        </div>
                      </button>
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20"></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 overflow-x-auto">
                    <pre className="text-sm font-mono text-blue-300">
                      <code>{msg.code.snippet}</code>
                    </pre>
                  </div>
                </div>
              )}

              {/* Render Action Button */}
              {msg.action === 'next_topic' && (
                <div className="mt-4 animate-fadeIn">
                  <button
                    onClick={handleNextTopic}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                  >
                    <Unlock className="w-5 h-5" />
                    Proceed to Next Topic
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {msg.action === 'complete_module' && (
                <div className="mt-4 animate-fadeIn">
                  <button
                    onClick={handleModuleComplete}
                    className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                  >
                    <Award className="w-5 h-5" />
                    Complete Module
                  </button>
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="max-w-3xl mx-auto relative">
            {isCodeMode ? (
              <div className="relative">
                <div className="absolute -top-8 left-0 bg-slate-900 text-white text-xs px-2 py-1 rounded-t-lg flex items-center gap-2">
                  <FileText className="w-3 h-3" /> Code Mode
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleSend();
                    }
                  }}
                  placeholder="Paste or type your code here... (Ctrl+Enter to send)"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm h-40"
                />
                <button
                  onClick={() => setIsCodeMode(false)}
                  className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Switch to Text Mode"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask a question or answer the tutor..."
                  className="w-full p-4 pr-24 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    onClick={() => setIsCodeMode(true)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Switch to Code Mode"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
            <div className="text-center mt-2">
              <span className="text-xs text-slate-400">
                {isCodeMode ? 'Ctrl + Enter to send' : 'Press Enter to send'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Page Component ---

const Learning = () => {
  const [view, setView] = useState<'input' | 'assessment' | 'curriculum' | 'dashboard' | 'player' | 'graph'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [topic, setTopic] = useState('');
  const [assessmentQuestions, setAssessmentQuestions] = useState<Question[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [generatedCourse, setGeneratedCourse] = useState<Course | null>(null);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [prerequisiteData, setPrerequisiteData] = useState<{ hasPrerequisites: boolean; prerequisites: string[]; reason: string } | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'archive' | 'delete';
    subjectId: string;
    subjectName: string;
  } | null>(null);
  const [completedModulesModal, setCompletedModulesModal] = useState<{
    isOpen: boolean;
    subjectId: string;
    subjectName: string;
    modules: any[];
  } | null>(null);
  const [moduleSearch, setModuleSearch] = useState('');
  const [moduleSortBy, setModuleSortBy] = useState<'date' | 'title' | 'score'>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const modulesPerPage = 6;

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const res = await apiClient.getLearningSubjects();
      if (res.success && res.data) {
        // Fetch modules for each subject to populate graph
        const subjectsWithModules = await Promise.all(res.data.map(async (sub: any) => {
          const modRes = await apiClient.getLearningModules(sub.id);
          return { ...sub, modules: modRes.data?.modules || [] };
        }));
        setSubjects(subjectsWithModules);
      }
    } catch (err) {
      console.error("Failed to load subjects", err);
    }
  };

  const handleSkillAnalyze = async (inputTopic: string) => {
    setTopic(inputTopic);
    setLoading(true);
    setLoadingMessage(`Checking prerequisites for ${inputTopic}...`);

    try {
      const prereqRes = await apiClient.checkPrerequisites(inputTopic);
      if (prereqRes.success && prereqRes.data?.hasPrerequisites) {
        setPrerequisiteData(prereqRes.data);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("Prereq check skipped", e);
    }

    proceedToAssessment(inputTopic);
  };

  const proceedToAssessment = async (inputTopic: string) => {
    setLoading(true);
    setLoadingMessage(`Analyzing your knowledge of ${inputTopic}...`);

    try {
      const res = await apiClient.assessSkill(inputTopic);
      if (res.success && res.data) {
        setAssessmentQuestions(res.data.questions);
        setView('assessment');
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate assessment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssessmentComplete = async (result: AssessmentResult) => {
    setAssessmentResult(result);
    setLoading(true);
    setLoadingMessage(`Designing your custom ${topic} curriculum...`);

    try {
      const res = await apiClient.generateCurriculum(topic, result);

      if (res.success && res.data) {
        // Transform API response to Course type
        const courseData: Course = {
          title: res.data.subject.name,
          description: res.data.subject.description,
          modules: res.data.modules
        };
        setGeneratedCourse(courseData);
        setView('curriculum');
        loadSubjects(); // Refresh list
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate curriculum.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartCourse = () => {
    // In a real app, we might need to set the active course ID here
    // For now, we just go to dashboard or player
    setView('dashboard');
  };

  const handlePlayModule = (module: any) => {
    setActiveModule(module);
    setView('player');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingState message={loadingMessage} />
      </DashboardLayout>
    );
  }

  const handleModuleComplete = async (sessionData?: any) => {
    if (!activeModule?.id) return;

    try {
      const res = await apiClient.completeModule(activeModule.id, sessionData);
      if (res.success) {
        // Refresh subjects to update progress
        await loadSubjects();
        setShowCompletionModal(true);
      }
    } catch (error) {
      console.error("Failed to complete module", error);
      alert("Failed to complete module. Please try again.");
    }
  };

  return (
    <DashboardLayout>
      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl text-center transform transition-all scale-100">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Award className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Module Completed!</h3>
            <p className="text-slate-600 mb-8">
              Congratulations! You've mastered this module. Your progress has been saved.
            </p>
            <button
              onClick={() => {
                setShowCompletionModal(false);
                setView('dashboard');
              }}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl transform transition-all scale-100">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${confirmModal.type === 'delete' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
              }`}>
              {confirmModal.type === 'delete' ? <AlertTriangle className="w-8 h-8" /> : <Archive className="w-8 h-8" />}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">
              {confirmModal.type === 'delete' ? 'Delete Course?' : 'Archive Course?'}
            </h3>
            <p className="text-slate-600 mb-8 text-center">
              Are you sure you want to {confirmModal.type} <strong>{confirmModal.subjectName}</strong>?
              {confirmModal.type === 'delete' && <span className="block mt-2 text-red-500 text-sm">This action cannot be undone.</span>}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (confirmModal.type === 'delete') {
                    await apiClient.deleteSubject(confirmModal.subjectId);
                  } else {
                    await apiClient.archiveSubject(confirmModal.subjectId);
                  }
                  await loadSubjects();
                  setConfirmModal(null);
                }}
                className={`flex-1 py-3 text-white font-bold rounded-xl transition-all ${confirmModal.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Modules Modal */}
      {completedModulesModal && completedModulesModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{completedModulesModal.subjectName}</h2>
                  <p className="text-sm text-slate-500 mt-1">Completed Modules ({completedModulesModal.modules.length})</p>
                </div>
                <button
                  onClick={() => setCompletedModulesModal(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <span className="text-2xl text-slate-400">×</span>
                </button>
              </div>

              {/* Search and Sort */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search modules..."
                    value={moduleSearch}
                    onChange={(e) => {
                      setModuleSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={moduleSortBy}
                  onChange={(e) => setModuleSortBy(e.target.value as 'date' | 'title' | 'score')}
                  className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date">Sort by Date</option>
                  <option value="title">Sort by Title</option>
                  <option value="score">Sort by Score</option>
                </select>
              </div>
            </div>

            {/* Modules List */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
              {(() => {
                // Filter and sort modules
                let filteredModules = completedModulesModal.modules.filter((m: any) =>
                  m.title.toLowerCase().includes(moduleSearch.toLowerCase()) ||
                  m.description.toLowerCase().includes(moduleSearch.toLowerCase())
                );

                // Sort modules
                filteredModules.sort((a: any, b: any) => {
                  if (moduleSortBy === 'date') {
                    const dateA = a.progress?.[0]?.completed_at ? new Date(a.progress[0].completed_at).getTime() : 0;
                    const dateB = b.progress?.[0]?.completed_at ? new Date(b.progress[0].completed_at).getTime() : 0;
                    return dateB - dateA;
                  } else if (moduleSortBy === 'title') {
                    return a.title.localeCompare(b.title);
                  } else {
                    const scoreA = a.progress?.[0]?.score || 0;
                    const scoreB = b.progress?.[0]?.score || 0;
                    return scoreB - scoreA;
                  }
                });

                // Pagination
                const totalPages = Math.ceil(filteredModules.length / modulesPerPage);
                const startIndex = (currentPage - 1) * modulesPerPage;
                const paginatedModules = filteredModules.slice(startIndex, startIndex + modulesPerPage);

                if (filteredModules.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <p className="text-slate-500">No modules found</p>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      {paginatedModules.map((module: any) => (
                        <div
                          key={module.id}
                          onClick={() => {
                            window.location.href = `/learning/review/${module.id}`;
                          }}
                          className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 hover:shadow-lg transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-bold text-slate-900 group-hover:text-green-700 transition-colors mb-1">
                                {module.title}
                              </h3>
                              <p className="text-sm text-slate-600 line-clamp-2">{module.description}</p>
                            </div>
                            <div className="p-1.5 bg-green-200 text-green-700 rounded-lg ml-2">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1 text-slate-500">
                                <Clock className="w-3 h-3" />
                                {module.estimated_time} mins
                              </div>
                              {module.progress?.[0]?.score && (
                                <div className="flex items-center gap-1 text-green-600 font-medium">
                                  <Award className="w-3 h-3" />
                                  {module.progress[0].score}%
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-green-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                              Review <ArrowRight className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-slate-600">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Prerequisite Warning Modal */}
      {prerequisiteData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Prerequisites Recommended</h3>
            </div>

            <p className="text-slate-600 mb-4">
              Before diving into <strong>{topic}</strong>, our AI suggests you might want to be familiar with:
            </p>

            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium">
                {prerequisiteData.prerequisites.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 mt-3 italic border-t border-slate-200 pt-2">
                "{prerequisiteData.reason}"
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPrerequisiteData(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setPrerequisiteData(null);
                  proceedToAssessment(topic);
                }}
                className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'dashboard' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Learning Hub</h1>
              <p className="text-slate-600">Your active courses and progress</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setView('graph')}
                className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <Brain className="w-4 h-4" />
                Knowledge Graph
              </button>
              <button
                onClick={() => setView('input')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                New Goal
              </button>
            </div>
          </div>

          {subjects.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No active courses</h3>
              <p className="text-slate-500 mb-6">Start your first AI-guided learning journey today.</p>
              <button
                onClick={() => setView('input')}
                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-800 transition-all"
              >
                Start Learning
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => {
                const completedModules = (subject.modules || []).filter((m: any) =>
                  m.progress?.length > 0 && m.progress[0].status === 'completed'
                );
                const hasCompleted = completedModules.length > 0;

                return (
                  <div key={subject.id} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-xl transition-all group relative">
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmModal({
                            isOpen: true,
                            type: 'archive',
                            subjectId: subject.id,
                            subjectName: subject.name
                          });
                        }}
                        className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 hover:text-blue-600 transition-colors"
                        title="Archive"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmModal({
                            isOpen: true,
                            type: 'delete',
                            subjectId: subject.id,
                            subjectName: subject.name
                          });
                        }}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-1">{subject.name}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2">{subject.description}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Progress</span>
                        <span className="font-medium">
                          {Math.round((subject.modules.filter((m: any) => m.progress && m.progress.length > 0 && m.progress[0].status === 'completed').length / (subject.modules.length || 1)) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.round((subject.modules.filter((m: any) => m.progress && m.progress.length > 0 && m.progress[0].status === 'completed').length / (subject.modules.length || 1)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Completed Modules List */}
                    {hasCompleted && (
                      <div className="mb-4 p-3 bg-green-50 rounded-xl border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-700">
                              Completed ({completedModules.length})
                            </span>
                          </div>
                          {completedModules.length > 3 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCompletedModulesModal({
                                  isOpen: true,
                                  subjectId: subject.id,
                                  subjectName: subject.name,
                                  modules: completedModules
                                });
                                setModuleSearch('');
                                setCurrentPage(1);
                              }}
                              className="text-xs font-medium text-green-600 hover:text-green-700 hover:underline"
                            >
                              View All
                            </button>
                          )}
                        </div>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {completedModules.map((module: any) => (
                            <div
                              key={module.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/learning/review/${module.id}`;
                              }}
                              className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-green-100 transition-colors cursor-pointer group/module"
                            >
                              <span className="text-sm text-slate-700 flex-1 line-clamp-1 group-hover/module:text-green-700">
                                {module.title}
                              </span>
                              <ArrowRight className="w-3 h-3 text-green-600 opacity-0 group-hover/module:opacity-100 transition-opacity flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (subject.modules && subject.modules.length > 0) {
                          // Find the first incomplete module
                          const nextModule = subject.modules.find((m: any) =>
                            !m.progress || m.progress.length === 0 || m.progress[0].status !== 'completed'
                          );
                          // If all modules are completed, open the last one
                          setActiveModule(nextModule || subject.modules[subject.modules.length - 1]);
                          setView('player');
                        }
                      }}
                      className="w-full mt-2 py-3 bg-slate-50 text-slate-900 font-medium rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" /> Continue Learning
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view === 'input' && (
        <SkillInput onAnalyze={handleSkillAnalyze} />
      )}

      {view === 'assessment' && (
        <Assessment
          topic={topic}
          questions={assessmentQuestions}
          onComplete={handleAssessmentComplete}
        />
      )}

      {view === 'curriculum' && generatedCourse && (
        <CurriculumPreview
          course={generatedCourse}
          onStart={handleStartCourse}
        />
      )}

      {view === 'player' && activeModule && (
        <ModulePlayer
          module={activeModule}
          onBack={() => setView('dashboard')}
          onComplete={handleModuleComplete}
        />
      )}

      {view === 'graph' && (
        <div className="space-y-6">
          <button onClick={() => setView('dashboard')} className="flex items-center text-slate-500 hover:text-slate-900 transition-colors">
            <ChevronLeft className="w-5 h-5 mr-1" /> Back to Dashboard
          </button>
          <KnowledgeGraph subjects={subjects} />
        </div>
      )}
    </DashboardLayout>
  );
};

export default Learning;