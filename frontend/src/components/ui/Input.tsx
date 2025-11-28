import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
    label,
    error,
    icon,
    className = '',
    ...props
}) => {
    return (
        <div className="w-full space-y-1.5">
            {label && (
                <label className="block text-xs font-medium text-starlight-400 uppercase tracking-wider ml-1">
                    {label}
                </label>
            )}
            <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-starlight-500 transition-colors">
                    {icon}
                </div>
                <input
                    className={`
            w-full bg-void-950/50 border border-void-800 rounded-xl px-4 py-3
            text-starlight-100 placeholder-starlight-500
            focus:outline-none focus:border-starlight-100/30 focus:bg-void-900 focus:ring-1 focus:ring-starlight-100/30
            transition-all duration-200
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : ''}
            ${className}
          `}
                    {...props}
                />
            </div>
            {error && (
                <p className="text-xs text-red-400 ml-1 animate-fade-in">
                    {error}
                </p>
            )}
        </div>
    );
};

export default Input;
