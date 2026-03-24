import React, { useEffect, useMemo, useState } from 'react';
import { Card, Badge } from '../components/ui/Card';
import { Sparkles, Save, Wand2, CalendarClock, ChevronDown, ChevronUp } from 'lucide-react';
import { parseEventCandidates } from '../utils/eventCapture';
import { upsertEvent } from '../utils/eventStore';
import { consumeCaptureIntake } from '../utils/captureIntake';
import './EventCapture.css';

const CORE_API = '/api/core';

const COPY = {
  ja: {
    pageTitle: 'Add Event',
    pageSubtitle: '通知文やメール本文を貼り付けて Event を作成します。AI は解析を補助しますが、最後は手動で編集できます。',
    panelTitle: 'Add Event',
    panelSubtitle: 'Events の中で直接 Event を作成・修正できます。',
    collapse: '閉じる',
    expand: '展開',
    inputTitle: 'Paste event information',
    draftsTitle: 'Event Drafts',
    sourceLabel: 'Source',
    parseBtn: 'Create Event Draft',
    cancelInput: '入力をやめる',
    parsingAssist: 'AI assist parsing',
    sourceEmail: 'メール',
    sourceNotice: '通知',
    sourceManual: '手動入力',
    sourcePlaceholder: 'メール本文、通知、説明会案内、締切案内などをここに貼り付けてください。',
    hint: 'AI は title / date / company / location を補助抽出します。必要に応じて手動で修正して保存してください。',
    noDrafts: 'まだ Event Draft はありません。',
    untitled: '未命名イベント',
    unidentifiedCompany: '主体はまだ未識別です',
    linkLater: 'あとで会社を紐づける',
    rawCompany: '主体名',
    startAtLabel: '開始日',
    startTimeLabel: '開始時刻（任意）',
    endAtLabel: '終了日（任意）',
    endTimeLabel: '終了時刻（任意）',
    titlePlaceholder: 'タイトル',
    locationPlaceholder: 'Zoom / Teams / 場所',
    notesPlaceholder: 'メモ',
    sourceText: '元テキスト',
    saveDraft: 'Save Draft',
    saveConfirmed: 'Save as Confirmed',
    saving: '保存中...',
    imported: (count) => `${count} 件の草稿を取り込みました。`,
    created: (count) => `${count} 件の Event Draft を作成しました。`,
    noEventDetected: 'イベント候補を検出できませんでした。必要に応じて手動で補ってください。',
    draftSaved: 'Event Draft を保存しました。',
    confirmedSaved: 'Event を確認済みとして保存しました。',
    confidenceOk: '保存OK',
    needsAttention: 'needs attention',
    draft: 'draft',
  },
  zh: {
    pageTitle: '添加 Event',
    pageSubtitle: '粘贴邮件或通知文本来创建 Event。AI 只负责辅助解析，最终仍可手动编辑。',
    panelTitle: '添加 Event',
    panelSubtitle: '直接在 Events 模块里创建并修正 Event。',
    collapse: '收起',
    expand: '展开',
    inputTitle: '粘贴事件信息',
    draftsTitle: 'Event 草稿',
    sourceLabel: '来源',
    parseBtn: '创建 Event 草稿',
    cancelInput: '取消输入',
    parsingAssist: 'AI 辅助解析',
    sourceEmail: '邮件',
    sourceNotice: '通知',
    sourceManual: '手动输入',
    sourcePlaceholder: '把邮件正文、通知、说明会文案、截止提醒等粘贴到这里。',
    hint: 'AI 会辅助提取 title / date / company / location，之后你仍可手动修正并保存。',
    noDrafts: '还没有 Event 草稿。',
    untitled: '未命名事件',
    unidentifiedCompany: '主体尚未识别',
    linkLater: '之后再关联公司',
    rawCompany: '主体名',
    startAtLabel: '开始日期',
    startTimeLabel: '开始时间（可选）',
    endAtLabel: '结束日期（可选）',
    endTimeLabel: '结束时间（可选）',
    titlePlaceholder: '标题',
    locationPlaceholder: 'Zoom / Teams / 地点',
    notesPlaceholder: '备注',
    sourceText: '原始文本',
    saveDraft: '保存草稿',
    saveConfirmed: '确认并保存',
    saving: '保存中...',
    imported: (count) => `已导入 ${count} 条草稿。`,
    created: (count) => `已生成 ${count} 条 Event 草稿。`,
    noEventDetected: '没有识别到可用事件，请手动补充后再保存。',
    draftSaved: '已保存 Event 草稿。',
    confirmedSaved: '已保存为确认事件。',
    confidenceOk: '保存OK',
    needsAttention: '需关注',
    draft: '草稿',
  },
  en: {
    pageTitle: 'Add Event',
    pageSubtitle: 'Paste mail or notification text to create an event. AI only assists parsing; you can still edit everything manually.',
    panelTitle: 'Add Event',
    panelSubtitle: 'Create and revise events directly inside Events.',
    collapse: 'Collapse',
    expand: 'Expand',
    inputTitle: 'Paste event information',
    draftsTitle: 'Event Drafts',
    sourceLabel: 'Source',
    parseBtn: 'Create Event Draft',
    cancelInput: 'Cancel',
    parsingAssist: 'AI assist parsing',
    sourceEmail: 'Email',
    sourceNotice: 'Notification',
    sourceManual: 'Manual',
    sourcePlaceholder: 'Paste email bodies, notifications, seminar info, or deadline notes here.',
    hint: 'AI helps extract title / date / company / location. You can still edit all fields before saving.',
    noDrafts: 'No event drafts yet.',
    untitled: 'Untitled event',
    unidentifiedCompany: 'Organizer not identified yet',
    linkLater: 'Link company later',
    rawCompany: 'Organizer name',
    startAtLabel: 'Start date',
    startTimeLabel: 'Start time (optional)',
    endAtLabel: 'End date (optional)',
    endTimeLabel: 'End time (optional)',
    titlePlaceholder: 'Title',
    locationPlaceholder: 'Zoom / Teams / location',
    notesPlaceholder: 'Notes',
    sourceText: 'Source text',
    saveDraft: 'Save Draft',
    saveConfirmed: 'Save as Confirmed',
    saving: 'Saving...',
    imported: (count) => `Imported ${count} draft(s).`,
    created: (count) => `Created ${count} event draft(s).`,
    noEventDetected: 'No event candidate detected. Please complete the fields manually if needed.',
    draftSaved: 'Event draft saved.',
    confirmedSaved: 'Event saved as confirmed.',
    confidenceOk: 'Ready',
    needsAttention: 'needs attention',
    draft: 'draft',
  },
};

