'use client';

'use client';

import { useSfx } from './sfx/SfxProvider';
import SfxToggle from './sfx/SfxToggle';
import { useLanguage, type Language } from '../hooks/useLanguage';

type FlagOption = { value: Language; emoji: string; label: string };

const flagOptions: FlagOption[] = [
  { value: 'pt', emoji: '🇵🇹', label: 'Português' },
  { value: 'en', emoji: '🇬🇧', label: 'English' },
];

export default function TopControls({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  const { playTick } = useSfx();

  return (
    <div className={`fixed right-3 top-2 z-50 flex items-center gap-2 sm:right-6 sm:top-4 ${className}`}>
      <div className="flex items-center gap-1 rounded-full bg-card/90 px-1 py-0.5 shadow-flyer-xs backdrop-blur">
        {flagOptions.map((option) => {
          const active = option.value === language;
          return (
            <button
              key={option.value}
              onClick={() => {
                playTick();
                setLanguage(option.value);
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-lg transition ${
                active
                  ? 'border-blue-deep bg-blue-mid text-card shadow-flyer-xs'
                  : 'border-blue-deep/40 bg-card text-blue-deep hover:bg-blue-light/30'
              }`}
              aria-label={option.label}
              title={option.label}
            >
              <span>{option.emoji}</span>
            </button>
          );
        })}
      </div>
      <div className="ml-1">
        <SfxToggle size={36} />
      </div>
    </div>
  );
}
