import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  TrendingUp,
  Brain,
  Target,
  Clock,
  CheckCircle,
  PlayCircle,
  Award,
  Map,
  FileText,
  BarChart3,
  Lightbulb,
  Zap,
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Sparkles
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import CoursePlanner from '../components/CoursePlanner';
import { apiClient } from '../api/client';

interface LearningSubject {
  id: string;
  name: string;
  description?: string;
  current_level?: string;
  goals?: string;
  estimated_hours?: number;
  created_at: string;
  modules?: LearningModule[];
  progress?: LearningProgress[];
}

interface LearningModule {
  id: string;
  title: string;
  description?: string;
  content?: string;
  order_index: number;
  difficulty?: string;
  estimated_time?: number;
  progress?: LearningProgress;
  assignments?: Assignment[];
}

interface LearningProgress {
  id: string;
  status: string;
  score?: number;
  time_spent: number;
  completed_at?: string;
  started_at?: string;
  notes?: string;
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
  type: string;
  max_score: number;
}

interface KnowledgeSummary {
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  confidence: number;
  nextMilestones: string[];
}

const Learning: React.FC = () => {
  const [subjects, setSubjects] = useState<LearningSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<LearningSubject | null>(null);
  const [knowledgeSummary, setKnowledgeSummary] = useState<KnowledgeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);
  const [showCoursePlanner, setShowCoursePlanner] = useState(false);
  const [selectedSubjectForPlanning, setSelectedSubjectForPlanning] = useState<LearningSubject | null>(null);
  const [modulesPagination, setModulesPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);
  const [currentModulesPage, setCurrentModulesPage] = useState(1);
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null);
  const [showModuleContent, setShowModuleContent] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showAssignmentSubmission, setShowAssignmentSubmission] = useState(false);
  const [assignmentSubmission, setAssignmentSubmission] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string, timestamp: Date}>>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'chat'>('content');
  const [awaitingCompletionConfirmation, setAwaitingCompletionConfirmation] = useState(false);
  const [showFullAnswerButton, setShowFullAnswerButton] = useState(false);

  const loadSubjects = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getLearningSubjects();
      if (response.success && response.data) {
        setSubjects(response.data);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadKnowledgeSummary = async (subjectId: string) => {
    try {
      setIsLoadingSummary(true);
      const response = await apiClient.getKnowledgeSummary(subjectId);
      if (response.success && response.data) {
        setKnowledgeSummary(response.data);
      }
    } catch (error) {
      console.error('Error loading knowledge summary:', error);
      setKnowledgeSummary(null);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const loadModules = async (subjectId: string, page: number = 1, limit: number = 10) => {
    try {
      const response = await apiClient.getLearningModules(subjectId, { page, limit });
      if (response.success && response.data) {
        setModulesPagination(response.data.pagination);
        // Update the selected subject with the paginated modules
        // Transform progress array to single progress object
        const modulesWithProgress = response.data.modules.map((module: any) => ({
          ...module,
          progress: module.progress && module.progress.length > 0 ? module.progress[0] : undefined
        }));

        if (selectedSubject) {
          setSelectedSubject({
            ...selectedSubject,
            modules: modulesWithProgress
          });
        }
      }
    } catch (error) {
      console.error('Error loading modules:', error);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const createSubject = async () => {
    if (!newSubjectName.trim()) return;

    try {
      await apiClient.createLearningSubject({
        name: newSubjectName.trim()
      });
      setNewSubjectName('');
      setShowCreateSubject(false);
      loadSubjects();
    } catch (error) {
      console.error('Error creating subject:', error);
    }
  };

  const openCoursePlanner = (subject: LearningSubject) => {
    setSelectedSubjectForPlanning(subject);
    setShowCoursePlanner(true);
  };

  const handleCourseGenerated = async (courseData: any) => {
    // Refresh subjects to show the new course
    await loadSubjects();
    setShowCoursePlanner(false);
    setSelectedSubjectForPlanning(null);
  };

  const startModule = async (moduleId: string) => {
    try {
      const response = await apiClient.updateProgress({
        module_id: moduleId,
        status: 'in_progress',
        time_spent: 0
      });

      if (response.success && response.data) {
        // Reload modules to get updated progress data
        if (selectedSubject) {
          await loadModules(selectedSubject.id, currentModulesPage);
        }
      }
    } catch (error) {
      console.error('Error starting module:', error);
    }
  };

  const handleModuleAction = (module: LearningModule) => {
    if (module.progress?.status === 'completed') {
      // Show review content
      setSelectedModule(module);
      setShowModuleContent(true);
      initializeModuleChat(module);
    } else if (module.progress?.status === 'in_progress') {
      // Continue learning - show module content
      setSelectedModule(module);
      setShowModuleContent(true);
      initializeModuleChat(module);
    } else {
      // Start new module
      startModule(module.id);
      setSelectedModule(module);
      setShowModuleContent(true);
      initializeModuleChat(module);
    }
  };

  const initializeModuleChat = (module: LearningModule) => {
    const initialMessages = [
      {
        role: 'assistant' as const,
        content: `Welcome to ${module.title}! I'm here to help you learn and understand this topic. You can ask me questions, tell me what you've learned, or ask for hints. When you're ready, let me know and I can help you mark this module as completed.

What would you like to focus on first?`,
        timestamp: new Date()
      }
    ];
    setChatMessages(initialMessages);
    setCurrentMessage('');
    setIsAiTyping(false);
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !selectedModule) return;

    const userMessage = {
      role: 'user' as const,
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsAiTyping(true);
    setAwaitingCompletionConfirmation(false); // Reset confirmation state when sending new message
    setShowFullAnswerButton(false); // Reset full answer button when sending new message

    try {
      // Call AI service for module conversation
      const conversationHistory = chatMessages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await apiClient.chatWithModule({
        module_id: selectedModule.id,
        message: currentMessage.trim(),
        conversation_history: conversationHistory
      });

      const aiMessage = {
        role: 'assistant' as const,
        content: response.success && response.data ? response.data.response : 'I understand. Let me help you with that.',
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);

      // Check if AI response contains hints (guiding questions, incomplete answers)
      const aiContent = aiMessage.content.toLowerCase();
      const hintIndicators = [
        'what do you think',
        'can you try',
        'let me guide you',
        'here\'s a hint',
        'think about',
        'consider',
        'what would happen if',
        'try to',
        'how would you',
        'what about',
        'let\'s think',
        'can you explain',
        'what is',
        'how does',
        'why do you think'
      ];

      const containsHint = hintIndicators.some(indicator => aiContent.includes(indicator));
      setShowFullAnswerButton(containsHint);

      // Handle AI completion detection - ask for user confirmation
      if (response.success && response.data?.completed) {
        // Module has been marked as completed by AI - ask for confirmation
        setAwaitingCompletionConfirmation(true);
        setTimeout(() => {
          const confirmationMessage = {
            role: 'assistant' as const,
            content: '🎯 **Ready to Complete Module?** Based on our conversation, I believe you\'ve demonstrated a good understanding of this topic. Would you like me to mark this module as completed? You can also continue practicing if you\'d like to be absolutely sure.',
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, confirmationMessage]);
        }, 1000); // Small delay to show the AI response first
      } else {
        // Reset confirmation state if no completion detected
        setAwaitingCompletionConfirmation(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const requestHint = async () => {
    if (!selectedModule) return;

    setIsAiTyping(true);

    try {
      const hintRequest = `Can you give me a helpful hint for understanding ${selectedModule.title}?`;
      const conversationHistory = chatMessages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await apiClient.chatWithModule({
        module_id: selectedModule.id,
        message: hintRequest,
        conversation_history: conversationHistory
      });

      const hintMessage = {
        role: 'assistant' as const,
        content: `💡 **Hint:** ${response.success && response.data ? response.data.response : 'Here\'s a helpful hint for this topic.'}`,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, hintMessage]);
    } catch (error) {
      console.error('Error getting hint:', error);
    } finally {
      setIsAiTyping(false);
    }
  };

  const markModuleCompleted = async () => {
    if (!selectedModule) return;

    try {
      const response = await apiClient.updateProgress({
        module_id: selectedModule.id,
        status: 'completed',
        score: 100,
        time_spent: selectedModule.progress?.time_spent || 0
      });

      if (response.success) {
        // Update local state
        if (selectedSubject) {
          await loadModules(selectedSubject.id, currentModulesPage);
        }

        // Update selectedModule state as well
        setSelectedModule({
          ...selectedModule,
          progress: {
            ...selectedModule.progress,
            status: 'completed',
            score: 100,
            completed_at: new Date().toISOString()
          }
        });

        // Add completion message
        const completionMessage = {
          role: 'assistant' as const,
          content: '🎉 Congratulations! You\'ve successfully completed this module. Great work on your learning journey!',
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, completionMessage]);

        // Reset confirmation state
        setAwaitingCompletionConfirmation(false);
      }
    } catch (error) {
      console.error('Error marking module as completed:', error);
    }
  };

  const declineCompletion = () => {
    const continueMessage = {
      role: 'assistant' as const,
      content: 'No problem! Let\'s continue practicing. What would you like to focus on next?',
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, continueMessage]);
    setAwaitingCompletionConfirmation(false);
  };

  const requestFullAnswer = async () => {
    if (!selectedModule) return;

    setIsAiTyping(true);
    setShowFullAnswerButton(false);

    try {
      const fullAnswerRequest = `Please provide the full answer to my previous question.`;
      const conversationHistory = chatMessages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await apiClient.chatWithModule({
        module_id: selectedModule.id,
        message: fullAnswerRequest,
        conversation_history: conversationHistory
      });

      const fullAnswerMessage = {
        role: 'assistant' as const,
        content: response.success && response.data ? response.data.response : 'Here\'s the complete answer.',
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, fullAnswerMessage]);
    } catch (error) {
      console.error('Error getting full answer:', error);
    } finally {
      setIsAiTyping(false);
    }
  };

  const submitAssignment = async () => {
    if (!selectedAssignment || !assignmentSubmission.trim()) return;

    try {
      const response = await apiClient.submitAssignment({
        assignment_id: selectedAssignment.id,
        content: assignmentSubmission.trim()
      });

      if (response.success) {
        // Show success message
        alert('Assignment submitted successfully!');

        // Reset form
        setAssignmentSubmission('');
        setSelectedAssignment(null);
        setShowAssignmentSubmission(false);

        // Refresh modules to show updated progress
        if (selectedSubject) {
          await loadModules(selectedSubject.id, currentModulesPage);
        }
      } else {
        alert('Failed to submit assignment. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('Error submitting assignment. Please try again.');
    }
  };

  const openAssignmentSubmission = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowAssignmentSubmission(true);
    setAssignmentSubmission('');
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressStats = (subject: LearningSubject) => {
    if (!subject.modules || !subject.progress) return { completed: 0, total: 0, percentage: 0 };

    const total = subject.modules.length;
    const completed = subject.progress.filter(p => p.status === 'completed').length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return { completed, total, percentage };
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6 text-white animate-pulse" />
            </div>
            <p className="text-gray-600">Loading your learning journey...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Learning Hub</h1>
            <p className="text-gray-600">Your personalized learning journey</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateSubject(true)}
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Start Learning
        </button>
      </div>
        {!selectedSubject ? (
          // Subjects Overview
          <div>
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Learning Subjects</h2>

              {subjects.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No learning subjects yet</h3>
                  <p className="text-gray-600 mb-6">Start your learning journey by creating your first subject</p>
                  <button
                    onClick={() => setShowCreateSubject(true)}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all"
                  >
                    Start Learning Something New
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subjects.map((subject) => {
                    const stats = getProgressStats(subject);
                    return (
                      <div
                        key={subject.id}
                        className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => {
                          setSelectedSubject(subject);
                          setCurrentModulesPage(1);
                          loadModules(subject.id, 1);
                          loadKnowledgeSummary(subject.id);
                        }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{subject.name}</h3>
                            {subject.description && (
                              <p className="text-sm text-gray-600 line-clamp-2">{subject.description}</p>
                            )}
                          </div>
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-purple-600" />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium text-gray-900">{stats.completed}/{stats.total} modules</span>
                          </div>

                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${stats.percentage}%` }}
                            ></div>
                          </div>

                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>{Math.round(stats.percentage)}% complete</span>
                            {subject.current_level && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(subject.current_level)}`}>
                                {subject.current_level}
                              </span>
                            )}
                          </div>
                        </div>

                        {(!subject.modules || subject.modules.length === 0) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openCoursePlanner(subject);
                            }}
                            className="w-full mt-4 bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-blue-600 transition-all flex items-center justify-center gap-2"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Plan My Course
                          </button>
                        )}
                              </div>
                            );
                          })}
                </div>
              )}
            </div>
          </div>
        ) : showModuleContent && selectedModule ? (
           // Module Content View
           <div>
             {/* Module Content Page */}
             <div className="bg-white rounded-xl border border-gray-200 p-6">
               <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-4">
                   <button
                     onClick={() => {
                       setShowModuleContent(false);
                       setSelectedModule(null);
                       setChatMessages([]);
                       setActiveTab('content');
                     }}
                     className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                   >
                     ← Back to Modules
                   </button>
                   <div>
                     <h3 className="text-xl font-semibold text-gray-900">{selectedModule.title}</h3>
                     <p className="text-sm text-gray-600 mt-1">
                       Status: {selectedModule.progress?.status === 'completed' ? 'Completed' :
                               selectedModule.progress?.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                     </p>
                   </div>
                 </div>
                 <div className="flex items-center gap-4">
                   <div className="text-sm text-gray-600">
                     Difficulty: {selectedModule.difficulty || 'Not specified'} |
                     Estimated Time: {selectedModule.estimated_time || 0} minutes
                   </div>
                   {selectedModule.progress?.status !== 'completed' && (
                     <button
                       onClick={markModuleCompleted}
                       className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all"
                     >
                       Mark as Completed
                     </button>
                   )}
                 </div>
               </div>

               {/* Tabs */}
               <div className="flex border-b border-gray-200 mb-6">
                 <button
                   onClick={() => setActiveTab('content')}
                   className={`px-6 py-3 font-medium text-sm ${
                     activeTab === 'content'
                       ? 'border-b-2 border-purple-500 text-purple-600'
                       : 'text-gray-600 hover:text-gray-900'
                   }`}
                 >
                   📚 Content
                 </button>
                 <button
                   onClick={() => setActiveTab('chat')}
                   className={`px-6 py-3 font-medium text-sm ${
                     activeTab === 'chat'
                       ? 'border-b-2 border-purple-500 text-purple-600'
                       : 'text-gray-600 hover:text-gray-900'
                   }`}
                 >
                   🤖 AI Assistant
                 </button>
               </div>

               {activeTab === 'content' ? (
                 <div className="space-y-6">
                   {selectedModule.description && (
                     <div>
                       <h4 className="text-lg font-medium text-gray-900 mb-2">Description</h4>
                       <p className="text-gray-700">{selectedModule.description}</p>
                     </div>
                   )}

                   {selectedModule.content && (
                     <div>
                       <h4 className="text-lg font-medium text-gray-900 mb-2">Content</h4>
                       <div className="prose prose-gray max-w-none">
                         <div dangerouslySetInnerHTML={{ __html: selectedModule.content }} />
                       </div>
                     </div>
                   )}

                   {selectedModule.assignments && selectedModule.assignments.length > 0 && (
                     <div>
                       <h4 className="text-lg font-medium text-gray-900 mb-4">Assignments</h4>
                       <div className="space-y-4">
                         {selectedModule.assignments.map((assignment) => (
                           <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                             <div className="flex items-start justify-between">
                               <div className="flex-1">
                                 <h5 className="font-medium text-gray-900">{assignment.title}</h5>
                                 {assignment.description && (
                                   <p className="text-gray-600 mt-1">{assignment.description}</p>
                                 )}
                                 <p className="text-sm text-gray-500 mt-2">Max Score: {assignment.max_score}</p>
                               </div>
                               <button
                                 onClick={() => openAssignmentSubmission(assignment)}
                                 className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all ml-4"
                               >
                                 Submit Assignment
                               </button>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                   <div className="flex gap-3 pt-4">
                     <button
                       onClick={() => setActiveTab('chat')}
                       className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-all"
                     >
                       💬 Ask AI for Help
                     </button>
                   </div>
                 </div>
               ) : (
                 <div className="flex flex-col h-96">
                   {/* Chat Messages */}
                   <div className="flex-1 overflow-y-auto p-4 space-y-4 border border-gray-200 rounded-lg">
                     {chatMessages.map((message, index) => (
                       <div
                         key={index}
                         className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                       >
                         <div
                           className={`max-w-[80%] rounded-lg p-3 ${
                             message.role === 'user'
                               ? 'bg-purple-500 text-white'
                               : 'bg-gray-100 text-gray-900'
                           }`}
                         >
                           <div className="flex items-center gap-2 mb-1">
                             {message.role === 'user' ? (
                               <User className="w-4 h-4" />
                             ) : (
                               <Bot className="w-4 h-4" />
                             )}
                             <span className="text-xs opacity-70">
                               {message.role === 'user' ? 'You' : 'AI Assistant'}
                             </span>
                           </div>
                           <div className="whitespace-pre-wrap">{message.content}</div>
                         </div>
                       </div>
                     ))}

                     {isAiTyping && (
                       <div className="flex justify-start">
                         <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                           <div className="flex items-center gap-2">
                             <Bot className="w-4 h-4" />
                             <span className="text-xs text-gray-600">AI is typing...</span>
                             <div className="flex gap-1">
                               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                             </div>
                           </div>
                         </div>
                       </div>
                     )}
                   </div>

                   {/* Chat Input */}
                   <div className="border-t border-gray-200 p-4 mt-4">
                     {awaitingCompletionConfirmation ? (
                       <div className="flex gap-3 justify-center">
                         <button
                           onClick={markModuleCompleted}
                           className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all flex items-center gap-2"
                         >
                           <CheckCircle className="w-4 h-4" />
                           Yes, Mark as Completed
                         </button>
                         <button
                           onClick={declineCompletion}
                           className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all flex items-center gap-2"
                         >
                           <X className="w-4 h-4" />
                           Continue Practicing
                         </button>
                       </div>
                     ) : showFullAnswerButton ? (
                       <div className="flex gap-3 justify-center">
                         <button
                           onClick={requestFullAnswer}
                           disabled={isAiTyping}
                           className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all flex items-center gap-2 disabled:opacity-50"
                         >
                           <Lightbulb className="w-4 h-4" />
                           Please Provide Full Answer
                         </button>
                         <div className="flex-1 flex gap-2">
                           <input
                             type="text"
                             value={currentMessage}
                             onChange={(e) => setCurrentMessage(e.target.value)}
                             onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                             placeholder="Or ask another question..."
                             className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                             disabled={isAiTyping}
                           />
                           <button
                             onClick={sendMessage}
                             disabled={!currentMessage.trim() || isAiTyping}
                             className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2"
                           >
                             <Send className="w-4 h-4" />
                             Send
                           </button>
                         </div>
                       </div>
                     ) : (
                       <div className="flex gap-3">
                         <button
                           onClick={requestHint}
                           disabled={isAiTyping}
                           className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 disabled:opacity-50"
                         >
                           <Sparkles className="w-4 h-4" />
                           Hint
                         </button>
                         <div className="flex-1 flex gap-2">
                           <input
                             type="text"
                             value={currentMessage}
                             onChange={(e) => setCurrentMessage(e.target.value)}
                             onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                             placeholder="Ask me anything about this module..."
                             className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                             disabled={isAiTyping}
                           />
                           <button
                             onClick={sendMessage}
                             disabled={!currentMessage.trim() || isAiTyping}
                             className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2"
                           >
                             <Send className="w-4 h-4" />
                             Send
                           </button>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               )}
             </div>
           </div>
         ) : showAssignmentSubmission && selectedAssignment ? (
           // Assignment Submission View
           <div>
             <div className="bg-white rounded-xl border border-gray-200 p-6">
               <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-4">
                   <button
                     onClick={() => {
                       setShowAssignmentSubmission(false);
                       setSelectedAssignment(null);
                       setAssignmentSubmission('');
                       setShowModuleContent(true); // Go back to module content
                     }}
                     className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                   >
                     ← Back to Module
                   </button>
                   <div>
                     <h3 className="text-xl font-semibold text-gray-900">Submit Assignment</h3>
                     <p className="text-sm text-gray-600 mt-1">{selectedAssignment.title}</p>
                   </div>
                 </div>
               </div>

               <div className="space-y-6">
                 <div>
                   <h4 className="text-lg font-medium text-gray-900 mb-2">Assignment Details</h4>
                   {selectedAssignment.description && (
                     <p className="text-gray-700 mb-4">{selectedAssignment.description}</p>
                   )}
                   <p className="text-sm text-gray-600">Maximum Score: {selectedAssignment.max_score}</p>
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Your Submission
                   </label>
                   <textarea
                     value={assignmentSubmission}
                     onChange={(e) => setAssignmentSubmission(e.target.value)}
                     placeholder="Enter your assignment solution here..."
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-48 resize-none"
                   />
                 </div>

                 <div className="flex gap-3">
                   <button
                     onClick={submitAssignment}
                     disabled={!assignmentSubmission.trim()}
                     className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-all disabled:opacity-50 flex items-center gap-2"
                   >
                     <Send className="w-4 h-4" />
                     Submit Assignment
                   </button>
                   <button
                     onClick={() => {
                       setShowAssignmentSubmission(false);
                       setSelectedAssignment(null);
                       setAssignmentSubmission('');
                       setShowModuleContent(true); // Go back to module content
                     }}
                     className="px-6 py-2 text-gray-600 hover:text-gray-900"
                   >
                     Cancel
                   </button>
                 </div>
               </div>
             </div>
           </div>
         ) : (
           // Subject Detail View
           <div>
             <div className="flex items-center justify-between mb-6">
               <button
                 onClick={() => setSelectedSubject(null)}
                 className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
               >
                 ← Back to subjects
               </button>
               <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 text-sm text-gray-600">
                   <Target className="w-4 h-4" />
                   {selectedSubject.current_level || 'Not assessed'}
                 </div>
                 <div className="flex items-center gap-2 text-sm text-gray-600">
                   <Clock className="w-4 h-4" />
                   {selectedSubject.estimated_hours || 0} hours estimated
                 </div>
               </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Progress Overview */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Knowledge Summary</h3>

                    {isLoadingSummary ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : knowledgeSummary ? (
                      <div className="space-y-4">
                        {/* Summary */}
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <Lightbulb className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700 leading-relaxed">{knowledgeSummary.summary}</p>
                          </div>
                        </div>

                        {/* Strengths */}
                        {knowledgeSummary.strengths.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              Strengths
                            </h4>
                            <ul className="space-y-1">
                              {knowledgeSummary.strengths.slice(0, 3).map((strength, index) => (
                                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                                  <span className="text-green-500 mt-1">•</span>
                                  {strength}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Areas for Improvement */}
                        {knowledgeSummary.areasForImprovement.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                              <Target className="w-4 h-4 text-orange-500" />
                              Focus Areas
                            </h4>
                            <ul className="space-y-1">
                              {knowledgeSummary.areasForImprovement.slice(0, 3).map((area, index) => (
                                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                                  <span className="text-orange-500 mt-1">•</span>
                                  {area}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Next Milestones */}
                        {knowledgeSummary.nextMilestones.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-blue-500" />
                              Next Steps
                            </h4>
                            <ul className="space-y-1">
                              {knowledgeSummary.nextMilestones.slice(0, 2).map((milestone, index) => (
                                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                                  <span className="text-blue-500 mt-1">•</span>
                                  {milestone}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Confidence Indicator */}
                        <div className="pt-2 border-t border-gray-200">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>Assessment Confidence</span>
                            <span className="font-medium">{knowledgeSummary.confidence}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${knowledgeSummary.confidence}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Knowledge summary not available</p>
                        <button
                          onClick={() => loadKnowledgeSummary(selectedSubject.id)}
                          className="mt-2 text-purple-600 hover:text-purple-700 text-sm font-medium"
                        >
                          Generate Summary
                        </button>
                      </div>
                    )}
                  </div>
                </div>

               {/* Modules List */}
               <div className="lg:col-span-2">
                 <div className="bg-white rounded-xl border border-gray-200 p-6">
                   <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Modules</h3>

                   {!selectedSubject.modules || selectedSubject.modules.length === 0 ? (
                     <div className="text-center py-8">
                       <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                       <p className="text-gray-600 mb-4">No modules yet</p>
                       <button
                         onClick={() => openCoursePlanner(selectedSubject)}
                         className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all flex items-center gap-2"
                       >
                         <MessageSquare className="w-4 h-4" />
                         Plan Course with AI
                       </button>
                     </div>
                   ) : (
                      <div className="space-y-4">
                         {selectedSubject.modules
                           .sort((a, b) => a.order_index - b.order_index)
                           .map((module) => {
                             return (
                               <div
                                 key={`${module.id}-${module.progress?.status}`}
                                 className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-all"
                               >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900 mb-1">{module.title}</h4>
                                  {module.description && (
                                    <p className="text-sm text-gray-600 line-clamp-2">{module.description}</p>
                                  )}

                                </div>
                                <div className="flex items-center gap-2">
                                  {module.difficulty && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(module.difficulty)}`}>
                                      {module.difficulty}
                                    </span>
                                  )}
                                  {module.progress?.status === 'completed' && (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                  )}
                                  {module.progress?.status === 'in_progress' && (
                                    <PlayCircle className="w-5 h-5 text-blue-500" />
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-sm text-gray-600">
                                <div className="flex items-center gap-4">
                                  {module.estimated_time && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-4 h-4" />
                                      {module.estimated_time} min
                                    </span>
                                  )}
                                  {module.assignments && module.assignments.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <FileText className="w-4 h-4" />
                                      {module.assignments.length} assignments
                                    </span>
                                  )}
                                </div>

                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleModuleAction(module);
                                   }}
                                   className="text-purple-600 hover:text-purple-700 font-medium"
                                 >
                                   {module.progress?.status === 'completed'
                                     ? 'Review'
                                     : module.progress?.status === 'in_progress'
                                     ? 'Continue'
                                     : 'Start'}
                                 </button>
                               </div>
                             </div>
                           );
                         })}

                        {/* Pagination */}
                        {modulesPagination && modulesPagination.pages > 1 && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                              Showing {((modulesPagination.page - 1) * modulesPagination.limit) + 1} to {Math.min(modulesPagination.page * modulesPagination.limit, modulesPagination.total)} of {modulesPagination.total} modules
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const newPage = currentModulesPage - 1;
                                  setCurrentModulesPage(newPage);
                                  loadModules(selectedSubject.id, newPage);
                                }}
                                disabled={currentModulesPage === 1}
                                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              <span className="text-sm text-gray-600">
                                Page {modulesPagination.page} of {modulesPagination.pages}
                              </span>
                              <button
                                onClick={() => {
                                  const newPage = currentModulesPage + 1;
                                  setCurrentModulesPage(newPage);
                                  loadModules(selectedSubject.id, newPage);
                                }}
                                disabled={currentModulesPage === modulesPagination.pages}
                                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                   )}
                 </div>
               </div>
             </div>
           </div>
         )}
       </div>

      {/* Course Planner Modal */}
      {showCoursePlanner && selectedSubjectForPlanning && (
        <CoursePlanner
          subjectName={selectedSubjectForPlanning.name}
          onCourseGenerated={handleCourseGenerated}
          onClose={() => {
            setShowCoursePlanner(false);
            setSelectedSubjectForPlanning(null);
          }}
        />
      )}

      {/* Create Subject Modal */}
      {showCreateSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Start Learning</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What would you like to learn?
                </label>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g., Python, Machine Learning, React..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onKeyPress={(e) => e.key === 'Enter' && createSubject()}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={createSubject}
                  disabled={!newSubjectName.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50"
                >
                  Create Subject
                </button>
                <button
                  onClick={() => {
                    setShowCreateSubject(false);
                    setNewSubjectName('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Course Planner Modal */}
      {showCoursePlanner && selectedSubjectForPlanning && (
        <CoursePlanner
          subjectName={selectedSubjectForPlanning.name}
          onCourseGenerated={handleCourseGenerated}
          onClose={() => {
            setShowCoursePlanner(false);
            setSelectedSubjectForPlanning(null);
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default Learning;