import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { CalendarPlus, CalendarDays, MapPin, Link2, Archive as ArchiveIcon, RotateCcw, Edit2 } from 'lucide-react';
import { archiveEvent, getEventUpdatedEventName, loadEvents, patchEvent } from '../utils/eventStore';
import { EventCapturePanel } from './EventCapture';
import './Events.css';

const CORE_API = '/api/core';

const COPY = {
  ja: {
    title: 'イベント',
    subtitle: '確認済みのイベントを、今後の予定・終了済み・アーカイブに分けて管理します。',
    addEvent: 'イベントを追加',
    closeInput: '入力を閉じる',
    upcoming: '今後の予定',
    past: '終了済み',
    archived: 'アーカイブ',
    emptyUpcoming: '今後の予定はまだありません。',
    emptyPast: '終了済みのイベントはまだありません。',
    emptyArchived: 'アーカイブ済みのイベントはまだありません。',
    edit: '編集',
    collapse: '閉じる',
    archive: 'アーカイブ',
    task: 'タスク化',
    summary: 'Summary',
    summaryPlaceholder: 'イベントの要点、学び、振り返りや会話メモを書いてください',
    addToResearch: 'Add to Research Hub',
    summaryRequired: '先に Summary を書いてください。',
    movedToResearch: 'Summary を Research Hub に渡しました。',
    eventArchived: 'イベントをアーカイブしました。',
    taskCreated: 'イベントからタスクを作成しました。',
    untitled: '無題のイベント',
    noCompany: '主体未識別 / その他',
    noLocation: '場所未設定',
    noTime: '時間未設定',
    laterLink: 'あとで会社を紐づける',
    rawCompany: '主体名',
    startAtLabel: '開始日',
    startTimeLabel: '開始時刻（任意）',
    endAtLabel: '終了日（任意）',
    endTimeLabel: '終了時刻（任意）',
    titlePlaceholder: 'タイトル',
    locationPlaceholder: 'Zoom / Teams / 場所',
    notesPlaceholder: 'メモ',
    sourceText: '元テキスト',
    itemCount: '件',
  },
  zh: {
    title: '活动',
    subtitle: '把已确认的活动按即将发生、已结束、已归档来统一管理。',
    addEvent: '添加活动',
    closeInput: '关闭输入',
    upcoming: '即将发生',
    past: '已结束',
    archived: '已归档',
    emptyUpcoming: '暂无即将发生的活动。',
    emptyPast: '暂无已结束的活动。',
    emptyArchived: '暂无已归档的活动。',
    edit: '编辑',
    collapse: '收起',
    archive: '归档',
    task: '转任务',
    summary: 'Summary',
    summaryPlaceholder: '写下活动要点、收获、复盘或讨论纪要',
    addToResearch: '加入 Research Hub',
    summaryRequired: '请先填写 Summary。',
    movedToResearch: '已将 Summary 带入 Research Hub。',
    eventArchived: '活动已归档。',
    taskCreated: '已从活动生成任务。',
    untitled: '未命名活动',
    noCompany: '主体未识别 / 其他',
    noLocation: '地点未设置',
    noTime: '时间未设置',
    laterLink: '之后再关联公司',
    rawCompany: '主体名',
    startAtLabel: '开始日期',
    startTimeLabel: '开始时间（可选）',
    endAtLabel: '结束日期（可选）',
    endTimeLabel: '结束时间（可选）',
    titlePlaceholder: '标题',
    locationPlaceholder: 'Zoom / Teams / 地点',
    notesPlaceholder: '备注',
    sourceText: '原始文本',
    itemCount: '件',
  },
  en: {
    title: 'Events',
    subtitle: 'Manage confirmed events by lifecycle: upcoming, past, and archived.',
    addEvent: 'Add Event',
    closeInput: 'Close Input',
    upcoming: 'Upcoming',
    past: 'Past',
    archived: 'Archived',
    emptyUpcoming: 'No upcoming events.',
    emptyPast: 'No past events.',
    emptyArchived: 'No archived events.',
    edit: 'Edit',
    collapse: 'Collapse',
    archive: 'Archive',
    task: 'Create Task',
    summary: 'Summary',
    summaryPlaceholder: 'Write key takeaways, reflection, or discussion notes from this event',
    addToResearch: 'Add to Research Hub',
    summaryRequired: 'Please write a summary first.',
    movedToResearch: 'Summary moved into Research Hub.',
    eventArchived: 'Event archived.',
    taskCreated: 'Task created from event.',
    untitled: 'Untitled event',
    noCompany: 'Organizer not identified / Other',
    noLocation: 'Location not set',
    noTime: 'Time not set',
    laterLink: 'Link company later',
    rawCompany: 'Organizer name',
    startAtLabel: 'Start date',
    startTimeLabel: 'Start time (optional)',
    endAtLabel: 'End date (optional)',
    endTimeLabel: 'End time (optional)',
    titlePlaceholder: 'Title',
    locationPlaceholder: 'Zoom / Teams / location',
    notesPlaceholder: 'Notes',
    sourceText: 'Source text',
    itemCount: 'items',
  },
};
const EVENT_TYPE_LABELS = {
  general: { ja: 'その他', zh: '其他', en: 'Other' },
  seminar: { ja: '説明会 / イベント', zh: '说明会 / 活动', en: 'Seminar / Event' },
  interview: { ja: '面接', zh: '面试', en: 'Interview' },
  meeting: { ja: '面談 / OB訪問', zh: '面谈 / OB访问', en: 'Meeting / OB Visit' },
  deadline: { ja: '締切', zh: '截止', en: 'Deadline' },
  webtest: { ja: 'Webテスト', zh: 'Web 测试', en: 'Web Test' },
};

const LOCATION_LABELS = {
  unknown: { ja: '未設定', zh: '未设置', en: 'Unknown' },
  online: { ja: 'オンライン', zh: '线上', en: 'Online' },
  offline: { ja: 'オフライン', zh: '线下', en: 'Offline' },
  hybrid: { ja: 'ハイブリッド', zh: '混合', en: 'Hybrid' },
};

function pickText(language, values) {
  if (language === 'zh') return values.zh;
  if (language === 'en') return values.en;
  return values.ja;
}

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

function toLocalDateInput(isoValue = '') {
  if (!isoValue) return '';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60 * 1000);
  return adjusted.toISOString().slice(0, 10);
}

function fromLocalDateInput(value = '') {
  if (!value) return '';
  return new Date(`${value}T00:00:00`).toISOString();
}

function toLocalTimeInput(isoValue = '') {
  if (!isoValue) return '';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60 * 1000);
  return adjusted.toISOString().slice(11, 16);
}

function fromDateAndOptionalTime(dateValue = '', timeValue = '') {
  if (!dateValue) return '';
  return new Date(`${dateValue}T${timeValue || '00:00'}:00`).toISOString();
}

function formatEventTime(startAt = '', endAt = '', language = 'ja', noTimeLabel = '', startTimeTbd = false) {
  if (!startAt) return noTimeLabel;
  const locale = language === 'zh' ? 'zh-CN' : language === 'en' ? 'en-US' : 'ja-JP';
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;
  const datePart = start.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const startPart = start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (!end || Number.isNaN(end.getTime())) return startTimeTbd ? `${datePart}~` : `${datePart} ${startPart}~`;
  const endPart = end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return startTimeTbd ? `${datePart}` : `${datePart} ${startPart}-${endPart}`;
}

function buildOptions(copyMap, language) {
  return Object.keys(copyMap).map((value) => ({
    value,
    label: pickText(language, copyMap[value]),
  }));
}

function normalizeUrl(value = '') {
  if (!value) return '';
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return '';
}

function shortenUrl(value = '') {
  if (!value) return '';
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
  } catch {
    return value;
  }
}

