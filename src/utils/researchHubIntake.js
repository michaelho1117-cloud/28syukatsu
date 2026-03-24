const RESEARCH_HUB_INTAKE_KEY = 'shukatsu_research_hub_intake_v1';

export function saveResearchHubIntake(payload) {
  window.localStorage.setItem(RESEARCH_HUB_INTAKE_KEY, JSON.stringify(payload));
}

export function consumeResearchHubIntake() {
  try {
    const raw = window.localStorage.getItem(RESEARCH_HUB_INTAKE_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(RESEARCH_HUB_INTAKE_KEY);
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(RESEARCH_HUB_INTAKE_KEY);
    return null;
  }
}
