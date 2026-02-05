/**
 * Simple i18n: nested keys (e.g. "nav.discover") and {placeholder} interpolation.
 */

export type LocaleCode = 'en' | 'hi' | 'te' | 'ta';

const LOCALE_STORAGE_KEY = 'nueflirt_locale';

function getNested(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function getStoredLocale(): LocaleCode {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === 'hi' || stored === 'te' || stored === 'ta' || stored === 'en') return stored;
  return 'en';
}

export function setStoredLocale(locale: LocaleCode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function t(
  messages: Record<string, unknown>,
  key: string,
  params?: Record<string, string | number>
): string {
  const value = getNested(messages, key);
  let str = typeof value === 'string' ? value : key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return str;
}

export const localeLabels: Record<LocaleCode, string> = {
  en: 'English',
  hi: 'हिन्दी',
  te: 'తెలుగు',
  ta: 'தமிழ்',
};
