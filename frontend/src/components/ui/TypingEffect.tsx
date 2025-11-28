import React, { useState, useEffect } from 'react';

interface TypingEffectProps {
    text: string;
    speed?: number;
    onComplete?: () => void;
    className?: string;
}

const TypingEffect: React.FC<TypingEffectProps> = ({
    text,
    speed = 10,
    onComplete,
    className = ''
}) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        // Reset when text changes significantly (new message)
        // But we need to handle streaming updates where text grows
        if (!text.startsWith(displayedText) && displayedText !== '') {
            // Text changed completely, reset
            setDisplayedText('');
            setIsComplete(false);
        }
    }, [text]);

    useEffect(() => {
        if (isComplete) return;

        if (displayedText.length < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(text.slice(0, displayedText.length + 1));
            }, speed);

            return () => clearTimeout(timeout);
        } else {
            setIsComplete(true);
            if (onComplete) onComplete();
        }
    }, [displayedText, text, speed, isComplete, onComplete]);

    // If text is already fully displayed (e.g. from history), just show it
    useEffect(() => {
        if (text && displayedText === '' && speed === 0) {
            setDisplayedText(text);
            setIsComplete(true);
        }
    }, [text, speed]);

    return <span className={className}>{displayedText}</span>;
};

export default TypingEffect;
