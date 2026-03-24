const PRACTICE_RECORDS_KEY = 'practice-engine-records-v1';
const AI_FEEDBACK_KEY = 'practice-engine-feedback-v1';
const LESSON_REFLECTIONS_KEY = 'practice-engine-lesson-reflections-v1';

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadLocalPracticeRecords() {
  return readJson(PRACTICE_RECORDS_KEY, []);
}

export function saveLocalPracticeRecord(record) {
  const current = loadLocalPracticeRecords();
  const next = [record, ...current].slice(0, 200);
  writeJson(PRACTICE_RECORDS_KEY, next);
  return record;
}

export function loadLocalAiFeedback() {
  return readJson(AI_FEEDBACK_KEY, []);
}

export function saveLocalAiFeedback(feedback) {
  const current = loadLocalAiFeedback();
  const next = [feedback, ...current].slice(0, 200);
  writeJson(AI_FEEDBACK_KEY, next);
  return feedback;
}

export function loadLessonReflections() {
  return readJson(LESSON_REFLECTIONS_KEY, {});
}

export function getLessonReflection(lessonId) {
  const current = loadLessonReflections();
  return current?.[lessonId] || '';
}

export function saveLessonReflection(lessonId, content) {
  const current = loadLessonReflections();
  const next = {
    ...current,
    [lessonId]: String(content || ''),
  };
  writeJson(LESSON_REFLECTIONS_KEY, next);
  return next[lessonId];
}