const EVENT_TYPE_OPTIONS = {
  ja: [
    { value: 'general', label: 'その他' },
    { value: 'seminar', label: '説明会 / イベント' },
    { value: 'interview', label: '面接' },
    { value: 'meeting', label: '面談 / OB訪問' },
    { value: 'deadline', label: '締切' },
    { value: 'webtest', label: 'Web Test' },
  ],
  zh: [
    { value: 'general', label: '其他' },
    { value: 'seminar', label: '说明会 / 活动' },
    { value: 'interview', label: '面试' },
    { value: 'meeting', label: '面谈 / OB 访问' },
    { value: 'deadline', label: '截止' },
    { value: 'webtest', label: 'Web Test' },
  ],
  en: [
    { value: 'general', label: 'Other' },
    { value: 'seminar', label: 'Seminar / Event' },
    { value: 'interview', label: 'Interview' },
    { value: 'meeting', label: 'Meeting / OB Visit' },
    { value: 'deadline', label: 'Deadline' },
    { value: 'webtest', label: 'Web Test' },
  ],
};

const LOCATION_OPTIONS = {
  ja: [
    { value: 'unknown', label: '未設定' },
    { value: 'online', label: 'オンライン' },
    { value: 'offline', label: 'オフライン' },
    { value: 'hybrid', label: 'ハイブリッド' },
  ],
  zh: [
    { value: 'unknown', label: '未设置' },
    { value: 'online', label: '线上' },
    { value: 'offline', label: '线下' },
    { value: 'hybrid', label: '混合' },
  ],
  en: [
    { value: 'unknown', label: 'Unknown' },
    { value: 'online', label: 'Online' },
    { value: 'offline', label: 'Offline' },
    { value: 'hybrid', label: 'Hybrid' },
  ],
};

