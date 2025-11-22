import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, TrendingUp, Lightbulb, Target, BookOpen } from 'lucide-react';
import { apiClient } from '../api/client';

interface CrossDomainInsightsProps {
  currentSubject: string;
  learningHistory?: Array<{
    subject: string;
    skills: string[];
    performance: number;
    timeSpent: number;
  }>;
}

interface TransferableSkill {
  skill: string;
  sourceSubject: string;
  targetSubject: string;
  confidence: number;
  application: string;
}

interface RecommendedPath {
  subject: string;
  reason: string;
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
  leverageSkills: string[];
}

const CrossDomainInsights: React.FC<CrossDomainInsightsProps> = ({
  currentSubject,
  learningHistory = []
}) => {
  const [insights, setInsights] = useState<{
    transferableSkills: TransferableSkill[];
    recommendedPaths: RecommendedPath[];
    learningAcceleration: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentSubject && learningHistory.length > 0) {
      loadInsights();
    }
  }, [currentSubject, learningHistory, loadInsights]);

  const loadInsights = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.analyzeCrossDomainSkills(currentSubject, learningHistory);
      if (response.success && response.data) {
        setInsights(response.data.analysis);
      }
    } catch (error) {
      console.error('Error loading cross-domain insights:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentSubject, learningHistory]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Cross-Domain Insights</h3>
            <p className="text-sm text-gray-600">Analyzing skill transfer opportunities...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!insights || (insights.transferableSkills.length === 0 && insights.recommendedPaths.length === 0)) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Cross-Domain Insights</h3>
            <p className="text-sm text-gray-600">Discover how your learning transfers across subjects</p>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Complete more subjects to unlock cross-domain insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cross-Domain Insights</h3>
          <p className="text-sm text-gray-600">Skill transfer and learning acceleration</p>
        </div>
      </div>

      {/* Learning Acceleration */}
      {insights.learningAcceleration > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900">Learning Acceleration</h4>
              <p className="text-sm text-blue-800">
                Your existing knowledge could accelerate learning by up to {insights.learningAcceleration}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transferable Skills */}
      {insights.transferableSkills.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Transferable Skills
          </h4>
          <div className="space-y-3">
            {insights.transferableSkills.slice(0, 5).map((skill, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <ArrowRight className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{skill.skill}</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                      {Math.round(skill.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    From <span className="font-medium">{skill.sourceSubject}</span> to{' '}
                    <span className="font-medium">{skill.targetSubject}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{skill.application}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Paths */}
      {insights.recommendedPaths.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-500" />
            Recommended Next Subjects
          </h4>
          <div className="space-y-3">
            {insights.recommendedPaths.map((path, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{path.subject}</h5>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(path.estimatedDifficulty)}`}>
                    {path.estimatedDifficulty}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{path.reason}</p>
                <div className="flex flex-wrap gap-1">
                  {path.leverageSkills.slice(0, 3).map((skill, skillIndex) => (
                    <span key={skillIndex} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                      {skill}
                    </span>
                  ))}
                  {path.leverageSkills.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                      +{path.leverageSkills.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CrossDomainInsights;