function Events() {
  const [searchParams, setSearchParams] = useSearchParams();
  const language = document.documentElement.lang?.startsWith('zh')
    ? 'zh'
    : document.documentElement.lang?.startsWith('en')
      ? 'en'
      : 'ja';
  const text = COPY[language];
  const undoLabel = language === 'zh' ? '撤销' : language === 'en' ? 'Undo' : '元に戻す';
  const restoreLabel = language === 'zh' ? '恢复' : language === 'en' ? 'Restore' : '復元';
  const addSummaryLabel = language === 'zh' ? '添加 Summary' : language === 'en' ? 'Add Summary' : 'Summaryを追加';
  const openSummaryLabel = language === 'zh' ? '查看 Summary' : language === 'en' ? 'View Summary' : 'Summaryを見る';
  const noSummaryLabel = language === 'zh' ? '暂无 Summary' : language === 'en' ? 'No summary yet' : 'まだ Summary はありません';

  const [events, setEvents] = useState(() => loadEvents());
  const [companies, setCompanies] = useState([]);
  const [expandedId, setExpandedId] = useState('');
  const [message, setMessage] = useState('');
  const [captureOpen, setCaptureOpen] = useState(searchParams.get('capture') === '1');
  const [archivingId, setArchivingId] = useState('');
  const [archiveToast, setArchiveToast] = useState(null);
  const archiveTimerRef = useRef(null);

  const eventTypeOptions = useMemo(() => buildOptions(EVENT_TYPE_LABELS, language), [language]);
  const locationOptions = useMemo(() => buildOptions(LOCATION_LABELS, language), [language]);

  useEffect(() => {
    fetch(`${CORE_API}/companies`)
      .then((res) => res.json())
      .then(setCompanies)
      .catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    setCaptureOpen(searchParams.get('capture') === '1');
  }, [searchParams]);

  useEffect(() => {
    const reload = () => setEvents(loadEvents());
    const eventName = getEventUpdatedEventName();
    reload();
    window.addEventListener(eventName, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(eventName, reload);
      window.removeEventListener('storage', reload);
    };
  }, []);

  useEffect(() => () => {
    if (archiveTimerRef.current) {
      window.clearTimeout(archiveTimerRef.current);
    }
  }, []);

  const sections = useMemo(() => {
    const now = Date.now();
    const archivedItems = events.filter((event) => event.status === 'archived');
    const confirmedItems = events.filter((event) => event.status === 'confirmed');
    const upcomingItems = confirmedItems.filter((event) => {
      if (!event.start_at) return true;
      const ts = new Date(event.start_at).getTime();
      return Number.isNaN(ts) || ts >= now;
    });
    const pastItems = confirmedItems.filter((event) => {
      if (!event.start_at) return false;
      const ts = new Date(event.start_at).getTime();
      return !Number.isNaN(ts) && ts < now;
    });

    return [
      { key: 'upcoming', title: text.upcoming, empty: text.emptyUpcoming, items: upcomingItems },
      { key: 'past', title: text.past, empty: text.emptyPast, items: pastItems },
      { key: 'archived', title: text.archived, empty: text.emptyArchived, items: archivedItems },
    ];
  }, [events, text]);

  const handlePatch = (eventId, patch) => {
    patchEvent(eventId, patch);
    setEvents(loadEvents());
  };

  const dismissArchiveToast = () => {
    if (archiveTimerRef.current) {
      window.clearTimeout(archiveTimerRef.current);
      archiveTimerRef.current = null;
    }
    setArchiveToast(null);
  };

  const handleArchive = (event) => {
    setArchivingId(event.id);
    window.setTimeout(() => {
      archiveEvent(event.id);
      setEvents(loadEvents());
      setExpandedId((current) => (current === event.id ? '' : current));
      setArchivingId('');
      setArchiveToast({
        eventId: event.id,
        previousStatus: event.status || 'confirmed',
        message: text.eventArchived,
      });
      if (archiveTimerRef.current) {
        window.clearTimeout(archiveTimerRef.current);
      }
      archiveTimerRef.current = window.setTimeout(() => {
        setArchiveToast(null);
        archiveTimerRef.current = null;
      }, 5000);
    }, 220);
  };

  const handleUndoArchive = () => {
    if (!archiveToast?.eventId) return;
    patchEvent(archiveToast.eventId, { status: archiveToast.previousStatus || 'confirmed' });
    setEvents(loadEvents());
    dismissArchiveToast();
  };

  const handleRestoreArchived = (eventId) => {
    patchEvent(eventId, { status: 'confirmed' });
    setEvents(loadEvents());
  };

  const toggleCapture = () => {
    const nextOpen = !captureOpen;
    setCaptureOpen(nextOpen);
    const nextParams = new URLSearchParams(searchParams);
    if (nextOpen) nextParams.set('capture', '1');
    else nextParams.delete('capture');
    setSearchParams(nextParams, { replace: true });
  };

  const closeCapture = () => {
    setCaptureOpen(false);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('capture');
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="page-container events-page">
      <header className="page-header">
        <div>
          <h1>{text.title}</h1>
          <p className="subtitle">{text.subtitle}</p>
        </div>
        <button className="btn-primary events-capture-entry" onClick={toggleCapture}>
          <CalendarPlus size={16} />
          {captureOpen ? text.closeInput : text.addEvent}
        </button>
      </header>

      {captureOpen ? (
        <EventCapturePanel
          embedded
          initialExpanded
          onClose={closeCapture}
          onSaved={() => {
            setEvents(loadEvents());
          }}
        />
      ) : null}

      {message ? <div className="success-banner">{message}</div> : null}
      {archiveToast ? (
        <div className="events-toast" role="status" aria-live="polite">
          <span>{archiveToast.message}</span>
          <button type="button" className="events-toast-action" onClick={handleUndoArchive}>
            {undoLabel}
          </button>
        </div>
      ) : null}

      {sections.map((section) => (
        <Card
          key={section.key}
          title={section.title}
          action={<span className="text-muted">{section.items.length} {text.itemCount}</span>}
          className="events-filter-card"
        >
          <div className="events-list">
            {section.items.length ? section.items.map((event) => (
              <article
                key={event.id}
                className={`glass-panel event-manager-card${archivingId === event.id ? ' is-archiving' : ''}`}
              >
                <div className="event-manager-head">
                  <div className="event-manager-main">
                    <div className="event-manager-row">
                      <strong>{event.title || text.untitled}</strong>
                    </div>
                    {event.company_id || event.company_name_raw ? (
                      <div className="event-manager-company-row">
                        <span className="event-manager-company-pill">
                          {event.company_name_raw || text.noCompany}
                        </span>
                      </div>
                    ) : null}
                    <div className="event-manager-meta">
                      <span className="event-manager-meta-item">
                        <CalendarDays size={14} />
                        <span>{formatEventTime(event.start_at, event.end_at, language, text.noTime, event.start_time_tbd)}</span>
                      </span>
                      <span className="event-manager-meta-item">
                        <MapPin size={14} />
                        <span>
                          {event.location_type === 'unknown'
                            ? text.noLocation
                            : pickText(language, LOCATION_LABELS[event.location_type] || LOCATION_LABELS.unknown)}
                        </span>
                      </span>
                      {normalizeUrl(event.location_value) && section.key === 'upcoming' ? (
                        <a
                          className="event-manager-meta-item event-manager-link"
                          href={normalizeUrl(event.location_value)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Link2 size={14} />
                          <span>{shortenUrl(normalizeUrl(event.location_value))}</span>
                        </a>
                      ) : normalizeUrl(event.location_value) ? (
                        <span className="event-manager-meta-item event-manager-link is-static">
                          <Link2 size={14} />
                          <span>{shortenUrl(normalizeUrl(event.location_value))}</span>
                        </span>
                      ) : event.location_value ? (
                        <span className="event-manager-meta-item">
                          <MapPin size={14} />
                          <span>{event.location_value}</span>
                        </span>
                      ) : null}
                    </div>
                    {String(event.notes || '').trim() ? (
                      <div className="event-manager-notes-block">
                        <span className="event-manager-notes-label">
                          {language === 'zh'
                            ? '补充说明'
                            : language === 'en'
                              ? 'Note'
                              : '補足メモ'}
                        </span>
                        <div className="event-manager-notes-preview">
                          {event.notes}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="event-manager-actions">
                    <div className="event-manager-action-row">
                      <button
                        type="button"
                        className="event-action-icon"
                        onClick={() => setExpandedId(expandedId === event.id ? '' : event.id)}
                        title={expandedId === event.id ? text.collapse : text.edit}
                        aria-label={expandedId === event.id ? text.collapse : text.edit}
                      >
                        <Edit2 size={15} />
                      </button>
                      {section.key === 'archived' ? (
                        <button
                          type="button"
                          className="event-action-icon is-restore"
                          onClick={() => handleRestoreArchived(event.id)}
                          title={restoreLabel}
                          aria-label={restoreLabel}
                        >
                          <RotateCcw size={15} />
                        </button>
                      ) : event.status !== 'archived' ? (
                        <button
                          type="button"
                          className="event-action-icon"
                          onClick={() => handleArchive(event)}
                          title={text.archive}
                          aria-label={text.archive}
                        >
                          <ArchiveIcon size={15} />
                        </button>
                      ) : null}
                    </div>
                    {section.key === 'past' ? (
                      <div className="event-manager-summary-row">
                        <Link
                          className="btn-secondary event-summary-text-action"
                          to={`/events/${event.id}/summary`}
                        >
                          {String(event.summary || '').trim() ? openSummaryLabel : addSummaryLabel}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </div>

                {expandedId === event.id ? (
                  <div className="event-manager-form">
                    <input
                      className="ui-input"
                      value={event.title || ''}
                      onChange={(e) => handlePatch(event.id, { title: e.target.value })}
                      placeholder={text.titlePlaceholder}
                    />
                    <select
                      className="ui-input"
                      value={event.company_id || ''}
                      onChange={(e) => {
                        const company = companies.find((item) => String(item.id) === e.target.value);
                        handlePatch(event.id, {
                          company_id: company?.id || null,
                          company_name_raw: company?.name || event.company_name_raw,
                        });
                      }}
                    >
                      <option value="">{text.laterLink}</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                    <input
                      className="ui-input"
                      value={event.company_name_raw || ''}
                      onChange={(e) => handlePatch(event.id, { company_name_raw: e.target.value })}
                      placeholder={text.rawCompany}
                    />
                    <select
                      className="ui-input"
                      value={event.event_type || 'general'}
                      onChange={(e) => handlePatch(event.id, { event_type: e.target.value })}
                    >
                      {eventTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <select
                      className="ui-input"
                      value={event.location_type || 'unknown'}
                      onChange={(e) => handlePatch(event.id, { location_type: e.target.value })}
                    >
                      {locationOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <div className="event-draft-time-group">
                      <input
                        className="ui-input"
                        type="date"
                        value={toLocalDateInput(event.start_at)}
                        onChange={(e) =>
                          handlePatch(event.id, {
                            start_at: fromDateAndOptionalTime(e.target.value, toLocalTimeInput(event.start_at)),
                            start_time_tbd: !toLocalTimeInput(event.start_at),
                          })
                        }
                        aria-label={text.startAtLabel}
                      />
                      <input
                        className="ui-input"
                        type="time"
                        value={toLocalTimeInput(event.start_at)}
                        onChange={(e) =>
                          handlePatch(event.id, {
                            start_at: fromDateAndOptionalTime(toLocalDateInput(event.start_at), e.target.value),
                            start_time_tbd: !e.target.value,
                          })
                        }
                        aria-label={text.startTimeLabel}
                      />
                    </div>
                    <div className="event-draft-time-group">
                      <input
                        className="ui-input"
                        type="date"
                        value={toLocalDateInput(event.end_at)}
                        onChange={(e) =>
                          handlePatch(event.id, {
                            end_at: fromDateAndOptionalTime(e.target.value, toLocalTimeInput(event.end_at)),
                            end_time_tbd: Boolean(e.target.value) && !toLocalTimeInput(event.end_at),
                          })
                        }
                        aria-label={text.endAtLabel}
                      />
                      <input
                        className="ui-input"
                        type="time"
                        value={toLocalTimeInput(event.end_at)}
                        onChange={(e) =>
                          handlePatch(event.id, {
                            end_at: fromDateAndOptionalTime(toLocalDateInput(event.end_at), e.target.value),
                            end_time_tbd: Boolean(toLocalDateInput(event.end_at)) && !e.target.value,
                          })
                        }
                        aria-label={text.endTimeLabel}
                      />
                    </div>
                    <input
                      className="ui-input"
                      value={event.location_value || ''}
                      onChange={(e) => handlePatch(event.id, { location_value: e.target.value })}
                      placeholder={text.locationPlaceholder}
                    />
                    <textarea
                      className="ui-textarea"
                      rows={3}
                      value={event.notes || ''}
                      onChange={(e) => handlePatch(event.id, { notes: e.target.value })}
                      placeholder={text.notesPlaceholder}
                    />
                    <details className="event-manager-source">
                      <summary>{text.sourceText}</summary>
                      <pre>{event.source_text || ''}</pre>
                    </details>
                  </div>
                ) : null}
              </article>
            )) : (
              <div className="text-muted" style={{ padding: '0.25rem 0' }}>{section.empty}</div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

export default Events;

