'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getStoredLocale, setStoredLocale, t as tHelper, type LocaleCode } from '@/lib/i18n';
import en from '@/locales/en.json';
import hi from '@/locales/hi.json';
import te from '@/locales/te.json';
import ta from '@/locales/ta.json';

const messages: Record<LocaleCode, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  hi: hi as Record<string, unknown>,
  te: te as Record<string, unknown>,
  ta: ta as Record<string, unknown>,
};

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(getStoredLocale);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    setStoredLocale(next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return tHelper(messages[locale], key, params);
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  // Sync document language for accessibility and RTL if needed later
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'en' ? 'en' : locale === 'hi' ? 'hi' : locale === 'te' ? 'te' : 'ta';
    }
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
