'use client';

import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useSfx } from './SfxProvider';
import { useLanguage } from '../../hooks/useLanguage';

export default function SfxToggle() {
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
      className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-deep/30 bg-blue-mid text-card transition hover:bg-blue-mid/80"
      whileTap={{ scale: 0.92 }}
      aria-label={label}
      title={label}
    >
      {isMuted ? (
        <VolumeX className="h-5 w-5" />
      ) : (
        <Volume2 className="h-5 w-5" />
      )}
    </motion.button>
  );
}
