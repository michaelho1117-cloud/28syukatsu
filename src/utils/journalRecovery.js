const LEGACY_JOURNAL_KEYS = ['diary', 'journal'];

// Recovered from legacy browser localStorage LevelDB after the storage key/origin split.
const RECOVERED_JOURNAL_BACKUP = [
  {
    id: 202603080001,
    date: '2026-03-08',
    type: 'research',
    company: 'PwC Japan',
    title: 'PwCの情報整理',
    content: '集中\n\nPwCの情報整理。3/25が重要締切。',
    createdAt: '2026-03-08T00:00:00.000Z'
  }
];

function isJournalEntryArray(value) {
  return Array.isArray(value) && value.every((entry) => entry && typeof entry === 'object');
}

function normalizeLegacyDiaryEntry(entry, normalizeType) {
  const date = entry?.date || new Date().toISOString().slice(0, 10);
  const note = typeof entry?.note === 'string' ? entry.note.trim() : '';
  const mood = typeof entry?.mood === 'string' ? entry.mood.trim() : '';
  const company = typeof entry?.company === 'string' ? entry.company.trim() : '';
  const title =
    typeof entry?.title === 'string' && entry.title.trim()
      ? entry.title.trim()
      : note
        ? note.split(/[。.!?\n]/).find(Boolean)?.trim() || 'Recovered Journal Entry'
        : 'Recovered Journal Entry';

  const contentParts = [mood, note].filter(Boolean);

  return {
    id: entry?.id || Number(date.replace(/-/g, '')) || Date.now(),
    date,
    type: normalizeType(entry?.type || 'daily'),
    company,
    title,
    content: contentParts.join('\n\n') || '',
    createdAt: entry?.createdAt || `${date}T00:00:00.000Z`
  };
}

export function loadJournalEntriesWithRecovery(storageKey, normalizeType) {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isJournalEntryArray(parsed)) {
        return parsed.map((entry) => ({
          ...entry,
          type: normalizeType(entry.type)
        }));
      }
    }
  } catch {
    // fall through to legacy recovery
  }

  for (const legacyKey of LEGACY_JOURNAL_KEYS) {
    try {
      const raw = window.localStorage.getItem(legacyKey);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!isJournalEntryArray(parsed)) continue;
      const migrated = parsed.map((entry) => normalizeLegacyDiaryEntry(entry, normalizeType));
      window.localStorage.setItem(storageKey, JSON.stringify(migrated));
      return migrated;
    } catch {
      // keep trying other recovery sources
    }
  }

  const restored = RECOVERED_JOURNAL_BACKUP.map((entry) => normalizeLegacyDiaryEntry(entry, normalizeType));
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(restored));
  } catch {
    // ignore storage write failures, still return recovered data
  }
  return restored;
}
