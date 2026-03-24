const EVENT_STORAGE_KEY = 'shukatsu_events_v1';
const EVENT_UPDATED = 'shukatsu-events-updated';

const VALID_STATUSES = new Set(['draft', 'confirmed', 'needs_attention', 'archived']);

function normalizeEvent(event = {}) {
  const normalizedStatus = VALID_STATUSES.has(event.status) ? event.status : 'draft';
  return {
    company_id: null,
    company_name_raw: '',
    title: '',
    event_type: 'general',
    start_at: '',
    end_at: '',
    location_type: 'unknown',
    location_value: '',
    source_text: '',
    source_type: 'manual',
    notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    confidence: 0,
    needs_attention: normalizedStatus === 'needs_attention',
    status: normalizedStatus,
    ...event,
    status: normalizedStatus
  };
}

function sortEvents(events = []) {
  return [...events].sort((a, b) => {
    const aTime = a.start_at ? new Date(a.start_at).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.start_at ? new Date(b.start_at).getTime() : Number.MAX_SAFE_INTEGER;
    if (aTime !== bTime) return aTime - bTime;
    return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
  });
}

export async function loadEvents() {
  try {
    const response = await fetch('http://127.0.0.1:8789/api/core/applications');
    if (!response.ok) throw new Error('Backend connection failed');
    const parsed = await response.json();
    // 后端接口返回 { statuses: [...], items: [...] }
    const events = Array.isArray(parsed.items) ? parsed.items : [];
    return sortEvents(events.map(normalizeEvent));
  } catch (error) {
    console.error('Fallback to localStorage due to API failure:', error);
    const raw = window.localStorage.getItem(EVENT_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      const eventsArray = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.events) ? parsed.events : []);
      return sortEvents(eventsArray.map(normalizeEvent));
    } catch {
      return [];
    }
  }
}

export async function saveEvents(events) {
  try {
    await fetch('http://127.0.0.1:8789/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events)
    });
  } catch (error) {
    console.error('Failed to save events to backend:', error);
  }
  window.localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(sortEvents(events.map(normalizeEvent))));
  window.dispatchEvent(new CustomEvent(EVENT_UPDATED));
}

export async function upsertEvent(event) {
  const nextEvent = normalizeEvent(event);
  const events = await loadEvents();
  const next = [nextEvent, ...events.filter((item) => item.id !== nextEvent.id)];
  saveEvents(next);
  return sortEvents(next);
}

export async function patchEvent(eventId, patch = {}) {
  const events = await loadEvents();
  const target = events.find((item) => item.id === eventId);
  if (!target) return events;

  const next = events.map((item) =>
    item.id === eventId
      ? normalizeEvent({
          ...item,
          ...patch,
          updated_at: new Date().toISOString()
        })
      : item
  );
  saveEvents(next);
  return next;
}

export async function confirmEvent(eventId) {
  return patchEvent(eventId, { status: 'confirmed', needs_attention: false });
}

export async function archiveEvent(eventId) {
  return patchEvent(eventId, { status: 'archived' });
}

export async function getEventsByStatus(status = 'all') {
  const events = await loadEvents();
  if (status === 'all') return events.filter((event) => event.status !== 'archived');
  return events.filter((event) => event.status === status);
}

export async function getUpcomingEvents(limit = 5) {
  const now = Date.now();
  const events = await loadEvents();
  return events
    .filter((event) => event.status !== 'archived')
    .filter((event) => event.start_at)
    .filter((event) => new Date(event.start_at).getTime() >= now - 1000 * 60 * 60 * 24)
    .slice(0, limit);
}

export function getEventUpdatedEventName() {
  return EVENT_UPDATED;
}
