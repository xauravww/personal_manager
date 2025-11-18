import React, { useState } from 'react';
import { Play, Terminal, Cpu, HardDrive, Wifi, WifiOff } from 'lucide-react';

interface VirtualEnvironmentProps {
  language: string;
  onExecute: (code: string, language: string) => Promise<{ output: string; error?: string; executionTime?: number }>;
  initialCode?: string;
}

const VirtualEnvironment: React.FC<VirtualEnvironmentProps> = ({
  language,
  onExecute,
  initialCode = ''
}) => {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  const handleExecute = async () => {
    if (!code.trim()) return;

    setIsExecuting(true);
    setOutput('');
    setExecutionTime(null);

    const startTime = Date.now();

    try {
      const result = await onExecute(code, language);
      const endTime = Date.now();
      setExecutionTime(endTime - startTime);

      if (result.error) {
        setOutput(`Error: ${result.error}`);
      } else {
        setOutput(result.output || 'Code executed successfully (no output)');
      }
    } catch (error) {
      setOutput(`Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const getLanguageInfo = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'javascript':
      case 'js':
        return {
          name: 'JavaScript',
          runtime: 'Node.js 18',
          icon: '🟨',
          color: 'text-yellow-600'
        };
      case 'python':
      case 'py':
        return {
          name: 'Python',
          runtime: 'Python 3.11',
          icon: '🐍',
          color: 'text-blue-600'
        };
      case 'java':
        return {
          name: 'Java',
          runtime: 'OpenJDK 17',
          icon: '☕',
          color: 'text-red-600'
        };
      case 'cpp':
      case 'c++':
        return {
          name: 'C++',
          runtime: 'GCC 11',
          icon: '⚡',
          color: 'text-purple-600'
        };
      default:
        return {
          name: lang,
          runtime: 'Unknown',
          icon: '💻',
          color: 'text-gray-600'
        };
    }
  };

  const langInfo = getLanguageInfo(language);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Environment Status Bar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{langInfo.icon}</span>
              <div>
                <span className={`font-medium ${langInfo.color}`}>{langInfo.name}</span>
                <span className="text-sm text-gray-500 ml-2">{langInfo.runtime}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Cpu className="w-4 h-4" />
                <span>2 vCPU</span>
              </div>
              <div className="flex items-center gap-1">
                <HardDrive className="w-4 h-4" />
                <span>512MB RAM</span>
              </div>
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-green-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-600" />
                )}
                <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                  {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleExecute}
            disabled={isExecuting || !isConnected}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isExecuting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Executing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Input */}
      <div className="p-4">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={`Write your ${langInfo.name} code here...`}
          className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
          spellCheck={false}
        />
      </div>

      {/* Output Panel */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Output</span>
          </div>
          {executionTime && (
            <span className="text-xs text-gray-500">
              Executed in {executionTime}ms
            </span>
          )}
        </div>

        <div className="p-4">
          {output ? (
            <pre className="text-sm font-mono text-gray-800 bg-white p-3 rounded border border-gray-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {output}
            </pre>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Run your code to see the output here</p>
            </div>
          )}
        </div>
      </div>

      {/* Environment Info */}
      <div className="border-t border-gray-200 bg-blue-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-blue-800">
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <span>
            Virtual Environment: Isolated execution environment with {langInfo.runtime}.
            Code runs in a secure sandbox with resource limits.
          </span>
        </div>
      </div>
    </div>
  );
};

export default VirtualEnvironment;