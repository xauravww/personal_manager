import React, { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle, Circle, MessageCircle, FileText, Eye, Brain, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import CodeEditor from './CodeEditor';
import { apiClient } from '../api/client';
import { createModel, Model, Recognizer } from 'vosk-browser';

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

  // Audio states
  const [isListening, setIsListening] = useState(false);
  const [voskModel, setVoskModel] = useState<Model | null>(null);
  const [voskRecognizer, setVoskRecognizer] = useState<Recognizer | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null);
  const [startTime, setStartTime] = useState(Date.now());
  const [voskSupported, setVoskSupported] = useState(true);
  const [lastNetworkError, setLastNetworkError] = useState<number>(0);
  const [debugMode, setDebugMode] = useState(false);

  // Check if we're in cooldown period
  const isInCooldown = () => {
    const now = Date.now();
    return lastNetworkError && (now - lastNetworkError) < 5000;
  };

  // Debug function to test speech recognition service
  const testVoskRecognition = async () => {
    setAiResponse(prev => prev ? `${prev}\n\n🔍 Testing speech recognition service...` : '🔍 Testing speech recognition service...');

    // Comprehensive diagnostics
    const diagnostics = [];

    // Check basic requirements
    diagnostics.push(`Browser Support: ${voskSupported ? '✅' : '❌'}`);
    diagnostics.push(`Online Status: ${navigator.onLine ? '✅' : '❌'}`);
    diagnostics.push(`HTTPS: ${window.location.protocol === 'https:' ? '✅' : '❌'}`);
    diagnostics.push(`User Agent: ${navigator.userAgent.split(' ').pop()}`);

    // Check microphone permissions
    const checkMicrophonePermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        diagnostics.push(`Microphone Permission: ${result.state === 'granted' ? '✅' : result.state === 'denied' ? '❌' : '⚠️'} (${result.state})`);
      } catch (error) {
        diagnostics.push(`Microphone Permission: ❓ (Cannot check: ${error.message})`);
      }
    };

    // Check basic internet connectivity
    const checkBasicConnectivity = () => {
      const img = new Image();
      const timeout = setTimeout(() => {
        diagnostics.push(`Basic Connectivity: ❌ (Timeout)`);
      }, 3000);

      img.onload = () => {
        clearTimeout(timeout);
        diagnostics.push(`Basic Connectivity: ✅`);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        diagnostics.push(`Basic Connectivity: ❌`);
      };

      img.src = `https://www.google.com/favicon.ico?v=${Date.now()}`;
    };

    // Check for common blocking issues
    const checkCORS = async () => {
      try {
        // Try to fetch from a known Google service endpoint (this might be blocked)
        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors'
        });
        diagnostics.push(`Google Connectivity: ✅ (Status: ${response.status || 'unknown'})`);
      } catch (error) {
        diagnostics.push(`Google Connectivity: ❌ (${error.message})`);
      }
    };

    // Check speech recognition service endpoints specifically
    const checkSpeechEndpoints = async () => {
      const endpoints = [
        'https://speech.googleapis.com/',
        'https://www.google.com/speech-api/',
        'https://speech.platform.bing.com/'
      ];

      const checks = endpoints.map(async (endpoint) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          const response = await fetch(endpoint, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          diagnostics.push(`Speech Endpoint (${endpoint}): ✅`);
        } catch (error) {
          if (error.name === 'AbortError') {
            diagnostics.push(`Speech Endpoint (${endpoint}): ❌ (Timeout)`);
          } else {
            diagnostics.push(`Speech Endpoint (${endpoint}): ❌ (${error.message})`);
          }
        }
      });

      await Promise.all(checks);
    };

    // Run basic connectivity check
    checkBasicConnectivity();

    // Run permission check
    checkMicrophonePermission();

    // Run diagnostics
    checkCORS().then(() => {
      return checkSpeechEndpoints();
    }).then(async () => {
      // Now test actual speech recognition
      if (!voskSupported) {
        diagnostics.push(`Speech Recognition: ❌ Not supported`);
        setAiResponse(prev => `${prev}\n\n📊 Diagnostics:\n${diagnostics.join('\n')}`);
        return;
      }

      if (!navigator.onLine) {
        diagnostics.push(`Speech Recognition: ❌ Offline`);
        setAiResponse(prev => `${prev}\n\n📊 Diagnostics:\n${diagnostics.join('\n')}`);
        return;
      }

      if (window.location.protocol !== 'https:') {
        diagnostics.push(`Speech Recognition: ❌ HTTPS required`);
        setAiResponse(prev => `${prev}\n\n📊 Diagnostics:\n${diagnostics.join('\n')}`);
        return;
      }

      try {
        const testRecognizer = await initializeVosk();
        if (testRecognizer) {
          diagnostics.push(`Vosk Recognition: ✅ Initialized`);
        } else {
          diagnostics.push(`Vosk Recognition: ❌ Failed to initialize`);
        }
      } catch (error) {
        diagnostics.push(`Vosk Recognition: ❌ Error: ${error.message}`);
      }

      setAiResponse(prev => `${prev}\n\n📊 Diagnostics:\n${diagnostics.join('\n')}`);
    });
  };

  // Audio Functions
  const initializeVosk = async () => {
    try {
      if (!voskModel) {
        // Load the vosk model from local file (served from public directory)
        const model = await createModel('/models/vosk-model-small-en-us-0.15.zip');
        setVoskModel(model);

        // Create recognizer
        const recognizer = new model.KaldiRecognizer(16000);
        recognizer.onresult = (event: any) => {
          const result = event.result;
          if (result && result.text) {
            setCurrentInput(prev => prev + (prev ? ' ' : '') + result.text);
          }
        };
        recognizer.onerror = (error: any) => {
          console.error('Vosk recognition error:', error);
          setIsListening(false);
          setAiResponse(prev => prev ? `${prev}\n\nSpeech recognition error: ${error.message}` : `Speech recognition error: ${error.message}`);
        };
        setVoskRecognizer(recognizer);
      }
      return voskRecognizer;
    } catch (error) {
      console.error('Failed to initialize Vosk:', error);
      setVoskSupported(false);
      setAiResponse(prev => prev ? `${prev}\n\nOffline speech recognition not available. Please use text input.` : `Offline speech recognition not available. Please use text input.`);
      return null;
    }
  };

  const startListening = async () => {
    try {
      // Initialize Vosk if not done
      const recognizer = await initializeVosk();
      if (!recognizer) return;

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && voskRecognizer) {
          const reader = new FileReader();
          reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            voskRecognizer.acceptWaveform(arrayBuffer);
          };
          reader.readAsArrayBuffer(event.data);
        }
      };

      recorder.onstop = () => {
        setIsListening(false);
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start(100); // Collect data every 100ms
      setIsListening(true);

    } catch (error) {
      console.error('Failed to start listening:', error);
      setAiResponse(prev => prev ? `${prev}\n\nFailed to access microphone: ${error.message}` : `Failed to access microphone: ${error.message}`);
    }
  };

  const stopListening = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsListening(false);
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    // Stop any ongoing speech
    if (speechSynthesis) {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // Configure voice settings
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    // Try to use a natural voice
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice =>
      voice.name.includes('Female') || voice.name.includes('Samantha') || voice.name.includes('Zira')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

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
               <div className="flex items-center justify-between">
                 <label className="block text-sm font-medium text-gray-700">
                   Your Response
                 </label>
                 <div className="flex items-center gap-2">
                   <button
                     onClick={voskSupported && navigator.onLine && !isInCooldown() ? (isListening ? stopListening : startListening) : undefined}
                     disabled={!voskSupported || !navigator.onLine || isInCooldown()}
                     className={`p-2 rounded-lg transition-all ${
                       !voskSupported || !navigator.onLine || isInCooldown()
                         ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                         : isListening
                         ? 'bg-red-100 text-red-600 hover:bg-red-200'
                         : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                     }`}
                     title={
                       !voskSupported
                         ? 'Voice input not supported in this browser. Try Chrome or enable in Firefox settings.'
                         : !navigator.onLine
                         ? 'Voice input unavailable while offline. Please check your internet connection.'
                         : isListening
                         ? 'Stop listening'
                         : 'Start voice input'
                     }
                   >
                     {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                   </button>
                  {aiResponse && (
                    <button
                      onClick={isSpeaking ? stopSpeaking : () => speakText(aiResponse)}
                      className={`p-2 rounded-lg transition-all ${
                        isSpeaking
                          ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      }`}
                      title={isSpeaking ? 'Stop speaking' : 'Listen to AI feedback'}
                    >
                      {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Share your thoughts, ask questions, or provide your answer..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
              />
              {isListening && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  Listening... Speak now
                </div>
              )}
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
               <div className="flex items-center justify-between">
                 <label className="block text-sm font-medium text-gray-700">
                   Your Answer
                 </label>
                 <div className="flex items-center gap-2">
                   <button
                     onClick={voskSupported && navigator.onLine ? (isListening ? stopListening : startListening) : undefined}
                     disabled={!voskSupported || !navigator.onLine}
                     className={`p-2 rounded-lg transition-all ${
                       !voskSupported || !navigator.onLine
                         ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                         : isListening
                         ? 'bg-red-100 text-red-600 hover:bg-red-200'
                         : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                     }`}
                     title={
                       !voskSupported
                         ? 'Voice input not supported in this browser. Try Chrome or enable in Firefox settings.'
                         : !navigator.onLine
                         ? 'Voice input unavailable while offline. Please check your internet connection.'
                         : isListening
                         ? 'Stop listening'
                         : 'Start voice input'
                     }
                   >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  {aiResponse && (
                    <button
                      onClick={isSpeaking ? stopSpeaking : () => speakText(aiResponse)}
                      className={`p-2 rounded-lg transition-all ${
                        isSpeaking
                          ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      }`}
                      title={isSpeaking ? 'Stop speaking' : 'Listen to AI feedback'}
                    >
                      {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Provide your detailed answer..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-48 resize-none"
              />
              {isListening && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  Listening... Speak now
                </div>
              )}
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
               <div className="flex items-center justify-between">
                 <label className="block text-sm font-medium text-gray-700">
                   Your Code/Solution
                 </label>
                 <div className="flex items-center gap-2">
                   <button
                     onClick={voskSupported && navigator.onLine ? (isListening ? stopListening : startListening) : undefined}
                     disabled={!voskSupported || !navigator.onLine}
                     className={`p-2 rounded-lg transition-all ${
                       !voskSupported || !navigator.onLine
                         ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                         : isListening
                         ? 'bg-red-100 text-red-600 hover:bg-red-200'
                         : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                     }`}
                     title={
                       !voskSupported
                         ? 'Voice input not supported in this browser. Try Chrome or enable in Firefox settings.'
                         : !navigator.onLine
                         ? 'Voice input unavailable while offline. Please check your internet connection.'
                         : isListening
                         ? 'Stop listening'
                         : 'Start voice input'
                     }
                   >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  {aiResponse && (
                    <button
                      onClick={isSpeaking ? stopSpeaking : () => speakText(aiResponse)}
                      className={`p-2 rounded-lg transition-all ${
                        isSpeaking
                          ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      }`}
                      title={isSpeaking ? 'Stop speaking' : 'Listen to AI feedback'}
                    >
                      {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

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

              {isListening && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  Listening... Speak now
                </div>
              )}
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
               <div className="flex items-center justify-between">
                 <label className="block text-sm font-medium text-gray-700">
                   Your Reflection
                 </label>
                 <div className="flex items-center gap-2">
                   <button
                     onClick={voskSupported && navigator.onLine ? (isListening ? stopListening : startListening) : undefined}
                     disabled={!voskSupported || !navigator.onLine}
                     className={`p-2 rounded-lg transition-all ${
                       !voskSupported || !navigator.onLine
                         ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                         : isListening
                         ? 'bg-red-100 text-red-600 hover:bg-red-200'
                         : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                     }`}
                     title={
                       !voskSupported
                         ? 'Voice input not supported in this browser. Try Chrome or enable in Firefox settings.'
                         : !navigator.onLine
                         ? 'Voice input unavailable while offline. Please check your internet connection.'
                         : isListening
                         ? 'Stop listening'
                         : 'Start voice input'
                     }
                   >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  {aiResponse && (
                    <button
                      onClick={isSpeaking ? stopSpeaking : () => speakText(aiResponse)}
                      className={`p-2 rounded-lg transition-all ${
                        isSpeaking
                          ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      }`}
                      title={isSpeaking ? 'Stop speaking' : 'Listen to AI feedback'}
                    >
                      {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Reflect on what you've learned and how you'll apply it..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-32 resize-none"
              />
              {isListening && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  Listening... Speak now
                </div>
              )}
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
        {/* Debug Mode Indicator */}
        {debugMode && (
          <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-yellow-800 font-medium">🔧 Debug Mode Enabled</span>
              <span className="text-xs text-yellow-600">Press Ctrl+Shift+D to toggle</span>
            </div>
            <div className="text-xs text-yellow-700 mt-1">
              Online: {navigator.onLine ? '✅' : '❌'} |
              Speech Supported: {voskSupported ? '✅' : '❌'} |
              In Cooldown: {isInCooldown() ? `✅ (${Math.ceil((5000 - (Date.now() - lastNetworkError)) / 1000)}s)` : '❌'}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={testVoskRecognition}
                className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
              >
                Test Speech Service
              </button>
              {isInCooldown() && (
                <button
                  onClick={() => setLastNetworkError(0)}
                  className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                >
                  Reset Cooldown
                </button>
              )}
            </div>
          </div>
        )}

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

   // Initialize speech synthesis on mount and handle online/offline status
  React.useEffect(() => {
    if ('speechSynthesis' in window) {
      setSpeechSynthesis(window.speechSynthesis);
    }

    // Handle online/offline status changes
    const handleOnline = () => {
      // User came back online - could show a subtle notification
      console.log('Connection restored');
    };

    const handleOffline = () => {
      // User went offline - could disable voice features
      console.log('Connection lost');
    };

    // Add keyboard shortcut for debug mode (Ctrl+Shift+D)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setDebugMode(prev => !prev);
        console.log('Speech recognition debug mode:', !debugMode);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [debugMode]);

};

export default AssignmentJourney;