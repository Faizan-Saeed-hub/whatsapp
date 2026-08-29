import { useEffect, useState } from 'react';

const UndoDeleteToast = ({ isOpen, onUndo, onExpire, duration = 3000 }) => {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (!isOpen) {
            setProgress(100);
            return;
        }

        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);

            if (elapsed >= duration) {
                clearInterval(interval);
                onExpire();
            }
        }, 50);

        return () => clearInterval(interval);
    }, [isOpen, duration, onExpire]);

    if (!isOpen) return null;

    return (
        <div className="undo-toast-container">
            <div className="undo-toast-box">
                <span className="undo-toast-text">Message deleted</span>
                <button type="button" className="undo-toast-btn" onClick={onUndo}>
                    UNDO
                </button>
            </div>
            <div className="undo-progress-bar-track">
                <div 
                    className="undo-progress-bar-fill" 
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

export default UndoDeleteToast;
