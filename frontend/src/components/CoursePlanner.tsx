import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  MessageSquare,
  Bot,
  User,
  Send,
  X,
  BookOpen,
  Target,
  Clock,
  TrendingUp,
  CheckCircle,
  Loader2,
  Zap,
  Brain
} from 'lucide-react';
import { apiClient } from '../api/client';

interface ConversationMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isAction?: boolean;
  actionType?: 'generate_course';
}

interface CourseRequirements {
  subjectName: string;
  currentLevel: string;
  goals: string[];
  timeCommitment: string;
  preferredStyle: string;
  priorKnowledge: string;
  challenges: string[];
  completed: boolean;
}

interface CoursePlannerProps {
  subjectName: string;
  onCourseGenerated: (courseData: any) => void;
  onClose: () => void;
}

const CoursePlanner: React.FC<CoursePlannerProps> = ({
  subjectName,
  onCourseGenerated,
  onClose
}) => {
  const [conversation, setConversation] = useState<ConversationMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: `Hi! I'm excited to help you create a personalized learning course for **${subjectName}**. To design the perfect course for you, I need to understand your goals and current situation.

Let's start with a few questions to create your ideal learning path. What would you like to achieve by learning ${subjectName}?`,
      timestamp: new Date()
    }
  ]);

  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requirements, setRequirements] = useState<CourseRequirements>({
    subjectName,
    currentLevel: '',
    goals: [],
    timeCommitment: '',
    preferredStyle: '',
    priorKnowledge: '',
    challenges: [],
    completed: false
  });

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const questions = [
    {
      key: 'goals',
      question: `What are your main goals for learning ${subjectName}? (e.g., "get a job", "build projects", "understand concepts", "pass certification")`,
      followUp: (answer: string) => {
        const goals = answer.split(',').map(g => g.trim()).filter(g => g.length > 0);
        setRequirements(prev => ({ ...prev, goals }));
        return `Great! Your goals are: ${goals.join(', ')}. What's your current experience level with ${subjectName}?`;
      }
    },
    {
      key: 'currentLevel',
      question: 'What\'s your current experience level?',
      options: ['beginner (never studied before)', 'intermediate (some experience)', 'advanced (extensive experience)'],
      followUp: (answer: string) => {
        setRequirements(prev => ({ ...prev, currentLevel: answer }));
        return `Perfect! You're at ${answer} level. How much time can you dedicate to learning per week?`;
      }
    },
    {
      key: 'timeCommitment',
      question: 'How much time can you dedicate to learning per week?',
      options: ['5-10 hours', '10-20 hours', '20+ hours', 'flexible/variable'],
      followUp: (answer: string) => {
        setRequirements(prev => ({ ...prev, timeCommitment: answer }));
        return `Excellent! ${answer} per week is a great commitment. What learning style works best for you?`;
      }
    },
    {
      key: 'preferredStyle',
      question: 'What learning style works best for you?',
      options: ['hands-on projects', 'theory and concepts', 'videos and tutorials', 'mixed approach'],
      followUp: (answer: string) => {
        setRequirements(prev => ({ ...prev, preferredStyle: answer }));
        return `Got it! You prefer ${answer}. Do you have any prior knowledge or experience in related areas?`;
      }
    },
    {
      key: 'priorKnowledge',
      question: 'Do you have any prior knowledge or experience in related areas?',
      followUp: (answer: string) => {
        setRequirements(prev => ({ ...prev, priorKnowledge: answer }));
        return `Thanks for sharing that background! Are there any specific challenges or topics you're worried about?`;
      }
    },
    {
      key: 'challenges',
      question: 'Are there any specific challenges or topics you\'re worried about?',
      followUp: (answer: string) => {
        const challenges = answer.toLowerCase().includes('none') || answer.trim() === '' ? [] : [answer];
        setRequirements(prev => ({ ...prev, challenges, completed: true }));

        return `Perfect! I've gathered all the information I need to create your personalized ${subjectName} course.

**Course Summary:**
- **Subject:** ${subjectName}
- **Goals:** ${requirements.goals.join(', ')}
- **Level:** ${requirements.currentLevel}
- **Time Commitment:** ${requirements.timeCommitment}
- **Learning Style:** ${requirements.preferredStyle}
- **Prior Knowledge:** ${requirements.priorKnowledge || 'None mentioned'}
${challenges.length > 0 ? `- **Challenges to Address:** ${challenges.join(', ')}` : ''}

Ready to generate your custom course?`;
      }
    }
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Process the answer and get next question
      const currentQ = questions[currentQuestion];
      if (currentQ) {
        const aiResponse = currentQ.followUp(currentMessage);

        const aiMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: aiResponse,
          timestamp: new Date()
        };

        setConversation(prev => [...prev, aiMessage]);

        if (currentQuestion < questions.length - 1) {
          setCurrentQuestion(prev => prev + 1);
        } else {
          // Add generate course button
          setTimeout(() => {
            const actionMessage: ConversationMessage = {
              id: (Date.now() + 2).toString(),
              type: 'ai',
              content: '',
              timestamp: new Date(),
              isAction: true,
              actionType: 'generate_course'
            };
            setConversation(prev => [...prev, actionMessage]);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCourse = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.generateCourse({
        subject_name: requirements.subjectName,
        current_level: requirements.currentLevel,
        goals: requirements.goals
      });

      if (response.success) {
        onCourseGenerated(response.data);
        onClose();
      } else {
        throw new Error(response.error || 'Failed to generate course');
      }
    } catch (error) {
      console.error('Error generating course:', error);
      const errorMessage: ConversationMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error while generating your course. Please try again.',
        timestamp: new Date()
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Course Planner</h2>
              <p className="text-sm text-gray-600">Designing your personalized {subjectName} learning journey</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {conversation.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'ai' && (
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div className={`max-w-[70%] ${message.type === 'user' ? 'order-1' : 'order-2'}`}>
                {message.isAction && message.actionType === 'generate_course' ? (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-gray-900">Ready to Generate Your Course!</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-4">
                      I've gathered all the information needed to create your personalized {subjectName} course.
                    </p>
                    <button
                      onClick={generateCourse}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-3 rounded-lg hover:from-green-600 hover:to-blue-600 transition-all flex items-center justify-center gap-2 font-medium"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Zap className="w-5 h-5" />
                      )}
                      Generate My Course
                    </button>
                  </div>
                ) : (
                  <div className={`rounded-lg px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className={`text-sm ${message.type === 'user' ? 'text-white' : 'text-gray-900'}`}>
                      <ReactMarkdown>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    <div className={`text-xs mt-2 ${
                      message.type === 'user' ? 'text-purple-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </div>

              {message.type === 'user' && (
                <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        {!conversation.some(msg => msg.isAction && msg.actionType === 'generate_course') && (
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={2}
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!currentMessage.trim() || isLoading}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-3 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {currentQuestion < questions.length && questions[currentQuestion].options && (
              <div className="mt-3 flex flex-wrap gap-2">
                {questions[currentQuestion].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMessage(option)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursePlanner;