'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type SfxContextValue = {
  isMuted: boolean;
  toggleMute: () => void;
  playTick: () => void;
  playDing: () => void;
  playBuzzer: () => void;
  playFanfare: () => void;
  playApplause: () => void;
};

const SfxContext = createContext<SfxContextValue | null>(null);
const STORAGE_KEY = 'lenka-sfx-muted';

export function SfxProvider({ children }: { children: ReactNode }) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const ensureContext = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!audioContextRef.current) {
      const context = new window.AudioContext();
      const gain = context.createGain();
      gain.gain.value = isMuted ? 0 : 0.9;
      gain.connect(context.destination);
      audioContextRef.current = context;
      masterGainRef.current = gain;
    }

    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, [isMuted]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsMuted(stored === 'true');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, String(isMuted));
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = isMuted ? 0 : 0.9;
    }
  }, [isMuted]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      ensureContext();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [ensureContext]);

  const withAudio = useCallback(
    (cb: (context: AudioContext) => void) => {
      const context = ensureContext();
      if (!context || isMuted) return;
      cb(context);
    },
    [ensureContext, isMuted]
  );

  const playTone = useCallback(
    (
      frequency: number,
      duration = 0.4,
      type: OscillatorType = 'sine',
      volume = 0.7
    ) => {
      withAudio((context) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, now);

        const output = masterGainRef.current ?? context.destination;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        oscillator.connect(gain);
        gain.connect(output);

        oscillator.start(now);
        oscillator.stop(now + duration + 0.05);
      });
    },
    [withAudio]
  );

  const playTick = useCallback(() => {
    playTone(280, 0.08, 'sine', 0.12);
  }, [playTone]);

  const playDing = useCallback(() => {
    playTone(880, 0.3, 'triangle', 0.5);
    playTone(1320, 0.25, 'sine', 0.4);
  }, [playTone]);

  const playBuzzer = useCallback(() => {
    playTone(160, 0.5, 'sawtooth', 0.4);
    playTone(120, 0.6, 'square', 0.4);
  }, [playTone]);

  const playFanfare = useCallback(() => {
    withAudio((context) => {
      const notes = [523, 659, 784, 880];
      notes.forEach((frequency, index) => {
        const start = context.currentTime + index * 0.18;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const output = masterGainRef.current ?? context.destination;

        oscillator.type = index % 2 === 0 ? 'square' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.5, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);

        oscillator.connect(gain);
        gain.connect(output);

        oscillator.start(start);
        oscillator.stop(start + 0.45);
      });
    });
  }, [withAudio]);

  const playApplause = useCallback(() => {
    withAudio((context) => {
      const output = masterGainRef.current ?? context.destination;
      const now = context.currentTime;

      // Soft pad chord
      const chord = [392, 494, 587]; // G major-ish
      chord.forEach((frequency, idx) => {
        const osc = context.createOscillator();
        const padGain = context.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency, now);
        const start = now + idx * 0.02;
        padGain.gain.setValueAtTime(0.0001, start);
        padGain.gain.linearRampToValueAtTime(0.18, start + 0.3);
        padGain.gain.exponentialRampToValueAtTime(0.0001, start + 2.4);
        osc.connect(padGain).connect(output);
        osc.start(start);
        osc.stop(start + 2.5);
      });

      // Layered claps
      const duration = 2.0;
      const bufferSize = context.sampleRate * duration;
      const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i += 1) {
        const t = i / bufferSize;
        const decay = Math.exp(-t * 6);
        const ripple = Math.sin(t * Math.PI * 12) * 0.3 + 0.7;
        data[i] = (Math.random() * 2 - 1) * decay * ripple;
      }
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1050;
      filter.Q.value = 0.9;
      const clapGain = context.createGain();
      clapGain.gain.setValueAtTime(0.0001, now);
      clapGain.gain.linearRampToValueAtTime(0.4, now + 0.08);
      clapGain.gain.exponentialRampToValueAtTime(0.05, now + 1.3);
      clapGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);
      noise.connect(filter).connect(clapGain).connect(output);
      noise.start(now);
      noise.stop(now + duration + 0.2);
    });
  }, [withAudio]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      isMuted,
      toggleMute,
      playTick,
      playDing,
      playBuzzer,
      playFanfare,
      playApplause,
    }),
    [isMuted, playApplause, playBuzzer, playDing, playFanfare, playTick, toggleMute]
  );

  return <SfxContext.Provider value={value}>{children}</SfxContext.Provider>;
}

export function useSfx() {
  const ctx = useContext(SfxContext);
  if (!ctx) {
    throw new Error('useSfx must be used inside <SfxProvider>');
  }
  return ctx;
}
