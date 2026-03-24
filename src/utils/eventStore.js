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
    start_time_tbd: false,
    end_at: '',
    end_time_tbd: false,
    location_type: 'unknown',
    location_value: '',
    source_text: '',
    source_type: 'manual',
    notes: '',
    summary: '',
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

export function loadEvents() {
  try {
    const raw = window.localStorage.getItem(EVENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortEvents(parsed.map(normalizeEvent)) : [];
  } catch {
    return [];
  }
}

export function saveEvents(events) {
  window.localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(sortEvents(events.map(normalizeEvent))));
  window.dispatchEvent(new CustomEvent(EVENT_UPDATED));
}

export function upsertEvent(event) {
  const nextEvent = normalizeEvent(event);
  const events = loadEvents();
  const next = [nextEvent, ...events.filter((item) => item.id !== nextEvent.id)];
  saveEvents(next);
  return sortEvents(next);
}

export function patchEvent(eventId, patch = {}) {
  const events = loadEvents();
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

export function getEventById(eventId) {
  return loadEvents().find((item) => item.id === eventId) || null;
}

export function confirmEvent(eventId) {
  return patchEvent(eventId, { status: 'confirmed', needs_attention: false });
}

export function archiveEvent(eventId) {
  return patchEvent(eventId, { status: 'archived' });
}

export function getEventsByStatus(status = 'all') {
  const events = loadEvents();
  if (status === 'all') return events.filter((event) => event.status !== 'archived');
  return events.filter((event) => event.status === status);
}

export function getUpcomingEvents(limit = 5) {
  const now = Date.now();
  return loadEvents()
    .filter((event) => event.status !== 'archived')
    .filter((event) => event.start_at)
    .filter((event) => new Date(event.start_at).getTime() >= now - 1000 * 60 * 60 * 24)
    .slice(0, limit);
}

export function getEventUpdatedEventName() {
  return EVENT_UPDATED;
}
