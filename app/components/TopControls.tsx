'use client';

'use client';

'use client';

import { Menu } from 'lucide-react';
import { useSfx } from './sfx/SfxProvider';
import SfxToggle from './sfx/SfxToggle';
import { useLanguage, type Language } from '../hooks/useLanguage';

type FlagOption = { value: Language; emoji: string; label: string };

const flagOptions: FlagOption[] = [
  { value: 'pt', emoji: '🇵🇹', label: 'Português' },
  { value: 'en', emoji: '🇬🇧', label: 'English' },
];

export default function TopControls({
  className = '',
  onOpenSettings,
  isMobile = false,
}: {
  className?: string;
  onOpenSettings?: () => void;
  isMobile?: boolean;
}) {
  const { language, setLanguage } = useLanguage();
  const { playTick } = useSfx();

  return (
    <div
      className={`fixed right-3 top-2 z-[120] flex items-center gap-2 sm:right-6 sm:top-4 pointer-events-auto ${className}`}
    >
      {isMobile && onOpenSettings ? (
        <button
          onClick={() => {
            playTick();
            onOpenSettings();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-deep bg-card text-blue-deep shadow-flyer-xs transition hover:-translate-y-0.5 hover:bg-blue-light/40"
          aria-label="Settings"
          title="Settings"
        >
          <Menu className="h-5 w-5" />
        </button>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
