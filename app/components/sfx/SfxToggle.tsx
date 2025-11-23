'use client';

import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useSfx } from './SfxProvider';
import { useLanguage } from '../../hooks/useLanguage';

export default function SfxToggle({ size = 40, className = '' }: { size?: number; className?: string }) {
  const { isMuted, toggleMute, playTick } = useSfx();
  const { language } = useLanguage();
  const label = isMuted
    ? language === 'pt'
      ? 'Ativar efeitos sonoros'
      : 'Unmute sound effects'
    : language === 'pt'
    ? 'Silenciar efeitos sonoros'
    : 'Mute sound effects';

  return (
    <motion.button
      onClick={() => {
        playTick();
        toggleMute();
      }}
      className={`flex items-center justify-center rounded-full border border-blue-deep/30 bg-blue-mid text-card transition hover:bg-blue-mid/80 ${className}`}
      style={{ width: size, height: size }}
      whileTap={{ scale: 0.92 }}
      aria-label={label}
      title={label}
    >
      {isMuted ? (
        <VolumeX style={{ width: Math.round(size * 0.55), height: Math.round(size * 0.55) }} />
      ) : (
        <Volume2 style={{ width: Math.round(size * 0.55), height: Math.round(size * 0.55) }} />
      )}
    </motion.button>
  );
}
