'use client';

import { type ReactNode } from 'react';
import { SfxProvider } from './components/sfx/SfxProvider';
import SfxToggle from './components/sfx/SfxToggle';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SfxProvider>
      <div className="relative min-h-screen">
        <div className="fixed top-4 right-4 z-50">
          <SfxToggle />
        </div>
        {children}
      </div>
    </SfxProvider>
  );
}
