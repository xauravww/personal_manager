import { useState, useEffect } from 'react';

export const useTypingEffect = (text: string, speed: number = 5, isEnabled: boolean = true) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (!isEnabled) {
            setDisplayedText(text);
            setIsComplete(true);
            return;
        }

        // Reset if text changes significantly (new message)
        if (!text.startsWith(displayedText) && displayedText !== '') {
            setDisplayedText('');
            setIsComplete(false);
        }
    }, [text, isEnabled]);

    useEffect(() => {
        if (!isEnabled || isComplete) return;

        if (displayedText.length < text.length) {
            // Calculate how many characters to add based on speed
            // For very fast speeds, add multiple chars per tick
            const charsToAdd = Math.max(1, Math.floor(10 / Math.max(1, speed)));

            const timeout = setTimeout(() => {
                setDisplayedText(text.slice(0, displayedText.length + charsToAdd));
            }, speed);

            return () => clearTimeout(timeout);
        } else {
            setIsComplete(true);
        }
    }, [displayedText, text, speed, isEnabled, isComplete]);

    return { displayedText, isComplete };
};
