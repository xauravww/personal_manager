import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BookOpen, Brain, Target, Zap, ChevronRight, CheckCircle,
  Play, Clock, Award, ArrowRight, Sparkles, Layout, Search,
  MessageSquare, BarChart3, ChevronLeft, Send, RefreshCw,
  GraduationCap, FileText, Video, Link as LinkIcon
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

const ModulePlayer = ({ module, onBack, onComplete }: { module: Module, onBack: () => void, onComplete: () => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await apiClient.chatWithModule({
        module_id: module.id!,
        message: userMsg.content,
        conversation_history: messages.map(m => ({ role: m.role, content: m.content }))
      });

      const aiMsg: ChatMessage = {
        role: 'assistant',
        content: response.data?.response || "I'm processing that...",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again.", timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNextTopic = () => {
    if (currentCheckpointIndex < checkpoints.length - 1) {
      setCurrentCheckpointIndex(prev => prev + 1);
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
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl rounded-2xl p-5 ${msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-800'
                }`}>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl p-4 flex gap-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-4 mb-4">
            {currentCheckpointIndex < checkpoints.length - 1 ? (
              <button
                onClick={handleNextTopic}
                className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
              >
                Next Topic: {checkpoints[currentCheckpointIndex + 1]?.title} <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Complete Module <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question or answer the tutor..."
              className="w-full py-4 pl-6 pr-14 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
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
      const res = await apiClient.generateCurriculum({
        topic,
        assessmentResults: result
      });

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

  return (
    <DashboardLayout>
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
              {subjects.map((subject) => (
                <div key={subject.id} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-xl transition-all group relative">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('Archive this course?')) {
                          await apiClient.archiveSubject(subject.id);
                          loadSubjects();
                        }
                      }}
                      className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                      title="Archive"
                    >
                      <div className="w-4 h-4">📦</div>
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('Delete this course? This cannot be undone.')) {
                          await apiClient.deleteSubject(subject.id);
                          loadSubjects();
                        }
                      }}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                      title="Delete"
                    >
                      <div className="w-4 h-4">🗑️</div>
                    </button>
                  </div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Active
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{subject.name}</h3>
                  <p className="text-slate-500 text-sm mb-4 line-clamp-2">{subject.description}</p>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Progress</span>
                      <span className="font-medium">0%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '0%' }}></div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (subject.modules && subject.modules.length > 0) {
                        setActiveModule(subject.modules[0]);
                        setView('player');
                      }
                    }}
                    className="w-full mt-6 py-3 bg-slate-50 text-slate-900 font-medium rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" /> Continue Learning
                  </button>
                </div>
              ))}
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
          onComplete={() => { }}
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