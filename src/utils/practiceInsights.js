const TRAINING_SIGNAL_KEY = 'shukatsu_training_signals_v1';
const TRAINING_SIGNAL_EVENT = 'shukatsu-training-signals-updated';

export function loadTrainingSignals() {
  try {
    const raw = window.localStorage.getItem(TRAINING_SIGNAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTrainingSignals(signals) {
  window.localStorage.setItem(TRAINING_SIGNAL_KEY, JSON.stringify(signals));
  window.dispatchEvent(new CustomEvent(TRAINING_SIGNAL_EVENT));
}

export function recordTrainingSignal(signal) {
  const next = [signal, ...loadTrainingSignals()]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);
  saveTrainingSignals(next);
  return next;
}

export function getLatestTrainingSignals(limit = 3) {
  return loadTrainingSignals().slice(0, limit);
}

export function getTrainingSignalEventName() {
  return TRAINING_SIGNAL_EVENT;
}
