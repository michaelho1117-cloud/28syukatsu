import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import jaTranslation from './locales/ja.json';
import zhTranslation from './locales/zh.json';

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      ja: { translation: jaTranslation },
      zh: { translation: zhTranslation }
    },
    lng: 'ja', // Set Japanese as the default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;
