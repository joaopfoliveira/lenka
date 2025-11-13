'use client';

import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useSfx } from './SfxProvider';

export default function SfxToggle() {
  const { isMuted, toggleMute, playTick } = useSfx();

  return (
    <motion.button
      onClick={() => {
        playTick();
        toggleMute();
      }}
      className="group inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-lenka-gold bg-gradient-to-br from-lenka-gold/20 to-transparent text-lenka-gold shadow-lenka-card transition hover:scale-105 hover:border-lenka-goldBright hover:text-white"
      whileTap={{ scale: 0.92 }}
      aria-label={isMuted ? 'Unmute SFX' : 'Mute SFX'}
    >
      {isMuted ? (
        <VolumeX className="h-6 w-6 drop-shadow-[0_0_10px_rgba(255,215,111,0.6)]" />
      ) : (
        <Volume2 className="h-6 w-6 drop-shadow-[0_0_14px_rgba(255,235,133,0.9)]" />
      )}
    </motion.button>
  );
}
