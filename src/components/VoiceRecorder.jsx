import { useState, useRef, useEffect } from 'react';
import Trash from './icons/Trash';
import Send from './icons/Send';

const VoiceRecorder = ({ onSendVoice, onCancel }) => {
    const [seconds, setSeconds] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        startRecording();
        return () => {
            stopStream();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                // Convert blob to DataURL for storage & playback
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64Audio = reader.result;
                    if (onSendVoice && audioChunksRef.current.length > 0) {
                        onSendVoice(base64Audio);
                    }
                };
            };

            mediaRecorder.start();
            setIsRecording(true);

            timerRef.current = setInterval(() => {
                setSeconds(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Microphone access error:", err);
            alert("Microphone permission denied or not supported in this browser.");
            if (onCancel) onCancel();
        }
    };

    const handleCancel = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            audioChunksRef.current = []; // clear chunks so onstop does nothing
            mediaRecorderRef.current.stop();
        }
        stopStream();
        if (onCancel) onCancel();
    };

    const handleSend = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        stopStream();
    };

    const formatTimer = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className="voice-recorder-bar">
            <button 
                type="button" 
                className="voice-cancel-btn" 
                onClick={handleCancel}
                title="Cancel Recording"
            >
                <Trash />
            </button>

            <div className="voice-status">
                <span className="recording-pulse"></span>
                <span className="voice-timer">{formatTimer(seconds)}</span>
                <span className="voice-recording-text">Recording voice note...</span>
            </div>

            <button 
                type="button" 
                className="voice-send-btn" 
                onClick={handleSend}
                title="Send Voice Note"
            >
                <Send />
            </button>
        </div>
    );
};

export default VoiceRecorder;
