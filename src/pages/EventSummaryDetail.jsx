import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, CalendarDays, Link2, MapPin, Save, Sparkles, Edit2, X, Check } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { getEventById, patchEvent } from '../utils/eventStore';
import { saveResearchHubIntake } from '../utils/researchHubIntake';
import './EventSummaryDetail.css';

const CORE_API = '/api/core';

const COPY = {
  ja: {
    back: 'イベントへ戻る',
    pageTitle: 'イベント要約',
    pageSubtitle: '参加後の学び・所感・議論の要点を、あとで再利用しやすい形で整理します。',
    summaryLabel: 'Summary',
    summaryPlaceholder: 'イベントの要点、気づき、質問と回答、今後の示唆などを書いてください。',
    aiPolish: 'AIで整える',
    polishing: 'AIで整えています...',
    save: '保存',
    edit: '編集',
    cancel: 'キャンセル',
    acceptPolish: 'この案を反映',
    dismissPolish: '元の文章を維持',
    addToResearch: 'Research Hubへ追加',
    saved: 'Summary を保存しました。',
    saveFailed: 'Summary の保存に失敗しました。',
    polishFailed: 'AI整形に失敗しました。',
    polishReady: 'AIの整形案を確認できます。',
    notFound: 'イベントが見つかりません。',
    sourceLink: '参照リンク',
    companyUnknown: '主体未識別',
    noTime: '時間未設定',
    noLocation: '場所未設定',
  },
  zh: {
    back: '返回 Events',
    pageTitle: '活动总结',
    pageSubtitle: '把参加后的收获、讨论要点和复盘整理成后续可复用的知识。',
    summaryLabel: 'Summary',
    summaryPlaceholder: '写下活动要点、问题回答、个人收获、后续启发等。',
    aiPolish: 'AI 润色',
    polishing: 'AI 润色中...',
    save: '保存',
    edit: '编辑',
    cancel: '取消',
    acceptPolish: '采用这版',
    dismissPolish: '保留原文',
    addToResearch: '添加到 Research Hub',
    saved: '已保存 Summary。',
    saveFailed: '保存 Summary 失败。',
    polishFailed: 'AI 润色失败。',
    polishReady: '可查看 AI 润色后的版本。',
    notFound: '未找到该事件。',
    sourceLink: '来源链接',
    companyUnknown: '主体未识别',
    noTime: '时间未设置',
    noLocation: '地点未设置',
  },
  en: {
    back: 'Back to Events',
    pageTitle: 'Event Summary',
    pageSubtitle: 'Turn post-event takeaways, reflection, and notes into reusable knowledge.',
    summaryLabel: 'Summary',
    summaryPlaceholder: 'Write key takeaways, discussion notes, insights, and follow-up thoughts.',
    aiPolish: 'Polish with AI',
    polishing: 'Polishing with AI...',
    save: 'Save',
    edit: 'Edit',
    cancel: 'Cancel',
    acceptPolish: 'Use polished version',
    dismissPolish: 'Keep original',
    addToResearch: 'Add to Research Hub',
    saved: 'Summary saved.',
    saveFailed: 'Failed to save summary.',
    polishFailed: 'Failed to polish with AI.',
    polishReady: 'AI polish draft ready for review.',
    notFound: 'Event not found.',
    sourceLink: 'Source link',
    companyUnknown: 'Organizer not identified',
    noTime: 'Time not set',
    noLocation: 'Location not set',
  },
};

