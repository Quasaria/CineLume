import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import en from './locales/en.json';

export const SUPPORTED_LANGS = ['fr', 'en'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'cinelume_lang',
    },
  });

function applyHtmlLang(lng: string) {
  const short = lng.split('-')[0];
  document.documentElement.lang = short;
}

applyHtmlLang(i18n.language || 'fr');
i18n.on('languageChanged', applyHtmlLang);

export function tmdbLang(): string {
  const lng = (i18n.language || 'fr').toLowerCase();
  if (lng.startsWith('en')) return 'en-US';
  if (lng.startsWith('fr')) return 'fr-FR';
  return 'fr-FR';
}

export default i18n;
