import React, { useEffect, useMemo, useState } from 'react';
import { Card, Badge } from '../components/ui/Card';
import { Sparkles, Save, Wand2, CalendarClock, ChevronDown, ChevronUp } from 'lucide-react';
import { parseEventCandidates } from '../utils/eventCapture';
import { upsertEvent } from '../utils/eventStore';
import { consumeCaptureIntake } from '../utils/captureIntake';
import './EventCapture.css';

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

function formatConfidence(confidence = 0) {
  return `${Math.round(confidence * 100)}%`;
}

async function createReviewTaskForEvent(eventDraft) {
  if (!eventDraft.needs_attention) return;
  const title = `[Review Event] ${eventDraft.company_name_raw || 'Other'} / ${eventDraft.title || 'Untitled event'}`;
  await fetch(`${CORE_API}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      company_id: eventDraft.company_id || null,
      deadline: eventDraft.start_at ? eventDraft.start_at.slice(0, 10) : null,
      status: 'todo',
      priority: 'medium'
    })
  });
}

function eventActionTaskConfig(eventDraft) {
  const company = eventDraft.company_name_raw || 'Other';
  const title = eventDraft.title || 'Untitled event';
  switch (eventDraft.event_type) {
    case 'interview':
      return { title: `[Prepare Interview] ${company} / ${title}`, priority: 'high' };
    case 'webtest':
      return { title: `[Prepare Web Test] ${company} / ${title}`, priority: 'high' };
    case 'deadline':
      return { title: `[Action Before Deadline] ${company} / ${title}`, priority: 'high' };
    case 'seminar':
    case 'meeting':
      return { title: `[Prepare Event] ${company} / ${title}`, priority: 'medium' };
    default:
      return null;
  }
}

async function ensureActionTaskForEvent(eventDraft) {
  if (eventDraft.needs_attention) return;
  const taskConfig = eventActionTaskConfig(eventDraft);
  if (!taskConfig) return;

  const existingRes = await fetch(`${CORE_API}/tasks`);
  if (!existingRes.ok) return;
  const existingTasks = await existingRes.json();
  const exists = existingTasks.some((task) => task.title === taskConfig.title && task.status !== 'done');
  if (exists) return;

  await fetch(`${CORE_API}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: taskConfig.title,
      company_id: eventDraft.company_id || null,
      deadline: eventDraft.start_at ? eventDraft.start_at.slice(0, 10) : null,
      status: 'todo',
      priority: taskConfig.priority
    })
  });
}

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

