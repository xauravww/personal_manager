import React from 'react';
import { ChefHat, Sparkles } from 'lucide-react';

interface CookingAnimationProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const CookingAnimation: React.FC<CookingAnimationProps> = ({
  size = 'md',
  message = "Cooking up something special..."
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        {/* Main cooking pot/bowl */}
        <div className={`bg-gradient-to-br from-orange-400 to-red-500 rounded-full ${sizeClasses[size]} flex items-center justify-center animate-bounce`}>
          <ChefHat className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'} text-white`} />
        </div>

        {/* Steam bubbles */}
        <div className="absolute -top-1 -right-1">
          <div className="w-1 h-1 bg-white rounded-full animate-ping opacity-75"></div>
        </div>
        <div className="absolute -top-2 -left-1">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-60" style={{animationDelay: '0.2s'}}></div>
        </div>
        <div className="absolute -top-1 left-1">
          <div className="w-1 h-1 bg-white rounded-full animate-ping opacity-80" style={{animationDelay: '0.4s'}}></div>
        </div>

        {/* Sparkles */}
        <Sparkles className={`absolute -top-2 right-1 ${size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'} text-yellow-400 animate-pulse`} />
      </div>

      {message && (
        <span className={`${textSizeClasses[size]} text-gray-600 font-medium`}>
          {message}
        </span>
      )}
    </div>
  );
};

export default CookingAnimation;