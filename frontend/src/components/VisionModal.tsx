import React, { useState, useRef } from 'react';
import { X, Upload, Eye, FileImage, Brain, Zap } from 'lucide-react';
import { apiClient } from '../api/client';

interface VisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete?: (result: any) => void;
  learningContext?: string;
}

interface AnalysisResult {
  type: 'image' | 'diagram';
  description: string;
  objects?: string[];
  textContent?: string;
  diagramType?: string;
  keyElements?: string[];
  relationships?: string[];
  educationalValue?: string;
  keyConcepts?: string[];
  confidence: number;
}

const VisionModal: React.FC<VisionModalProps> = ({
  isOpen,
  onClose,
  onAnalysisComplete,
  learningContext
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'auto' | 'image' | 'diagram'>('auto');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File, maxWidth: number = 512, maxHeight: number = 512): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and resize
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(base64);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setIsAnalyzing(true); // Show loading while resizing

      try {
        // Resize image to reduce size
        const resizedBase64 = await resizeImage(file);
        setImageUrl(resizedBase64);
        setAnalysisResult(null);
      } catch (error) {
        console.error('Error resizing image:', error);
        // Fallback to original if resizing fails
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          setImageUrl(base64);
          setAnalysisResult(null);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleUrlInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(event.target.value);
    setSelectedFile(null);
    setAnalysisResult(null);
  };

  const analyzeImage = async () => {
    if (!imageUrl) return;

    setIsAnalyzing(true);
    try {
      let result;

      if (analysisMode === 'diagram' || (analysisMode === 'auto' && imageUrl.includes('diagram'))) {
        const response = await apiClient.analyzeDiagram(imageUrl, learningContext);
        if (response.success && response.data) {
          result = {
            type: 'diagram' as const,
            description: response.data.analysis.description,
            diagramType: response.data.analysis.diagramType,
            keyElements: response.data.analysis.keyElements,
            relationships: response.data.analysis.relationships,
            educationalValue: response.data.analysis.educationalValue,
            confidence: 85
          };
        }
      } else {
        const response = await apiClient.analyzeImage(imageUrl, learningContext);
        if (response.success && response.data) {
          result = {
            type: 'image' as const,
            description: response.data.analysis.description,
            objects: response.data.analysis.objects,
            textContent: response.data.analysis.text_content,
            keyConcepts: response.data.analysis.key_concepts,
            confidence: response.data.analysis.confidence
          };
        }
      }

      if (result) {
        setAnalysisResult(result);
        onAnalysisComplete?.(result);
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      // Show error state
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setImageUrl('');
    setAnalysisResult(null);
    setAnalysisMode('auto');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Vision Analysis</h2>
              <p className="text-sm text-gray-600">Analyze images and diagrams for learning</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row h-[calc(90vh-80px)]">
          {/* Left Panel - Input */}
          <div className="flex-1 p-6 border-r border-gray-200">
            <div className="space-y-6">
              {/* Analysis Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Analysis Type
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setAnalysisMode('auto')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      analysisMode === 'auto'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Brain className="w-4 h-4 inline mr-2" />
                    Auto Detect
                  </button>
                  <button
                    onClick={() => setAnalysisMode('image')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      analysisMode === 'image'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FileImage className="w-4 h-4 inline mr-2" />
                    General Image
                  </button>
                  <button
                    onClick={() => setAnalysisMode('diagram')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      analysisMode === 'diagram'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Zap className="w-4 h-4 inline mr-2" />
                    Diagram
                  </button>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Upload Image or Enter URL
                </label>
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 transition-colors"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {selectedFile ? selectedFile.name : 'Click to upload image'}
                      </span>
                    </div>
                  </button>

                  <div className="text-center text-sm text-gray-500">or</div>

                  <input
                    type="url"
                    value={imageUrl}
                    onChange={handleUrlInput}
                    placeholder="Enter image URL..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Analyze Button */}
              <button
                onClick={analyzeImage}
                disabled={!imageUrl || isAnalyzing}
                className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5" />
                    Analyze Image
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="flex-1 p-6 overflow-y-auto">
            {imageUrl && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Preview</h3>
                <div className="bg-gray-100 rounded-lg p-4">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-w-full h-auto rounded-lg shadow-sm"
                    style={{ maxHeight: '300px' }}
                  />
                </div>
              </div>
            )}

            {analysisResult && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Analysis Results</h3>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${
                      analysisResult.confidence > 80 ? 'bg-green-500' :
                      analysisResult.confidence > 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-medium text-green-800">
                      Confidence: {analysisResult.confidence}%
                    </span>
                  </div>
                  <p className="text-green-800">{analysisResult.description}</p>
                </div>

                {analysisResult.type === 'image' && (
                  <div className="space-y-3">
                    {analysisResult.objects && analysisResult.objects.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Objects Identified</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.objects.map((obj, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {obj}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysisResult.textContent && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h4 className="font-medium text-purple-900 mb-2">Text Content</h4>
                        <p className="text-purple-800">{analysisResult.textContent}</p>
                      </div>
                    )}

                    {analysisResult.keyConcepts && analysisResult.keyConcepts.length > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h4 className="font-medium text-orange-900 mb-2">Key Concepts</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.keyConcepts.map((concept, index) => (
                            <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                              {concept}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {analysisResult.type === 'diagram' && (
                  <div className="space-y-3">
                    {analysisResult.diagramType && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <h4 className="font-medium text-indigo-900 mb-2">Diagram Type</h4>
                        <p className="text-indigo-800">{analysisResult.diagramType}</p>
                      </div>
                    )}

                    {analysisResult.keyElements && analysisResult.keyElements.length > 0 && (
                      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                        <h4 className="font-medium text-teal-900 mb-2">Key Elements</h4>
                        <ul className="list-disc list-inside text-teal-800 space-y-1">
                          {analysisResult.keyElements.map((element, index) => (
                            <li key={index}>{element}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisResult.relationships && analysisResult.relationships.length > 0 && (
                      <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                        <h4 className="font-medium text-pink-900 mb-2">Relationships</h4>
                        <ul className="list-disc list-inside text-pink-800 space-y-1">
                          {analysisResult.relationships.map((relationship, index) => (
                            <li key={index}>{relationship}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisResult.educationalValue && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-medium text-yellow-900 mb-2">Educational Value</h4>
                        <p className="text-yellow-800">{analysisResult.educationalValue}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!analysisResult && !isAnalyzing && imageUrl && (
              <div className="text-center py-12 text-gray-500">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Click "Analyze Image" to get AI-powered insights</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisionModal;