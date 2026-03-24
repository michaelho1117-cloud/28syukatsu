import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Badge } from '../components/ui/Card';
import { CalendarPlus } from 'lucide-react';
import { archiveEvent, confirmEvent, getEventUpdatedEventName, loadEvents, patchEvent } from '../utils/eventStore';
import { EventCapturePanel } from './EventCapture';
import './Events.css';

const CORE_API = 'http://127.0.0.1:8789/api/core';

function toLocalDateTimeInput(isoValue = '') {
  if (!isoValue) return '';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60 * 1000);
  return adjusted.toISOString().slice(0, 16);
}

function fromLocalDateTimeInput(value = '') {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function formatEventTime(startAt = '', endAt = '') {
  if (!startAt) return '时间未定';
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;
  const datePart = start.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
  const startPart = start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  if (!end || Number.isNaN(end.getTime())) return `${datePart} ${startPart}`;
  const endPart = end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} ${startPart}-${endPart}`;
}

function statusVariant(status = 'draft') {
  if (status === 'confirmed') return 'success';
  if (status === 'needs_attention') return 'warning';
  if (status === 'archived') return 'danger';
  return 'accent';
}

function statusLabel(status = 'draft') {
  return {
    draft: 'draft',
    confirmed: 'confirmed',
    needs_attention: 'needs_attention',
    archived: 'archived'
  }[status] || status;
}

const STATUS_FILTERS = ['all', 'draft', 'confirmed', 'needs_attention', 'archived'];
const EVENT_TYPE_OPTIONS = [
  { value: 'general', label: '其他' },
  { value: 'seminar', label: '说明会 / 活动' },
  { value: 'interview', label: '面试' },
  { value: 'meeting', label: '面谈 / OB 访问' },
  { value: 'deadline', label: '截止' },
  { value: 'webtest', label: 'Web Test' }
];
const LOCATION_OPTIONS = [
  { value: 'unknown', label: '不明' },
  { value: 'online', label: '线上' },
  { value: 'offline', label: '线下' },
  { value: 'hybrid', label: '混合' }
];

function Events() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState('');
  const [message, setMessage] = useState('');
  const [captureOpen, setCaptureOpen] = useState(searchParams.get('capture') === '1');

  useEffect(() => {
    async function loadData() {
      const data = await loadEvents();
      setEvents(Array.isArray(data) ? data : []);
    }
    loadData();

    fetch(`${CORE_API}/companies`)
      .then((res) => res.json())
      .then(setCompanies)
      .catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    const nextCaptureOpen = searchParams.get('capture') === '1';
    setCaptureOpen(nextCaptureOpen);
  }, [searchParams]);

  useEffect(() => {
    const reload = async () => {
      const data = await loadEvents();
      setEvents(Array.isArray(data) ? data : []);
    };
    const eventName = getEventUpdatedEventName();
    reload();
    window.addEventListener(eventName, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(eventName, reload);
      window.removeEventListener('storage', reload);
    };
  }, []);

  const filteredEvents = useMemo(() => {
    if (statusFilter === 'all') return events.filter((event) => event.status !== 'archived');
    return events.filter((event) => event.status === statusFilter);
  }, [events, statusFilter]);

  const handlePatch = async (eventId, patch) => {
    await patchEvent(eventId, patch);
    const data = await loadEvents();
    setEvents(Array.isArray(data) ? data : []);
  };

  const handleConfirm = async (eventId) => {
    await confirmEvent(eventId);
    const data = await loadEvents();
    setEvents(Array.isArray(data) ? data : []);
    setMessage('Event confirmed');
    window.setTimeout(() => setMessage(''), 1400);
  };

  const handleArchive = async (eventId) => {
    await archiveEvent(eventId);
    const data = await loadEvents();
    setEvents(Array.isArray(data) ? data : []);
    setMessage('Event archived');
    window.setTimeout(() => setMessage(''), 1400);
  };

  const handleCreateTask = async (event) => {
    const title = `[Event Follow-up] ${event.company_name_raw || 'Other'} / ${event.title || 'Untitled event'}`;
    await fetch(`${CORE_API}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        company_id: event.company_id || null,
        deadline: event.start_at ? event.start_at.slice(0, 10) : null,
        status: 'todo',
        priority: event.status === 'needs_attention' ? 'medium' : 'high'
      })
    });
    setMessage('Task created from event');
    window.setTimeout(() => setMessage(''), 1400);
  };

  const toggleCapture = () => {
    const nextOpen = !captureOpen;
    setCaptureOpen(nextOpen);
    const nextParams = new URLSearchParams(searchParams);
    if (nextOpen) nextParams.set('capture', '1');
    else nextParams.delete('capture');
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="page-container events-page">
      <header className="page-header">
        <div>
          <h1>Event Manager</h1>
          <p className="subtitle">在同一个页面里完成事件提取、修正、确认和后续管理。</p>
        </div>
        <button className="btn-primary events-capture-entry" onClick={toggleCapture}>
          <CalendarPlus size={16} />
          {captureOpen ? '隐藏 Capture' : '打开 Capture'}
        </button>
      </header>

      {captureOpen ? (
        <EventCapturePanel
          embedded
          initialExpanded
          onSaved={() => {
            setEvents(loadEvents());
            setStatusFilter('all');
          }}
        />
      ) : null}

      {message ? <div className="success-banner">{message}</div> : null}

      <Card
        title="Status Filter"
        action={<span className="text-muted">{filteredEvents.length} 件</span>}
        className="events-filter-card"
      >
        <div className="events-filter-row">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              className={`events-filter-chip ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? 'all' : status}
            </button>
          ))}
        </div>
      </Card>

      <div className="events-list">
        {filteredEvents.map((event) => (
          <article key={event.id} className="glass-panel event-manager-card">
            <div className="event-manager-head">
              <div className="event-manager-main">
                <div className="event-manager-row">
                  <strong>{event.title || '未命名事件'}</strong>
                  <Badge variant={statusVariant(event.status)}>{statusLabel(event.status)}</Badge>
                </div>
                <div className="event-manager-meta">
                  <span>{event.company_name_raw || '公司未指定 / Other'}</span>
                  <span>{formatEventTime(event.start_at, event.end_at)}</span>
                  <span>
                    {event.location_type === 'unknown'
                      ? '地点未设定'
                      : `${event.location_type}${event.location_value ? ` / ${event.location_value}` : ''}`}
                  </span>
                </div>
              </div>
              <div className="event-manager-actions">
                <button className="btn-secondary" onClick={() => setExpandedId(expandedId === event.id ? '' : event.id)}>
                  {expandedId === event.id ? '收起' : '编辑'}
                </button>
                {event.status !== 'confirmed' ? (
                  <button className="btn-primary" onClick={() => handleConfirm(event.id)}>
                    确认
                  </button>
                ) : null}
                {event.status !== 'archived' ? (
                  <button className="btn-secondary" onClick={() => handleArchive(event.id)}>
                    Archive
                  </button>
                ) : null}
                <button className="btn-secondary" onClick={() => handleCreateTask(event)}>
                  Task
                </button>
              </div>
            </div>

            {expandedId === event.id ? (
              <div className="event-manager-form">
                <input
                  className="ui-input"
                  value={event.title || ''}
                  onChange={(e) => handlePatch(event.id, { title: e.target.value })}
                  placeholder="标题"
                />
                <select
                  className="ui-input"
                  value={event.company_id || ''}
                  onChange={(e) => {
                    const company = companies.find((item) => String(item.id) === e.target.value);
                    handlePatch(event.id, {
                      company_id: company?.id || null,
                      company_name_raw: company?.name || event.company_name_raw
                    });
                  }}
                >
                  <option value="">之后再关联公司 / 其他</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
                <input
                  className="ui-input"
                  value={event.company_name_raw || ''}
                  onChange={(e) => handlePatch(event.id, { company_name_raw: e.target.value })}
                  placeholder="公司名"
                />
                <select
                  className="ui-input"
                  value={event.event_type || 'general'}
                  onChange={(e) => handlePatch(event.id, { event_type: e.target.value })}
                >
                  {EVENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select
                  className="ui-input"
                  value={event.location_type || 'unknown'}
                  onChange={(e) => handlePatch(event.id, { location_type: e.target.value })}
                >
                  {LOCATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <input
                  className="ui-input"
                  type="datetime-local"
                  value={toLocalDateTimeInput(event.start_at)}
                  onChange={(e) => handlePatch(event.id, { start_at: fromLocalDateTimeInput(e.target.value) })}
                />
                <input
                  className="ui-input"
                  type="datetime-local"
                  value={toLocalDateTimeInput(event.end_at)}
                  onChange={(e) => handlePatch(event.id, { end_at: fromLocalDateTimeInput(e.target.value) })}
                />
                <input
                  className="ui-input"
                  value={event.location_value || ''}
                  onChange={(e) => handlePatch(event.id, { location_value: e.target.value })}
                  placeholder="Zoom / Teams / 地点"
                />
                <select
                  className="ui-input"
                  value={event.status}
                  onChange={(e) => handlePatch(event.id, { status: e.target.value, needs_attention: e.target.value === 'needs_attention' })}
                >
                  <option value="draft">draft</option>
                  <option value="confirmed">confirmed</option>
                  <option value="needs_attention">needs_attention</option>
                  <option value="archived">archived</option>
                </select>
                <textarea
                  className="ui-textarea"
                  rows={3}
                  value={event.notes || ''}
                  onChange={(e) => handlePatch(event.id, { notes: e.target.value })}
                  placeholder="备注"
                />
                <details className="event-manager-source">
                  <summary>source_text</summary>
                  <pre>{event.source_text || ''}</pre>
                </details>
              </div>
            ) : null}
          </article>
        ))}

        {!filteredEvents.length ? (
          <div className="event-empty-state">
            <p>这个状态下还没有事件。可以先在上面的 Capture 区提取一个草稿。</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Events;
