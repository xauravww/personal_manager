import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const NotFound = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;

            const x = (clientX / innerWidth - 0.5) * 20;
            const y = (clientY / innerHeight - 0.5) * 20;

            containerRef.current.style.setProperty('--mouse-x', `${x}deg`);
            containerRef.current.style.setProperty('--mouse-y', `${y}deg`);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] overflow-hidden font-sans selection:bg-white selection:text-black perspective-1000 relative">
            {/* Grain Overlay */}
            <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.07] mix-blend-overlay"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />

            {/* Grid Background */}
            <div className="absolute inset-0 overflow-hidden perspective-1000">
                <div
                    ref={containerRef}
                    className="absolute inset-[-50%] w-[200%] h-[200%] origin-center transform-style-3d transition-transform duration-100 ease-out"
                    style={{
                        transform: 'rotateX(var(--mouse-y, 0deg)) rotateY(var(--mouse-x, 0deg))',
                        background: `
              linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
                        backgroundSize: '4rem 4rem',
                        maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)'
                    }}
                />
            </div>

            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
                <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                    {/* Typography Section */}
                    <div className="space-y-8 order-2 lg:order-1">
                        <div className="space-y-2">
                            <p className="font-mono text-xs tracking-[0.2em] text-neutral-500 uppercase">
                                System Error • 404
                            </p>
                            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9] mix-blend-difference">
                                REALITY<br />
                                <span className="italic font-serif font-light text-neutral-400">NOT</span><br />
                                FOUND
                            </h1>
                        </div>

                        <div className="h-px w-24 bg-white/20" />

                        <p className="text-neutral-400 max-w-sm leading-relaxed text-sm md:text-base">
                            The coordinates you entered point to a void in the architecture.
                            This sector has not been constructed yet.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Link
                                to="/dashboard"
                                className="group relative inline-flex items-center justify-center px-8 py-4 bg-white text-black font-medium tracking-wide overflow-hidden transition-all hover:bg-neutral-200"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    RETURN TO BASE
                                </span>
                                <div className="absolute inset-0 bg-neutral-200 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                            </Link>

                            <button
                                onClick={() => window.history.back()}
                                className="group inline-flex items-center justify-center px-8 py-4 border border-white/10 text-neutral-300 font-medium tracking-wide hover:bg-white/5 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                                GO BACK
                            </button>
                        </div>
                    </div>

                    {/* Visual Element - The "Glitch" Cube */}
                    <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
                        <div className="relative w-64 h-64 md:w-80 md:h-80">
                            <div className="absolute inset-0 border border-white/20 animate-[spin_10s_linear_infinite]" />
                            <div className="absolute inset-4 border border-white/10 animate-[spin_15s_linear_infinite_reverse]" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10rem] font-bold text-white/5 select-none blur-sm animate-pulse">
                                    ?
                                </span>
                            </div>
                            {/* Glitch slices */}
                            <div className="absolute top-1/4 left-0 w-full h-2 bg-white/10 animate-pulse" style={{ animationDelay: '0.2s' }} />
                            <div className="absolute bottom-1/3 left-0 w-full h-1 bg-white/20 animate-pulse" style={{ animationDelay: '1.5s' }} />
                            <div className="absolute top-1/2 -left-4 w-[110%] h-px bg-red-500/50 mix-blend-screen" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end text-[10px] font-mono text-neutral-600 uppercase tracking-widest pointer-events-none">
                <div>
                    COORD: NULL<br />
                    SECTOR: UNDEFINED
                </div>
                <div className="text-right">
                    ERR_Code: 404_VOID<br />
                    System_Status: UNSTABLE
                </div>
            </div>
        </div>
    );
};

export default NotFound;
