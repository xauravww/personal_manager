import React, { useState, useRef, useEffect } from 'react';
import { Play, RotateCcw, Copy, Check, Terminal, AlertCircle } from 'lucide-react';

interface CodeEditorProps {
  initialCode?: string;
  language?: string;
  onCodeChange?: (code: string) => void;
  onRun?: (code: string) => Promise<{ output: string; error?: string }>;
  placeholder?: string;
  height?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode = '',
  language = 'javascript',
  onCodeChange,
  onRun,
  placeholder = 'Write your code here...',
  height = '400px'
}) => {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('keydown', handleKeyDown);
      return () => textarea.removeEventListener('keydown', handleKeyDown);
    }
  }, [code]);

  const handleCodeChange = (value: string) => {
    setCode(value);
    onCodeChange?.(value);
  };

  const handleRun = async () => {
    if (!onRun) return;

    setIsRunning(true);
    setOutput('');

    try {
      const result = await onRun(code);
      setOutput(result.output || result.error || 'No output');
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCode(initialCode);
    setOutput('');
    onCodeChange?.(initialCode);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const getLanguageSyntax = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'javascript':
      case 'js':
        return 'javascript';
      case 'python':
      case 'py':
        return 'python';
      case 'java':
        return 'java';
      case 'cpp':
      case 'c++':
        return 'cpp';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      default:
        return 'text';
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700 capitalize">
            {language} Editor
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Copy code to clipboard"
            aria-label={copied ? "Code copied to clipboard" : "Copy code to clipboard"}
          >
            {copied ? <Check className="w-4 h-4 text-green-600" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Reset code to initial state"
            aria-label="Reset code to initial state"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>

          {onRun && (
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              aria-label={isRunning ? "Running code..." : "Run code (Ctrl+Enter)"}
            >
              {isRunning ? (
                <>
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" aria-hidden="true" />
                  Run
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Code Editor */}
      <div className="relative">
        <div id="code-editor-description" className="sr-only">
          Code editor for {language}. Use Tab to indent, Ctrl+Enter to run code.
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 font-mono text-sm bg-gray-900 text-green-400 border-0 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          style={{
            height,
            tabSize: 2,
            whiteSpace: 'pre',
            overflowWrap: 'normal',
            overflowX: 'auto'
          }}
          spellCheck={false}
          aria-label={`${language} code editor`}
          aria-describedby="code-editor-description"
        />

        {/* Line numbers (simplified) */}
        <div className="absolute left-0 top-0 bg-gray-800 text-gray-500 text-xs font-mono px-2 py-3 select-none border-r border-gray-700">
          {code.split('\n').map((_, index) => (
            <div key={index} className="leading-5 h-5">
              {index + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Output Panel */}
      {output && (
        <div className="border-t border-gray-200 bg-gray-50" role="region" aria-label="Code execution output">
          <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-gray-600" aria-hidden="true" />
            <span className="text-sm font-medium text-gray-700">Output</span>
          </div>
          <div className="p-4">
            <pre
              className="text-sm font-mono text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200 max-h-48 overflow-y-auto"
              role="log"
              aria-live="polite"
              aria-label="Execution result"
            >
              {output}
            </pre>
          </div>
        </div>
      )}

      {/* Error State */}
      {output && output.includes('Error:') && (
        <div className="border-t border-red-200 bg-red-50" role="alert" aria-live="assertive">
          <div className="px-4 py-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" aria-hidden="true" />
            <span className="text-sm font-medium text-red-800">Execution Error</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;