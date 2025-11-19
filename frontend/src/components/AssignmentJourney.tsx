import React, { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle, Circle, MessageCircle, FileText, Eye, Brain } from 'lucide-react';
import CodeEditor from './CodeEditor';
import { apiClient } from '../api/client';

interface AssignmentStep {
  id: string;
  title: string;
  type: 'chat' | 'questions' | 'editor' | 'review';
  content: string;
  ai_guidance: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  type: string;
  steps?: AssignmentStep[] | string;
  modalities?: string[] | string;
  max_score: number;
}

interface StepProgress {
  step_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  user_input: string;
  ai_feedback: string;
  score?: number;
  time_spent: number;
}

interface AssignmentJourneyProps {
  assignment: Assignment;
  onComplete: (result: any) => void;
  onCancel: () => void;
}

const AssignmentJourney: React.FC<AssignmentJourneyProps> = ({
  assignment,
  onComplete,
  onCancel
}) => {
  // Helper function to get modalities as array
  const getModalities = (): string[] => {
    if (!assignment.modalities) return [];
    if (Array.isArray(assignment.modalities)) return assignment.modalities;
    try {
      return JSON.parse(assignment.modalities);
    } catch {
      return [];
    }
  };

  // Helper function to get steps as array
  const getSteps = (): AssignmentStep[] => {
    if (!assignment.steps) return [];
    if (Array.isArray(assignment.steps)) return assignment.steps;
    try {
      return JSON.parse(assignment.steps);
    } catch {
      return [];
    }
  };

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState<StepProgress[]>(
    getSteps().map(step => ({
        step_id: step.id,
        status: 'not_started',
        user_input: '',
        ai_feedback: '',
        time_spent: 0
      }))
  );
  const [currentInput, setCurrentInput] = useState('');
   const [aiResponse, setAiResponse] = useState('');
   const [isAnalyzing, setIsAnalyzing] = useState(false);

   const [startTime, setStartTime] = useState(Date.now());





  const currentStep = getSteps()[currentStepIndex];
  const currentProgress = stepProgress[currentStepIndex];

  useEffect(() => {
    setStartTime(Date.now());
  }, [currentStepIndex]);

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'chat': return <MessageCircle className="w-5 h-5" />;
      case 'questions': return <FileText className="w-5 h-5" />;
      case 'editor': return <FileText className="w-5 h-5" />;
      case 'review': return <Eye className="w-5 h-5" />;
      default: return <Circle className="w-5 h-5" />;
    }
  };

  const analyzeStep = async () => {
    if (!currentStep || !currentInput.trim()) return;

    setIsAnalyzing(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      const response = await apiClient.analyzeStepPerformance({
        assignment_id: assignment.id,
        step: currentStep,
        user_input: currentInput,
        time_spent: timeSpent
      });

      if (response.success) {
        const analysis = response.data;

        // Update step progress
        const updatedProgress = [...stepProgress];
        updatedProgress[currentStepIndex] = {
          ...currentProgress,
          status: 'completed',
          user_input: currentInput,
          ai_feedback: analysis.nextStepGuidance || 'Step completed successfully!',
          score: analysis.analysis.completeness_score,
          time_spent: timeSpent
        };
        setStepProgress(updatedProgress);

        setAiResponse(analysis.nextStepGuidance || 'Great work! Ready for the next step?');
      }
    } catch (error) {
      console.error('Error analyzing step:', error);
      setAiResponse('I encountered an issue analyzing your response, but you can still proceed to the next step. Consider reviewing the material if you\'re unsure.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const nextStep = () => {
    if (currentStepIndex < getSteps().length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setCurrentInput('');
      setAiResponse('');
      setStartTime(Date.now());
    } else {
      // Assignment complete
      onComplete({
        assignment_id: assignment.id,
        steps_progress: stepProgress,
        final_score: stepProgress.reduce((sum, step) => sum + (step.score || 0), 0) / stepProgress.length
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep.type) {
      case 'chat':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium text-blue-900">AI Assistant</h4>
                  <p className="text-blue-800 mt-1">{currentStep.ai_guidance}</p>
                </div>
              </div>
            </div>

             <div className="space-y-3">
               <label className="block text-sm font-medium text-gray-700">
                 Your Response
               </label>
               <textarea
                 value={currentInput}
                 onChange={(e) => setCurrentInput(e.target.value)}
                 placeholder="Share your thoughts, ask questions, or provide your answer..."
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
               />
             </div>

            {aiResponse && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-green-900">AI Feedback</h4>
                    <p className="text-green-800 mt-1">{aiResponse}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'questions':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-purple-800">{currentStep.content}</p>
            </div>

             <div className="space-y-3">
               <label className="block text-sm font-medium text-gray-700">
                 Your Answer
               </label>
               <textarea
                 value={currentInput}
                 onChange={(e) => setCurrentInput(e.target.value)}
                 placeholder="Provide your detailed answer..."
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-48 resize-none"
               />
             </div>

            {aiResponse && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-800">{aiResponse}</p>
              </div>
            )}
          </div>
        );

      case 'editor':
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-800">{currentStep.content}</p>
            </div>

             <div className="space-y-3">
               <label className="block text-sm font-medium text-gray-700">
                 Your Code/Solution
               </label>

               <CodeEditor
                 initialCode={currentInput}
                 language="javascript"
                 onCodeChange={setCurrentInput}
                 onRun={async (code: string) => {
                   try {
                     const response = await apiClient.executeCode({
                       code,
                       language: 'javascript',
                       timeout: 5000
                     });

                     if (response.success && response.data) {
                       return {
                         output: response.data.output
                       };
                     } else {
                       return {
                         output: '',
                         error: response.error || 'Code execution failed'
                       };
                     }
                   } catch (error) {
                     return {
                       output: '',
                       error: error instanceof Error ? error.message : 'Unknown error occurred'
                     };
                   }
                 }}
                 placeholder="Write your JavaScript code here..."
                 height="300px"
               />
             </div>

            {aiResponse && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-yellow-800">{aiResponse}</p>
              </div>
            )}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900">Review & Reflect</h4>
              <p className="text-green-800 mt-1">{currentStep.content}</p>
            </div>

             <div className="space-y-3">
               <label className="block text-sm font-medium text-gray-700">
                 Your Reflection
               </label>
               <textarea
                 value={currentInput}
                 onChange={(e) => setCurrentInput(e.target.value)}
                 placeholder="Reflect on what you've learned and how you'll apply it..."
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-32 resize-none"
               />
             </div>

            {aiResponse && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-green-800">{aiResponse}</p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <p>{currentStep.content}</p>
            <textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder="Enter your response..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
            />
          </div>
        );
    }
  };

  // Handle assignments without steps
  if (getSteps().length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Assignment Not Available</h3>
          <p className="text-gray-600 mb-6">This assignment doesn't have structured steps yet.</p>
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

   return (
       <div className="max-w-4xl mx-auto p-6">
         {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{assignment.title}</h2>
          <p className="text-gray-600">{assignment.description}</p>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-sm text-gray-500">
            Step {currentStepIndex + 1} of {getSteps().length}
          </span>
          <span className="text-sm text-gray-500">
            Modalities: {getModalities().length > 0 ? getModalities().join(', ') : 'Text-based'}
          </span>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {getSteps().map((step, index) => (
            <React.Fragment key={step.id}>
              <div className={`flex items-center gap-2 ${
                index <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'
              }`}>
                <div className={`p-2 rounded-full ${
                  stepProgress[index].status === 'completed'
                    ? 'bg-green-100 text-green-600'
                    : index === currentStepIndex
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {stepProgress[index].status === 'completed' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    getStepIcon(step.type)
                  )}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
              </div>
              {index < getSteps().length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          {getStepIcon(currentStep.type)}
          <h3 className="text-xl font-semibold text-gray-900">{currentStep.title}</h3>
        </div>

        {renderStepContent()}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onCancel}
          className="px-6 py-2 text-gray-600 hover:text-gray-900"
        >
          Cancel Assignment
        </button>

        <div className="flex gap-3">
          {!aiResponse && currentProgress.status !== 'completed' && (
            <button
              onClick={analyzeStep}
              disabled={!currentInput.trim() || isAnalyzing}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze & Continue'}
            </button>
          )}

          {aiResponse && (
            <button
              onClick={nextStep}
              className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-all flex items-center gap-2"
            >
              {currentStepIndex < getSteps().length - 1 ? 'Next Step' : 'Complete Assignment'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
   );

   React.useEffect(() => {
     // Handle online/offline status changes
     const handleOnline = () => {
       // User came back online - could show a subtle notification
       console.log('Connection restored');
     };

     const handleOffline = () => {
       // User went offline
       console.log('Connection lost');
     };

     window.addEventListener('online', handleOnline);
     window.addEventListener('offline', handleOffline);

     return () => {
       window.removeEventListener('online', handleOnline);
       window.removeEventListener('offline', handleOffline);
     };
   }, []);

};

export default AssignmentJourney;