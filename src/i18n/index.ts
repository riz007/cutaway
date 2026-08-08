import { useCallback } from 'react';
import { useAppStore } from '@/app/store/appStore';
import { en, type TranslationKey } from './en';
import { th } from './th';

export type Locale = 'en' | 'th';

export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'th', label: 'ไทย' },
];

const CATALOGUES: Record<Locale, Partial<Record<TranslationKey, string>>> = { en, th };

export type TranslateParams = Record<string, string | number>;

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
  );
}

export function translate(locale: Locale, key: TranslationKey, params?: TranslateParams): string {
  const value = CATALOGUES[locale]?.[key] ?? en[key];
  return value ? interpolate(value, params) : key;
}

export type TFunction = (key: TranslationKey, params?: TranslateParams) => string;

export function useT(): TFunction {
  const locale = useAppStore((s) => s.locale);
  return useCallback<TFunction>((key, params) => translate(locale, key, params), [locale]);
}

export const t = (key: TranslationKey, params?: TranslateParams) => translate('en', key, params);

export type { TranslationKey };
