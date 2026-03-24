import React, { useMemo, useState } from 'react';
import { Card, Badge } from '../components/ui/Card';
import { Plus, Search, Trash2, SquareArrowOutUpRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Journal.css';

const STORAGE_KEY = 'shukatsu_career_journal_v1';
const CORE_API = 'http://127.0.0.1:8789/api/core';

const LEGACY_TYPE_MAP = {
  '鏃ユ銉偘': 'daily',
  '闈㈡帴鎸倞杩斻倞': 'interview',
  'ES閫叉崡': 'es',
  '銈便兗銈圭反缈?': 'case',
  '浼佹キ鐮旂┒': 'research',
  '瀛︾繏銉°儮': 'learning',
  '閫辨銉儞銉ャ兗': 'weekly',
  '日次ログ': 'daily',
  '面接振り返り': 'interview',
  'ES進捗': 'es',
  'ケース練習': 'case',
  '企業研究': 'research',
  '学習メモ': 'learning',
  '週次レビュー': 'weekly',
  '日常记录': 'daily',
  '面试复盘': 'interview',
  'Case 练习': 'case',
  '学习笔记': 'learning',
  '周复盘': 'weekly'
};

function normalizeType(value = '') {
  return LEGACY_TYPE_MAP[value] || value || 'daily';
}

function loadEntries() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((entry) => ({ ...entry, type: normalizeType(entry.type) }))
      : [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function buildTaskTitle(entry, fallbackScope) {
  const scope = entry.company?.trim() ? entry.company.trim() : fallbackScope;
  return `[Journal] ${scope}: ${entry.title}`;
}

function priorityFromType(type) {
  if (type === 'interview' || type === 'weekly') return 'high';
  if (type === 'es' || type === 'case') return 'medium';
  return 'low';
}

function Journal() {
  const { t } = useTranslation();
  const typeOptions = [
    { value: 'daily', label: t('journal.type_daily') },
    { value: 'interview', label: t('journal.type_interview') },
    { value: 'es', label: t('journal.type_es') },
    { value: 'case', label: t('journal.type_case') },
    { value: 'research', label: t('journal.type_research') },
    { value: 'learning', label: t('journal.type_learning') },
    { value: 'weekly', label: t('journal.type_weekly') }
  ];

  const typeLabelMap = Object.fromEntries(typeOptions.map((item) => [item.value, item.label]));

  const [entries, setEntries] = useState(loadEntries);
  const [keyword, setKeyword] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'daily',
    company: '',
    title: '',
    content: ''
  });

  const visible = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) =>
      `${entry.date} ${typeLabelMap[entry.type] || entry.type} ${entry.company} ${entry.title} ${entry.content}`
        .toLowerCase()
        .includes(q)
    );
  }, [entries, keyword, typeLabelMap]);

  const weeklyStats = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    const recent = entries.filter((entry) => {
      if (!entry.date) return false;
      const date = new Date(`${entry.date}T00:00:00`);
      return date >= start && date <= now;
    });

    const typeCount = {};
    for (const entry of recent) {
      typeCount[entry.type] = (typeCount[entry.type] || 0) + 1;
    }
    const sorted = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);
    const topType = sorted[0]?.[0] || '';

    let suggestion = t('journal.suggest_daily');
    if (topType === 'research') suggestion = t('journal.suggest_research');
    if (topType === 'case') suggestion = t('journal.suggest_case');
    if (topType === 'interview') suggestion = t('journal.suggest_interview');

    return { total: recent.length, topType, suggestion };
  }, [entries, t]);

  const addEntry = () => {
    if (!form.title.trim() || !form.content.trim()) {
      setMsg(t('journal.required'));
      window.setTimeout(() => setMsg(''), 1400);
      return;
    }

    const next = [
      {
        id: Date.now(),
        ...form,
        createdAt: new Date().toISOString()
      },
      ...entries
    ].slice(0, 500);

    setEntries(next);
    saveEntries(next);
    setForm((current) => ({ ...current, title: '', content: '' }));
    setMsg(t('journal.saved'));
    window.setTimeout(() => setMsg(''), 1300);
  };

  const removeEntry = (id) => {
    const next = entries.filter((entry) => entry.id !== id);
    setEntries(next);
    saveEntries(next);
  };

  const createTaskFromEntry = async (entry) => {
    try {
      const res = await fetch(`${CORE_API}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: buildTaskTitle(entry, t('journal.general_scope')),
          company_id: null,
          deadline: entry.date || null,
          status: 'todo',
          priority: priorityFromType(entry.type)
        })
      });
      if (!res.ok) throw new Error('failed');
      setMsg(t('journal.task_created'));
      window.setTimeout(() => setMsg(''), 1500);
    } catch {
      setMsg(t('journal.task_failed'));
      window.setTimeout(() => setMsg(''), 1800);
    }
  };

  const applyWeeklyTemplate = () => {
    setForm((current) => ({
      ...current,
      type: 'weekly',
      title: current.title || t('journal.type_weekly'),
      content: current.content.trim() ? current.content : t('journal.weekly_template_body')
    }));
    setMsg(t('journal.template_applied'));
    window.setTimeout(() => setMsg(''), 1300);
  };

  return (
    <div className="page-container journal-page">
      <header className="page-header">
        <div>
          <h1>{t('journal.title')}</h1>
          <p className="subtitle">{t('journal.subtitle')}</p>
        </div>
      </header>
      {msg ? <div className="success-banner">{msg}</div> : null}

      <Card title={t('journal.pulse_title')} style={{ marginBottom: '1rem' }}>
        <p className="text-muted">{t('journal.count')}: {weeklyStats.total}</p>
        <p className="text-muted">
          {t('journal.top_type')}: {weeklyStats.topType ? (typeLabelMap[weeklyStats.topType] || weeklyStats.topType) : t('journal.none')}
        </p>
        <p>{weeklyStats.suggestion}</p>
      </Card>

      <div className="journal-grid">
        <Card
          title={t('journal.quick_record')}
          action={(
            <button className="btn-secondary journal-template-btn" onClick={applyWeeklyTemplate}>
              <Sparkles size={14} /> {t('journal.weekly_template')}
            </button>
          )}
        >
          <div className="journal-form">
            <div className="journal-form-row">
              <input
                className="ui-input"
                type="date"
                value={form.date}
                onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))}
              />
              <select
                className="ui-input"
                value={form.type}
                onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))}
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <input
              className="ui-input"
              placeholder={t('journal.company_optional')}
              value={form.company}
              onChange={(e) => setForm((current) => ({ ...current, company: e.target.value }))}
            />
            <input
              className="ui-input"
              placeholder={t('journal.title_placeholder')}
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
            />
            <textarea
              className="ui-textarea"
              rows={7}
              placeholder={t('journal.content_placeholder')}
              value={form.content}
              onChange={(e) => setForm((current) => ({ ...current, content: e.target.value }))}
            />
            <button className="btn-primary" onClick={addEntry}>
              <Plus size={16} /> {t('journal.save')}
            </button>
          </div>
        </Card>

        <Card title={t('journal.list_title', { count: visible.length })}>
          <div className="journal-search">
            <Search size={14} />
            <input
              className="ui-input"
              placeholder={t('journal.search_placeholder')}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div className="journal-list">
            {visible.map((entry) => (
              <article key={entry.id} className="journal-item glass-panel">
                <div className="journal-item-head">
                  <div>
                    <strong>{entry.title}</strong>
                    <p className="text-muted">{entry.date} / {entry.company || t('journal.general_scope')}</p>
                  </div>
                  <div className="journal-item-actions">
                    <Badge variant="accent">{typeLabelMap[entry.type] || entry.type}</Badge>
                    <button className="icon-btn" onClick={() => createTaskFromEntry(entry)} title={t('journal.taskify')}>
                      <SquareArrowOutUpRight size={14} />
                    </button>
                    <button className="icon-btn" onClick={() => removeEntry(entry.id)} title={t('journal.delete')}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="journal-content">{entry.content}</p>
              </article>
            ))}
            {!visible.length ? <p className="text-muted">{t('journal.empty')}</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Journal;
