import mottos from '../data/mottos.json';

/**
 * Gets a daily motto based on the current JST (Tokyo) date.
 * The same motto is shown all day and automatically changes at midnight JST.
 * @param {string} lang - 'zh', 'en', or 'ja'
 * @returns {string} The localized motto
 */
export function getDailyMotto(lang) {
  const entries = mottos[lang] || mottos['en'];
  return entries[Math.floor(Math.random() * entries.length)];
}
