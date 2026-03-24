const CAPTURE_INTAKE_KEY = 'shukatsu_capture_intake_v1';

export function saveCaptureIntake(payload) {
  window.localStorage.setItem(CAPTURE_INTAKE_KEY, JSON.stringify(payload));
}

export function consumeCaptureIntake() {
  try {
    const raw = window.localStorage.getItem(CAPTURE_INTAKE_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(CAPTURE_INTAKE_KEY);
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(CAPTURE_INTAKE_KEY);
    return null;
  }
}