function pickText(language, values) {
  if (language === 'zh') return values.zh;
  if (language === 'en') return values.en;
  return values.ja;
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

export default function EventSummaryDetail() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const language = document.documentElement.lang?.startsWith('zh')
    ? 'zh'
    : document.documentElement.lang?.startsWith('en')
      ? 'en'
      : 'ja';
  const text = COPY[language];

  const [event, setEvent] = useState(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(true);
  const [polishing, setPolishing] = useState(false);
  const [polishedText, setPolishedText] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const found = getEventById(eventId);
    setEvent(found);
    setDraft(found?.summary || '');
    setEditing(!String(found?.summary || '').trim());
  }, [eventId]);

  const sourceUrl = useMemo(() => normalizeUrl(event?.location_value || ''), [event?.location_value]);
  const hasSavedSummary = Boolean(String(event?.summary || '').trim());

  const dismissSoon = () => {
    window.setTimeout(() => setMessage(''), 1800);
  };

  const refreshEvent = () => {
    const latest = getEventById(eventId);
    setEvent(latest);
    return latest;
  };

  const handleSave = () => {
    if (!event) return;
    try {
      patchEvent(event.id, { summary: draft });
      const latest = refreshEvent();
      setDraft(latest?.summary || draft);
      setEditing(false);
      setPolishedText('');
      setMessage(text.saved);
      dismissSoon();
    } catch {
      setMessage(text.saveFailed);
      dismissSoon();
    }
  };

  const handleAiPolish = async () => {
    if (!draft.trim()) return;
    try {
      setPolishing(true);
      const res = await fetch(`${CORE_API}/ai/polish-event-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary_text: draft,
          event_title: event?.title || '',
          company_name: event?.company_name_raw || '',
        }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setPolishedText(String(data.polished_text || '').trim());
      setMessage(text.polishReady);
      dismissSoon();
    } catch {
      setMessage(text.polishFailed);
      dismissSoon();
    } finally {
      setPolishing(false);
    }
  };

  const handleSendToResearchHub = () => {
    if (!event || !String(event.summary || '').trim()) return;
    saveResearchHubIntake({
      company_id: event.company_id || '',
      note_type: 'event_note',
      source_type: 'verified',
      source_url: sourceUrl,
      title: `${event.title || 'Untitled event'} Summary`,
      content: event.summary,
      tags: '',
    });
    navigate('/research-hub');
  };

  if (!event) {
    return (
      <div className="page-container">
        <div className="error-banner">{text.notFound}</div>
      </div>
    );
  }

  return (
    <div className="page-container event-summary-page">
      <header className="page-header event-summary-header">
        <div>
          <div className="event-summary-breadcrumbs">
            <button className="btn-secondary" onClick={() => navigate('/events')}>
              <ArrowLeft size={16} /> {text.back}
            </button>
          </div>
          <h1>{text.pageTitle}</h1>
          <p className="subtitle">{text.pageSubtitle}</p>
        </div>
      </header>

      {message ? <div className="success-banner">{message}</div> : null}

      <Card
        title={event.title || text.pageTitle}
        action={
          event.company_name_raw ? (
            <span className="event-summary-company-pill">{event.company_name_raw}</span>
          ) : null
        }
        className="event-summary-card"
      >
        <div className="event-summary-meta">
          <span className="event-summary-meta-item">
            <CalendarDays size={15} />
            {formatEventTime(event.start_at, event.end_at, language, text.noTime, event.start_time_tbd)}
          </span>
          <span className="event-summary-meta-item">
            <MapPin size={15} />
            {event.location_type === 'unknown' ? text.noLocation : event.location_value || event.location_type}
          </span>
          {sourceUrl ? (
            <a className="event-summary-meta-item event-summary-link" href={sourceUrl} target="_blank" rel="noreferrer">
              <Link2 size={15} />
              {shortenUrl(sourceUrl)}
            </a>
          ) : null}
          {!event.company_name_raw ? (
            <span className="event-summary-meta-item">
              <Building2 size={15} />
              {text.companyUnknown}
            </span>
          ) : null}
        </div>

        {editing ? (
          <>
            <div className="event-summary-top-actions">
              <button className="btn-secondary" onClick={handleAiPolish} disabled={polishing || !draft.trim()}>
                <Sparkles size={15} /> {polishing ? text.polishing : text.aiPolish}
              </button>
            </div>

            {polishedText ? (
              <div className="event-summary-polish-panel">
                <div className="event-summary-polish-head">
                  <strong>{text.aiPolish}</strong>
                </div>
                <article className="event-summary-polish-preview">{polishedText}</article>
                <div className="event-summary-polish-actions">
                  <button type="button" className="btn-primary" onClick={() => { setDraft(polishedText); setPolishedText(''); }}>
                    <Check size={15} /> {text.acceptPolish}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setPolishedText('')}>
                    <X size={15} /> {text.dismissPolish}
                  </button>
                </div>
              </div>
            ) : null}

            <label className="event-summary-editor-label">{text.summaryLabel}</label>
            <textarea
              className="ui-textarea event-summary-editor"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={text.summaryPlaceholder}
            />

            <div className="event-summary-bottom-actions">
              <button className="btn-primary" onClick={handleSave} disabled={!draft.trim()}>
                <Save size={15} /> {text.save}
              </button>
              {hasSavedSummary ? (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setDraft(event.summary || '');
                    setPolishedText('');
                    setEditing(false);
                  }}
                >
                  <X size={15} /> {text.cancel}
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <article className="event-summary-content">{event.summary}</article>
            <div className="event-summary-bottom-actions">
              <button className="btn-primary" onClick={() => setEditing(true)}>
                <Edit2 size={15} /> {text.edit}
              </button>
              <button className="btn-secondary" onClick={handleSendToResearchHub}>
                <Building2 size={15} /> {text.addToResearch}
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