function getLanguage() {
  if (document.documentElement.lang?.startsWith('zh')) return 'zh';
  if (document.documentElement.lang?.startsWith('en')) return 'en';
  return 'ja';
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
      priority: 'medium',
    }),
  });
}

export function EventCapturePanel({ embedded = false, initialExpanded = true, onSaved = () => {}, onClose = () => {} }) {
  const language = getLanguage();
  const text = COPY[language];
  const [companies, setCompanies] = useState([]);
  const [sourceType, setSourceType] = useState('manual');
  const [sourceText, setSourceText] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState('');
  const [expanded, setExpanded] = useState(initialExpanded);
  const [aiParsing, setAiParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState('');

  useEffect(() => {
    setExpanded(initialExpanded);
  }, [initialExpanded]);

  useEffect(() => {
    fetch(`${CORE_API}/companies`)
      .then((res) => res.json())
      .then(setCompanies)
      .catch(() => setCompanies([]));
  }, []);

  const requestAiDrafts = async (rawText, type) => {
    const res = await fetch(`${CORE_API}/ai/event-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_text: rawText,
        source_type: type,
      }),
    });

    if (!res.ok) throw new Error('Failed to parse event draft with AI');
    const data = await res.json();
    return Array.isArray(data.drafts) ? data.drafts : [];
  };

  useEffect(() => {
    if (!companies.length) return;
    const intake = consumeCaptureIntake();
    if (!intake?.sourceText) return;

    const loadImportedDrafts = async () => {
      setExpanded(true);
      setSourceType(intake.sourceType || 'email');
      setSourceText(intake.sourceText);
      try {
        setAiParsing(true);
        setParseStatus(language === 'ja' ? 'Gemini で解析中...' : language === 'zh' ? 'Gemini 解析中...' : 'Parsing with Gemini...');
        const importedDrafts = await requestAiDrafts(intake.sourceText, intake.sourceType || 'email');
        const nextDrafts = importedDrafts.length
          ? importedDrafts
          : parseEventCandidates(intake.sourceText, intake.sourceType || 'email', companies);
        setDrafts(nextDrafts);
        setParseStatus(
          importedDrafts.length
            ? (language === 'ja' ? 'Gemini で草稿を生成しました' : language === 'zh' ? '已由 Gemini 生成草稿' : 'Drafts generated by Gemini')
            : (language === 'ja' ? 'ローカル解析にフォールバックしました' : language === 'zh' ? '已回退到本地解析' : 'Fell back to local parsing')
        );
        if (nextDrafts.length) {
          setMessage(text.imported(nextDrafts.length));
          window.setTimeout(() => setMessage(''), 2200);
        }
      } catch {
        const fallbackDrafts = parseEventCandidates(intake.sourceText, intake.sourceType || 'email', companies);
        setDrafts(fallbackDrafts);
        setParseStatus(language === 'ja' ? 'ローカル解析にフォールバックしました' : language === 'zh' ? '已回退到本地解析' : 'Fell back to local parsing');
        if (fallbackDrafts.length) {
          setMessage(text.imported(fallbackDrafts.length));
          window.setTimeout(() => setMessage(''), 2200);
        }
      } finally {
        setAiParsing(false);
      }
    };

    loadImportedDrafts();
  }, [companies, text]);

  const eventTypeOptions = EVENT_TYPE_OPTIONS[language];
  const locationOptions = LOCATION_OPTIONS[language];

  const parsedCountLabel = useMemo(() => {
    if (!drafts.length) return text.noDrafts;
    return `${drafts.length}`;
  }, [drafts, text]);

  const handleCancelCapture = () => {
    setSourceText('');
    setDrafts([]);
    setMessage('');
    setParseStatus('');
    if (embedded) {
      onClose();
    }
  };

  const handleParse = async () => {
    try {
      setAiParsing(true);
      setParseStatus(language === 'ja' ? 'Gemini で解析中...' : language === 'zh' ? 'Gemini 解析中...' : 'Parsing with Gemini...');
      const aiDrafts = await requestAiDrafts(sourceText, sourceType);
      const nextDrafts = aiDrafts.length
        ? aiDrafts
        : parseEventCandidates(sourceText, sourceType, companies);
      setDrafts(nextDrafts);
      setParseStatus(
        aiDrafts.length
          ? (language === 'ja' ? 'Gemini で草稿を生成しました' : language === 'zh' ? '已由 Gemini 生成草稿' : 'Drafts generated by Gemini')
          : (language === 'ja' ? 'ローカル解析にフォールバックしました' : language === 'zh' ? '已回退到本地解析' : 'Fell back to local parsing')
      );
      if (!nextDrafts.length) {
        setMessage(text.noEventDetected);
        window.setTimeout(() => setMessage(''), 1800);
        return;
      }
      setMessage(text.created(nextDrafts.length));
      window.setTimeout(() => setMessage(''), 1800);
    } catch {
      const fallbackDrafts = parseEventCandidates(sourceText, sourceType, companies);
      setDrafts(fallbackDrafts);
      setParseStatus(language === 'ja' ? 'ローカル解析にフォールバックしました' : language === 'zh' ? '已回退到本地解析' : 'Fell back to local parsing');
      if (!fallbackDrafts.length) {
        setMessage(text.noEventDetected);
        window.setTimeout(() => setMessage(''), 1800);
        return;
      }
      setMessage(text.created(fallbackDrafts.length));
      window.setTimeout(() => setMessage(''), 1800);
    } finally {
      setAiParsing(false);
    }
  };

  const updateDraft = (id, patch) => {
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== id) return draft;
        const next = { ...draft, ...patch, updated_at: new Date().toISOString() };
        const needsAttention = !next.title || !next.start_at || next.confidence < 0.6;
        return {
          ...next,
          needs_attention: patch.needs_attention ?? needsAttention,
        };
      }),
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
      needs_attention: targetStatus !== 'confirmed' && draft.needs_attention,
      updated_at: new Date().toISOString(),
    };
    upsertEvent(persisted);
    try {
      await createReviewTaskForEvent(persisted);
    } catch {
      // non-blocking
    }
    setSavingId('');
    setMessage(targetStatus === 'confirmed' ? text.confirmedSaved : text.draftSaved);
    window.setTimeout(() => setMessage(''), 1500);
    onSaved(persisted);
  };

  const content = (
    <>
      {message ? <div className="success-banner">{message}</div> : null}

      <div className="event-capture-grid">
        <Card
          title={text.inputTitle}
          action={<Badge variant="accent">{text.parsingAssist}</Badge>}
          className="event-capture-input-card"
        >
          <div className="event-capture-controls">
            <button className="btn-primary" onClick={handleParse} disabled={aiParsing || !sourceText.trim()}>
              <Wand2 size={16} /> {aiParsing ? text.saving : text.parseBtn}
            </button>
            <button className="btn-secondary" onClick={handleCancelCapture} disabled={aiParsing}>
              {text.cancelInput}
            </button>
          </div>
          {parseStatus ? (
            <div className="text-muted" style={{ marginTop: '0.6rem', fontSize: '0.82rem' }}>
              {parseStatus}
            </div>
          ) : null}

          <textarea
            className="ui-textarea event-source-text"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={text.sourcePlaceholder}
            rows={embedded ? 12 : 16}
          />

          <div className="event-capture-hint">
            <Sparkles size={14} />
            <span>{text.hint}</span>
          </div>
        </Card>

        <Card
          title={text.draftsTitle}
          action={<span className="text-muted">{parsedCountLabel}</span>}
          className="event-capture-drafts-card"
        >
          <div className="event-draft-list">
            {drafts.map((draft) => (
              <article key={draft.id} className="event-draft-card glass-panel">
                <div className="event-draft-head">
                  <div>
                    <strong>{draft.title || text.untitled}</strong>
                    <p className="text-muted">{draft.company_name_raw || text.unidentifiedCompany}</p>
                  </div>
                </div>

                <div className="event-draft-form">
                  <input
                    className="ui-input"
                    value={draft.title || ''}
                    onChange={(e) => updateDraft(draft.id, { title: e.target.value })}
                    placeholder={text.titlePlaceholder}
                  />
                  <select
                    className="ui-input"
                    value={draft.company_id || ''}
                    onChange={(e) => {
                      const company = companies.find((item) => String(item.id) === e.target.value);
                      updateDraft(draft.id, {
                        company_id: company?.id || null,
                        company_name_raw: company?.name || draft.company_name_raw,
                      });
                    }}
                  >
                    <option value="">{text.linkLater}</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                  <input
                    className="ui-input"
                    value={draft.company_name_raw || ''}
                    onChange={(e) => updateDraft(draft.id, { company_name_raw: e.target.value })}
                    placeholder={text.rawCompany}
                  />
                  <select
                    className="ui-input"
                    value={draft.event_type || 'general'}
                    onChange={(e) => updateDraft(draft.id, { event_type: e.target.value })}
                  >
                    {eventTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <div className="event-draft-time-group">
                    <input
                      className="ui-input"
                      type="date"
                      value={toLocalDateInput(draft.start_at)}
                      onChange={(e) =>
                        updateDraft(draft.id, {
                          start_at: fromDateAndOptionalTime(e.target.value, toLocalTimeInput(draft.start_at)),
                          start_time_tbd: !toLocalTimeInput(draft.start_at),
                        })
                      }
                      aria-label={text.startAtLabel}
                    />
                    <input
                      className="ui-input"
                      type="time"
                      value={toLocalTimeInput(draft.start_at)}
                      onChange={(e) =>
                        updateDraft(draft.id, {
                          start_at: fromDateAndOptionalTime(toLocalDateInput(draft.start_at), e.target.value),
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
                      value={toLocalDateInput(draft.end_at)}
                      onChange={(e) =>
                        updateDraft(draft.id, {
                          end_at: fromDateAndOptionalTime(e.target.value, toLocalTimeInput(draft.end_at)),
                          end_time_tbd: Boolean(e.target.value) && !toLocalTimeInput(draft.end_at),
                        })
                      }
                      aria-label={text.endAtLabel}
                    />
                    <input
                      className="ui-input"
                      type="time"
                      value={toLocalTimeInput(draft.end_at)}
                      onChange={(e) =>
                        updateDraft(draft.id, {
                          end_at: fromDateAndOptionalTime(toLocalDateInput(draft.end_at), e.target.value),
                          end_time_tbd: Boolean(toLocalDateInput(draft.end_at)) && !e.target.value,
                        })
                      }
                      aria-label={text.endTimeLabel}
                    />
                  </div>
                  <select
                    className="ui-input"
                    value={draft.location_type || 'unknown'}
                    onChange={(e) => updateDraft(draft.id, { location_type: e.target.value })}
                  >
                    {locationOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <input
                    className="ui-input"
                    value={draft.location_value || ''}
                    onChange={(e) => updateDraft(draft.id, { location_value: e.target.value })}
                    placeholder={text.locationPlaceholder}
                  />
                  <textarea
                    className="ui-textarea"
                    rows={3}
                    value={draft.notes || ''}
                    onChange={(e) => updateDraft(draft.id, { notes: e.target.value })}
                    placeholder={text.notesPlaceholder}
                  />
                </div>

                <details className="event-draft-source">
                  <summary>
                    <CalendarClock size={14} /> {text.sourceText}
                  </summary>
                  <pre>{draft.source_text || ''}</pre>
                </details>

                <div className="event-draft-actions">
                  <button
                    className="btn-secondary"
                    disabled={savingId === draft.id}
                    onClick={() => saveDraft(draft, 'draft')}
                  >
                    <Save size={16} /> {savingId === draft.id ? text.saving : text.saveDraft}
                  </button>
                  <button
                    className="btn-primary"
                    disabled={savingId === draft.id || !draft.title || !draft.start_at}
                    onClick={() => saveDraft(draft, 'confirmed')}
                  >
                    <Save size={16} /> {savingId === draft.id ? text.saving : text.saveConfirmed}
                  </button>
                </div>
              </article>
            ))}

            {!drafts.length ? (
              <div className="event-empty-state">
                <p>{text.noDrafts}</p>
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
            <h2>{text.panelTitle}</h2>
            <p>{text.panelSubtitle}</p>
          </div>
          <button className="btn-secondary events-capture-toggle" onClick={() => setExpanded((value) => !value)}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? text.collapse : text.expand}
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
          <h1>{text.pageTitle}</h1>
          <p className="subtitle">{text.pageSubtitle}</p>
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
