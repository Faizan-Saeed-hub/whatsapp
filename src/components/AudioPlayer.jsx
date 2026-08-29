import { useState, useRef, useEffect } from 'react';
import Play from './icons/Play';
import Pause from './icons/Pause';

const AudioPlayer = ({ src }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1); // 1, 1.5, 2
    const audioRef = useRef(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration || 0);
        const onEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', onEnded);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play().then(() => setIsPlaying(true)).catch(console.error);
        }
    };

    const handleSeek = (e) => {
        const audio = audioRef.current;
        if (!audio) return;
        const newTime = parseFloat(e.target.value);
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const toggleSpeed = () => {
        const audio = audioRef.current;
        if (!audio) return;

        const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
        audio.playbackRate = nextSpeed;
        setSpeed(nextSpeed);
    };

    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div className="audio-player">
            <audio ref={audioRef} src={src} preload="metadata" />

            <button 
                type="button" 
                className="audio-play-btn" 
                onClick={togglePlay}
                title={isPlaying ? "Pause" : "Play"}
            >
                {isPlaying ? <Pause /> : <Play />}
            </button>

            <div className="audio-track">
                <input 
                    type="range" 
                    min="0" 
                    max={duration || 100} 
                    value={currentTime} 
                    onChange={handleSeek}
                    className="audio-slider"
                />
                <div className="audio-meta">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* WhatsApp Speed Toggle */}
            <button 
                type="button" 
                className="audio-speed-btn" 
                onClick={toggleSpeed}
                title="Change playback speed"
            >
                {speed}x
            </button>
        </div>
    );
};

export default AudioPlayer;
