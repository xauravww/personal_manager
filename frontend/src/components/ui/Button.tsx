import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = "relative inline-flex items-center justify-center font-medium transition-all duration-300 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none";

    const variants = {
        primary: "bg-starlight-100 text-void-950 hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]",
        secondary: "bg-void-800 text-starlight-100 border border-void-700 hover:bg-void-700 hover:border-void-600",
        outline: "bg-transparent border border-starlight-100/20 text-starlight-100 hover:bg-starlight-100/5 hover:border-starlight-100/40",
        ghost: "bg-transparent text-starlight-300 hover:text-starlight-100 hover:bg-starlight-100/5",
        danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40",
    };

    const sizes = {
        sm: "text-xs px-3 py-1.5 rounded-lg",
        md: "text-sm px-5 py-2.5 rounded-xl",
        lg: "text-base px-8 py-3.5 rounded-xl",
    };

    return (
        <button
            className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
            disabled={disabled || isLoading}
            {...props}
        >
            {/* Hover Gradient Overlay for Primary/Secondary */}
            {(variant === 'primary' || variant === 'secondary') && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            )}

            {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : leftIcon ? (
                <span className="mr-2 group-hover:-translate-x-0.5 transition-transform duration-200">{leftIcon}</span>
            ) : null}

            <span className="relative z-10 flex items-center gap-2">
                {children}
            </span>

            {!isLoading && rightIcon && (
                <span className="ml-2 group-hover:translate-x-0.5 transition-transform duration-200">{rightIcon}</span>
            )}
        </button>
    );
};

export default Button;
