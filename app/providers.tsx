'use client';

import { type ReactNode } from 'react';
import { SfxProvider } from './components/sfx/SfxProvider';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SfxProvider>
      <div className="relative min-h-screen">{children}</div>
    </SfxProvider>
  );
}
