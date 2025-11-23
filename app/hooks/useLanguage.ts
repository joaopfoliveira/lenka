'use client';

import { useCallback, useEffect, useState } from 'react';

export type Language = 'en' | 'pt';

const LANGUAGE_STORAGE_KEY = 'lenka:language';

function loadInitialLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === 'pt' || stored === 'en' ? stored : 'en';
}

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    setLanguageState(loadInitialLanguage());
    const handleSync = () => {
      setLanguageState(loadInitialLanguage());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleSync);
      window.addEventListener('lenka-language-change', handleSync as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleSync);
        window.removeEventListener('lenka-language-change', handleSync as EventListener);
      }
    };
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      window.dispatchEvent(new Event('lenka-language-change'));
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'pt' : 'en');
  }, [language, setLanguage]);

  return { language, setLanguage, toggleLanguage };
}
