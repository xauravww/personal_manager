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
  MessageSquare
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
                        .map((module) => (
                          <div
                            key={module.id}
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

                              <button className="text-purple-600 hover:text-purple-700 font-medium">
                                {module.progress?.status === 'completed' ? 'Review' : 'Start'}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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