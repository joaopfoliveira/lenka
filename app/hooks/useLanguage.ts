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
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev: Language) => (prev === 'en' ? 'pt' : 'en'));
  }, [setLanguage]);

  return { language, setLanguage, toggleLanguage };
}
