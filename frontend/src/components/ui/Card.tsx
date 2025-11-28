import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
    glass?: boolean;
}

const Card: React.FC<CardProps> = ({
    children,
    className = '',
    hoverEffect = false,
    glass = false
}) => {
    return (
        <div
            className={`
        relative rounded-2xl border
        ${glass
                    ? 'bg-void-800/40 backdrop-blur-xl border-starlight-100/5'
                    : 'bg-void-900 border-void-800'
                }
        ${hoverEffect
                    ? 'hover:border-starlight-100/20 hover:bg-void-800/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300'
                    : ''
                }
        ${className}
      `}
        >
            {/* Noise Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none rounded-2xl overflow-hidden"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />

            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};

export default Card;