export function EventCapturePanel({
  embedded = false,
  initialExpanded = true,
  onSaved = () => {}
}) {
  const [companies, setCompanies] = useState([]);
  const [sourceType, setSourceType] = useState('email');
  const [sourceText, setSourceText] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState('');
  const [expanded, setExpanded] = useState(initialExpanded);

  useEffect(() => {
    setExpanded(initialExpanded);
  }, [initialExpanded]);

  useEffect(() => {
    fetch(`${CORE_API}/companies`)
      .then((res) => res.json())
      .then(setCompanies)
      .catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    if (!companies.length) return;
    const intake = consumeCaptureIntake();
    if (!intake?.sourceText) return;

    setExpanded(true);
    setSourceType(intake.sourceType || 'email');
    setSourceText(intake.sourceText);
    const importedDrafts = parseEventCandidates(intake.sourceText, intake.sourceType || 'email', companies);
    setDrafts(importedDrafts);
    if (importedDrafts.length) {
      setMessage(`已导入 ${importedDrafts.length} 条草稿`);
      window.setTimeout(() => setMessage(''), 2200);
    }
  }, [companies]);

  const parsedCountLabel = useMemo(() => {
    if (!drafts.length) return '还没有草稿';
    return `${drafts.length} 条草稿`;
  }, [drafts]);

  const handleParse = () => {
    const nextDrafts = parseEventCandidates(sourceText, sourceType, companies);
    setDrafts(nextDrafts);
    if (!nextDrafts.length) {
      setMessage('没有识别到可用事件，请手动补充后再保存');
      window.setTimeout(() => setMessage(''), 1800);
      return;
    }
    setMessage(`已生成 ${nextDrafts.length} 条草稿`);
    window.setTimeout(() => setMessage(''), 1800);
  };

  const updateDraft = (id, patch) => {
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== id) return draft;
        const next = {
          ...draft,
          ...patch,
          updated_at: new Date().toISOString()
        };
        const needsAttention = !next.title || !next.start_at || next.confidence < 0.6;
        return {
          ...next,
          needs_attention: patch.needs_attention ?? needsAttention
        };
      })
    );
  };

  const saveDraft = async (draft, targetStatus = 'draft') => {
    setSavingId(draft.id);
    const persisted = {
      ...draft,
      id: draft.id.startsWith('draft-') ? `event-${Date.now()}` : draft.id,
      status:
        targetStatus === 'confirmed'
          ? 'confirmed'
          : draft.needs_attention
            ? 'needs_attention'
            : 'draft',
      needs_attention: targetStatus === 'confirmed' ? false : draft.needs_attention,
      updated_at: new Date().toISOString()
    };
    upsertEvent(persisted);

    try {
      await createReviewTaskForEvent(persisted);
      await ensureActionTaskForEvent(persisted);
    } catch {
      // non-blocking
    }

    setSavingId('');
    setMessage(targetStatus === 'confirmed' ? '事件已确认保存' : '事件草稿已保存');
    window.setTimeout(() => setMessage(''), 1500);
    onSaved(persisted);
  };

  const content = (
    <>
      {message ? <div className="success-banner">{message}</div> : null}

      <div className="event-capture-grid">
        <Card
          title="输入文本"
          action={<Badge variant="accent">AUTOMATION-FIRST</Badge>}
          className="event-capture-input-card"
        >
          <div className="event-capture-controls">
            <select className="ui-input" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
              <option value="email">邮件</option>
              <option value="notice">通知</option>
              <option value="manual">手动输入</option>
            </select>
            <button className="btn-primary" onClick={handleParse}>
              <Wand2 size={16} /> 转为草稿
            </button>
          </div>

          <textarea
            className="ui-textarea event-source-text"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="把邮件正文、活动通知、截止说明等贴到这里..."
            rows={embedded ? 12 : 16}
          />

          <div className="event-capture-hint">
            <Sparkles size={14} />
            <span>先自动提取，再快速修正。低置信草稿也可以先保存，之后在 Events 里继续管理。</span>
          </div>
        </Card>

        <Card
          title="草稿列表"
          action={<span className="text-muted">{parsedCountLabel}</span>}
          className="event-capture-drafts-card"
        >
          <div className="event-draft-list">
            {drafts.map((draft) => (
              <article key={draft.id} className="event-draft-card glass-panel">
                <div className="event-draft-head">
                  <div>
                    <strong>{draft.title || '未命名事件'}</strong>
                    <p className="text-muted">{draft.company_name_raw || '公司尚未识别'}</p>
                  </div>
                  <div className="event-draft-badges">
                    <Badge variant={draft.needs_attention ? 'warning' : 'accent'}>
                      {draft.needs_attention ? 'needs attention' : 'draft'}
                    </Badge>
                    <Badge variant="accent">{formatConfidence(draft.confidence)}</Badge>
                  </div>
                </div>

                <div className="event-draft-form">
                  <input
                    className="ui-input"
                    value={draft.title || ''}
                    onChange={(e) => updateDraft(draft.id, { title: e.target.value })}
                    placeholder="标题"
                  />
                  <select
                    className="ui-input"
                    value={draft.company_id || ''}
                    onChange={(e) => {
                      const company = companies.find((item) => String(item.id) === e.target.value);
                      updateDraft(draft.id, {
                        company_id: company?.id || null,
                        company_name_raw: company?.name || draft.company_name_raw
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
                    value={draft.company_name_raw || ''}
                    onChange={(e) => updateDraft(draft.id, { company_name_raw: e.target.value })}
                    placeholder="公司名（raw）"
                  />
                  <select
                    className="ui-input"
                    value={draft.event_type || 'general'}
                    onChange={(e) => updateDraft(draft.id, { event_type: e.target.value })}
                  >
                    {EVENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <input
                    className="ui-input"
                    type="datetime-local"
                    value={toLocalDateTimeInput(draft.start_at)}
                    onChange={(e) => updateDraft(draft.id, { start_at: fromLocalDateTimeInput(e.target.value) })}
                  />
                  <input
                    className="ui-input"
                    type="datetime-local"
                    value={toLocalDateTimeInput(draft.end_at)}
                    onChange={(e) => updateDraft(draft.id, { end_at: fromLocalDateTimeInput(e.target.value) })}
                  />
                  <select
                    className="ui-input"
                    value={draft.location_type || 'unknown'}
                    onChange={(e) => updateDraft(draft.id, { location_type: e.target.value })}
                  >
                    {LOCATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <input
                    className="ui-input"
                    value={draft.location_value || ''}
                    onChange={(e) => updateDraft(draft.id, { location_value: e.target.value })}
                    placeholder="Zoom / Teams / 地点"
                  />
                  <textarea
                    className="ui-textarea"
                    rows={3}
                    value={draft.notes || ''}
                    onChange={(e) => updateDraft(draft.id, { notes: e.target.value })}
                    placeholder="备注"
                  />
                </div>

                <details className="event-draft-source">
                  <summary><CalendarClock size={14} /> 原文本</summary>
                  <pre>{draft.source_text || ''}</pre>
                </details>

                <div className="event-draft-actions">
                  <button className="btn-secondary" disabled={savingId === draft.id} onClick={() => saveDraft(draft, 'draft')}>
                    <Save size={16} /> {savingId === draft.id ? '保存中...' : '保存为 Draft'}
                  </button>
                  <button
                    className="btn-primary"
                    disabled={savingId === draft.id || !draft.title || !draft.start_at}
                    onClick={() => saveDraft(draft, 'confirmed')}
                  >
                    <Save size={16} /> {savingId === draft.id ? '保存中...' : '确认并保存'}
                  </button>
                </div>
              </article>
            ))}

            {!drafts.length ? (
              <div className="event-empty-state">
                <p>还没有草稿。把通知文本贴到左边，然后生成草稿。</p>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </>
  );

  if (embedded) {
    return (
      <section className="events-capture-panel glass-panel">
        <div className="events-capture-panel-head">
          <div>
            <h2>Capture into Events</h2>
            <p>在事件系统内部直接提取、修正并保存 Event Draft。</p>
          </div>
          <button className="btn-secondary events-capture-toggle" onClick={() => setExpanded((value) => !value)}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? '收起' : '展开'}
          </button>
        </div>
        {expanded ? content : null}
      </section>
    );
  }

  return (
    <div className="page-container event-capture-page">
      <header className="page-header">
        <div>
          <h1>Smart Event Capture</h1>
          <p className="subtitle">把通知文本转成可编辑的事件草稿，再继续保存到 Events。</p>
        </div>
      </header>
      {content}
    </div>
  );
}

function EventCapture() {
  return <EventCapturePanel />;
}

export default EventCapture;
