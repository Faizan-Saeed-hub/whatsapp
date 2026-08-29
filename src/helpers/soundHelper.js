// Web Audio API Synthesizer for WhatsApp incoming message notification chime
class SoundHelper {
    constructor() {
        this.audioCtx = null;
    }

    init() {
        if (!this.audioCtx && typeof window !== 'undefined') {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
    }

    playIncomingChime() {
        try {
            this.init();
            if (!this.audioCtx) return;

            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const now = this.audioCtx.currentTime;

            // Tone 1: 784 Hz (G5)
            const osc1 = this.audioCtx.createOscillator();
            const gain1 = this.audioCtx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(784, now);
            gain1.gain.setValueAtTime(0.15, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc1.connect(gain1);
            gain1.connect(this.audioCtx.destination);
            osc1.start(now);
            osc1.stop(now + 0.12);

            // Tone 2: 1046.5 Hz (C6)
            const osc2 = this.audioCtx.createOscillator();
            const gain2 = this.audioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1046.5, now + 0.08);
            gain2.gain.setValueAtTime(0.18, now + 0.08);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            osc2.connect(gain2);
            gain2.connect(this.audioCtx.destination);
            osc2.start(now + 0.08);
            osc2.stop(now + 0.28);
        } catch (e) {
            console.warn("Audio chime play error:", e);
        }
    }
}

export const soundHelper = new SoundHelper();
