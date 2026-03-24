import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, Badge } from '../components/ui/Card';
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Sparkles,
  Building2,
  ChevronsUpDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { loadJournalEntriesWithRecovery } from '../utils/journalRecovery';
import './Journal.css';

const STORAGE_KEY = 'shukatsu_career_journal_v1';
const CORE_API = '/api/core';

const LEGACY_TYPE_MAP = {
  es: 'selection',
  learning: 'research'
};

const TYPE_LABELS = {
  daily: {
    ja: '日次記録',
    en: 'Daily Log',
    zh: '每日记录'
  },
  interview: {
    ja: '面接振り返り',
    en: 'Interview Reflection',
    zh: '面试复盘'
  },
  selection: {
    ja: '選考進捗',
    en: 'Selection Progress',
    zh: '选考进展'
  },
  case: {
    ja: 'ケース練習',
    en: 'Case Practice',
    zh: 'Case 练习'
  },
  research: {
    ja: '企業研究',
    en: 'Company Research',
    zh: '企业研究'
  },
  weekly: {
    ja: '週次レビュー',
    en: 'Weekly Review',
    zh: '周复盘'
  }
};

const TEMPLATE_BUTTON_LABEL = {
  ja: 'テンプレート',
  en: 'Template',
  zh: '模板'
};

const TEMPLATE_REMOVE_LABEL = {
  ja: 'テンプレート解除',
  en: 'Remove Template',
  zh: '取消模板'
};

const JOURNAL_SUBMIT_LABEL = {
  ja: '記録を追加',
  en: 'Add Entry',
  zh: '添加记录'
};

const TEMPLATE_APPLIED_MESSAGE = {
  daily: {
    ja: '日次記録テンプレートを適用しました。',
    en: 'Daily log template applied.',
    zh: '已应用 Daily Log 模板。'
  },
  interview: {
    ja: '面接振り返りテンプレートを適用しました。',
    en: 'Interview reflection template applied.',
    zh: '已应用面试复盘模板。'
  },
  selection: {
    ja: '選考進捗テンプレートを適用しました。',
    en: 'Selection progress template applied.',
    zh: '已应用选考进展模板。'
  },
  case: {
    ja: 'ケース練習テンプレートを適用しました。',
    en: 'Case practice template applied.',
    zh: '已应用 Case 练习模板。'
  },
  research: {
    ja: '企業研究テンプレートを適用しました。',
    en: 'Company research template applied.',
    zh: '已应用企业研究模板。'
  },
  weekly: {
    ja: '週次レビューのテンプレートを適用しました。',
    en: 'Weekly review template applied.',
    zh: '已应用周复盘模板。'
  }
};

const TEMPLATE_REMOVED_MESSAGE = {
  ja: 'テンプレートを解除しました。',
  en: 'Template removed.',
  zh: '已取消模板。'
};

const TEMPLATE_REMOVE_CONFIRM = {
  ja: '現在のテンプレート内容をクリアしますか？',
  en: 'Remove the current template content?',
  zh: '要清除当前模板内容吗？'
};

const TEMPLATE_TITLE_BY_TYPE = {
  daily: {
    ja: '日次記録',
    en: 'Daily Log',
    zh: '每日记录'
  },
  interview: {
    ja: '面接振り返り',
    en: 'Interview Reflection',
    zh: '面试复盘'
  },
  selection: {
    ja: '選考進捗メモ',
    en: 'Selection Progress',
    zh: '选考进展'
  },
  case: {
    ja: 'ケース練習メモ',
    en: 'Case Practice Note',
    zh: 'Case 练习记录'
  },
  research: {
    ja: '企業研究メモ',
    en: 'Research Note',
    zh: '研究笔记'
  },
  weekly: {
    ja: '週次レビュー',
    en: 'Weekly Review',
    zh: '周复盘'
  }
};

const TEMPLATE_BODY_BY_TYPE = {
  daily: {
    ja: `【今日やったこと】
-

【進んだこと】
-

【詰まったこと / 気づいたこと】
-

【次の一手】
-`,
    en: `[What I did today]
-

[What moved forward]
-

[What got stuck / insights]
-

[Next action]
-`,
    zh: `【今天做了什么】
-

【推进了什么】
-

【卡住或注意到的事情】
-

【下一步行动】
-`
  },
  interview: {
    ja: `【対象会社 / 面接段階】
-

【聞かれた質問】
-

【うまく答えられたこと】
-

【詰まった質問 / 弱かった点】
-

【次回までの改善アクション】
-`,
    en: `[Company / interview stage]
-

[Questions asked]
-

[What went well]
-

[What I struggled with]
-

[Actions before next round]
-`,
    zh: `【目标公司 / 面试轮次】
-

【被问到的问题】
-

【回答得好的地方】
-

【卡住的问题 / 薄弱点】
-

【下轮前改进行动】
-`
  },
  selection: {
    ja: `【対象会社 / 選考段階】
-

【今回の進捗】
-

【確認できたこと】
-

【懸念点 / 未対応事項】
-

【次にやること】
-`,
    en: `[Company / selection stage]
-

[Progress update]
-

[Confirmed information]
-

[Concerns / pending items]
-

[Next steps]
-`,
    zh: `【目标公司 / 选考阶段】
-

【本次进展】
-

【已确认信息】
-

【顾虑 / 待处理事项】
-

【下一步】
-`
  },
  case: {
    ja: `【ケーステーマ】
-

【最初の構造 / 切り口】
-

【良かった点】
-

【弱かった点】
-

【次回の練習重点】
-`,
    en: `[Case theme]
-

[Initial structure / approach]
-

[What went well]
-

[What was weak]
-

[Next practice focus]
-`,
    zh: `【Case题目】
-

【结构 / 切入方式】
-

【做得好的地方】
-

【薄弱点】
-

【下次练习重点】
-`
  },
  research: {
    ja: `【対象企業 / テーマ】
-

【分かったこと】
-

【まだ不明なこと】
-

【自分なりの示唆 / 仮説】
-

【次に調べること】
-`,
    en: `[Target company / topic]
-

[What I found]
-

[What is unclear]
-

[My hypothesis / insight]
-

[Next research step]
-`,
    zh: `【目标公司 / 主题】
-

【已了解内容】
-

【仍不明确】
-

【我的判断 / 假设】
-

【下一步调查】
-`
  },
  weekly: {
    ja: `【今週やったこと】
-

【進んだこと】
-

【停滞したこと / 課題】
-

【現在の優先順位】
-

【来週の重点アクション】
-`,
    en: `[What I did this week]
-

[What moved forward]
-

[What stalled / issues]
-

[Current priorities]
-

[Focus for next week]
-`,
    zh: `【本周做了什么】
-

【推进了什么】
-

【停滞 / 问题】
-

【当前优先级】
-

【下周重点行动】
-`
  }
};

const GENERAL_SCOPE_LABEL = {
  ja: '共通',
  en: 'General',
  zh: '通用'
};

const COMPANY_EMPTY_LABEL = {
  ja: '該当する会社が見つかりません。',
  en: 'No companies found.',
  zh: '未找到匹配的公司。'
};

const PROGRESS_TITLE = {
  ja: '7日間の進捗',
  en: '7-Day Progress',
  zh: '近 7 日进展'
};

const LAST_ENTRY_LABEL = {
  ja: '最終記録',
  en: 'Last entry',
  zh: '最近记录'
};

const UPDATED_MESSAGE = {
  ja: '記録を更新しました。',
  en: 'Entry updated.',
  zh: '已更新记录。'
};

function pickText(language, textSet) {
  if (language.startsWith('zh')) return textSet.zh;
  if (language.startsWith('en')) return textSet.en;
  return textSet.ja;
}

function normalizeType(value = '') {
  return LEGACY_TYPE_MAP[value] || value || 'daily';
}

function loadEntries() {
  return loadJournalEntriesWithRecovery(STORAGE_KEY, normalizeType);
}

function saveEntries(entries) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatCreatedAt(language, createdAt) {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(
    language.startsWith('zh') ? 'zh-CN' : language.startsWith('en') ? 'en-US' : 'ja-JP',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }
  ).format(date);
}

function Journal() {
  const { t, i18n } = useTranslation();
  const language = i18n.language || 'ja';
  const generalScopeLabel = pickText(language, GENERAL_SCOPE_LABEL);

  const typeOptions = useMemo(
    () =>
      ['daily', 'interview', 'selection', 'case', 'research', 'weekly'].map((value) => ({
        value,
        label: pickText(language, TYPE_LABELS[value])
      })),
    [language]
  );

  const typeLabelMap = useMemo(
    () => Object.fromEntries(typeOptions.map((item) => [item.value, item.label])),
    [typeOptions]
  );

  const [entries, setEntries] = useState(loadEntries);
  const [keyword, setKeyword] = useState('');
  const [msg, setMsg] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    date: '',
    company: '',
    title: '',
    content: ''
  });
  const [companies, setCompanies] = useState([]);
  const [companyQuery, setCompanyQuery] = useState('');
  const [companyPickerOpen, setCompanyPickerOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
  const [appliedTemplate, setAppliedTemplate] = useState(null);
  const companyPickerRef = useRef(null);
  const companyPanelRef = useRef(null);
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
      `${entry.date} ${typeLabelMap[entry.type] || entry.type} ${entry.company || ''} ${entry.title} ${entry.content}`
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

    const sortedByCreatedAt = [...recent].sort((a, b) => {
      const left = new Date(a.createdAt || `${a.date}T00:00:00`).getTime();
      const right = new Date(b.createdAt || `${b.date}T00:00:00`).getTime();
      return right - left;
    });

    return {
      total: recent.length,
      topType,
      lastEntryDate: sortedByCreatedAt[0]?.date || ''
    };
  }, [entries]);

  useEffect(() => {
    fetch(`${CORE_API}/companies`)
      .then((res) => res.json())
      .then((data) => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    if (!companyPickerOpen) return undefined;

    const updatePanelPosition = () => {
      const trigger = companyPickerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setPanelStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        zIndex: 9999
      });
    };

    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [companyPickerOpen]);

  useEffect(() => {
    if (!companyPickerOpen) return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (companyPickerRef.current?.contains(target)) return;
      if (companyPanelRef.current?.contains(target)) return;
      setCompanyPickerOpen(false);
    };

    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [companyPickerOpen]);

  const companyResults = useMemo(() => {
    const query = companyQuery.trim().toLowerCase();
    if (!query) return companies.slice(0, 10);

    return companies
      .filter((company) => {
        const haystack = [company.name, company.canonical_name_en, company.aliases, company.category]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 10);
  }, [companies, companyQuery]);

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
        type: normalizeType(form.type),
        createdAt: new Date().toISOString()
      },
      ...entries
    ].slice(0, 500);

    setEntries(next);
    saveEntries(next);
    setForm((current) => ({
      ...current,
      company: '',
      title: '',
      content: ''
    }));
    setAppliedTemplate(null);
    setCompanyQuery('');
    setCompanyPickerOpen(false);
    setMsg(t('journal.saved'));
    window.setTimeout(() => setMsg(''), 1300);
  };

  const removeEntry = (id) => {
    const next = entries.filter((entry) => entry.id !== id);
    setEntries(next);
    saveEntries(next);
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditForm({
      date: entry.date || '',
      company: entry.company || '',
      title: entry.title || '',
      content: entry.content || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      date: '',
      company: '',
      title: '',
      content: ''
    });
  };

  const saveEdit = (id) => {
    if (!editForm.title.trim() || !editForm.content.trim()) {
      setMsg(t('journal.required'));
      window.setTimeout(() => setMsg(''), 1400);
      return;
    }

    const next = entries.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            date: editForm.date,
            company: editForm.company,
            title: editForm.title,
            content: editForm.content
          }
        : entry
    );

    setEntries(next);
    saveEntries(next);
    cancelEdit();
    setMsg(pickText(language, UPDATED_MESSAGE));
    window.setTimeout(() => setMsg(''), 1300);
  };

  const applyTypeTemplate = () => {
    if (appliedTemplate) {
      const edited = form.title !== appliedTemplate.title || form.content !== appliedTemplate.content;
      if (edited) {
        const shouldRemove = window.confirm(pickText(language, TEMPLATE_REMOVE_CONFIRM));
        if (!shouldRemove) return;
      }

      setForm((current) => ({
        ...current,
        title: current.title === appliedTemplate.title ? '' : current.title,
        content: ''
      }));
      setAppliedTemplate(null);
      setMsg(pickText(language, TEMPLATE_REMOVED_MESSAGE));
      window.setTimeout(() => setMsg(''), 1300);
      return;
    }

    const currentType = normalizeType(form.type);
    const nextTitle = pickText(language, TEMPLATE_TITLE_BY_TYPE[currentType] || TEMPLATE_TITLE_BY_TYPE.daily);
    const nextContent = pickText(language, TEMPLATE_BODY_BY_TYPE[currentType] || TEMPLATE_BODY_BY_TYPE.daily);

    setForm((current) => ({
      ...current,
      title: nextTitle,
      content: nextContent
    }));
    setAppliedTemplate({
      type: currentType,
      title: nextTitle,
      content: nextContent
    });
    setMsg(pickText(language, TEMPLATE_APPLIED_MESSAGE[currentType] || TEMPLATE_APPLIED_MESSAGE.daily));
    window.setTimeout(() => setMsg(''), 1300);
  };

  const handleCompanySelect = (company) => {
    setForm((current) => ({ ...current, company: company.name || '' }));
    setCompanyQuery(company.name || '');
    setCompanyPickerOpen(false);
  };

  const companyPanel =
    companyPickerOpen && panelStyle
      ? createPortal(
          <div className="journal-company-panel" style={panelStyle} ref={companyPanelRef}>
            <div className="journal-company-search">
              <Search size={14} />
              <input
                className="ui-input"
                placeholder={t('journal.company_optional')}
                value={companyQuery}
                onChange={(e) => setCompanyQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="journal-company-results">
              {companyResults.length ? (
                companyResults.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    className="journal-company-option"
                    onClick={() => handleCompanySelect(company)}
                  >
                    <span className="journal-company-option-main">
                      <Building2 size={14} />
                      {company.name}
                    </span>
                    {company.canonical_name_en ? (
                      <span className="journal-company-option-meta">{company.canonical_name_en}</span>
                    ) : null}
                  </button>
                ))
              ) : (
                <div className="journal-company-empty">{pickText(language, COMPANY_EMPTY_LABEL)}</div>
              )}
            </div>

            <button
              type="button"
              className="journal-company-skip"
              onClick={() => {
                setForm((current) => ({ ...current, company: '' }));
                setCompanyQuery('');
                setCompanyPickerOpen(false);
              }}
            >
              {generalScopeLabel}
            </button>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="page-container journal-page">
      <header className="page-header">
        <div>
          <h1>{t('journal.title')}</h1>
          <p className="subtitle">{t('journal.subtitle')}</p>
        </div>
      </header>
      {msg ? <div className="success-banner">{msg}</div> : null}

      <Card title={pickText(language, PROGRESS_TITLE)} style={{ marginBottom: '1rem' }}>
        <div className="journal-progress-card">
          <div className="journal-progress-metrics">
            <div className="journal-progress-metric">
              <div className="journal-progress-value">{weeklyStats.total}</div>
              <div className="journal-progress-label">{t('journal.count')}</div>
            </div>
            <div className="journal-progress-metric">
              <div className="journal-progress-value journal-progress-value-text">
                {weeklyStats.topType ? typeLabelMap[weeklyStats.topType] || weeklyStats.topType : t('journal.none')}
              </div>
              <div className="journal-progress-label">{t('journal.top_type')}</div>
            </div>
          </div>
          <div className="journal-progress-meta">
            <span className="journal-progress-meta-label">{pickText(language, LAST_ENTRY_LABEL)}</span>
            <span className="journal-progress-meta-value">{weeklyStats.lastEntryDate || t('journal.none')}</span>
          </div>
        </div>
      </Card>

      <div className="journal-grid">
        <Card
          title={t('journal.quick_record')}
          action={
            <button
              className={`btn-secondary journal-template-btn ${appliedTemplate ? 'is-applied' : ''}`}
              onClick={applyTypeTemplate}
            >
              <Sparkles size={14} /> {pickText(language, appliedTemplate ? TEMPLATE_REMOVE_LABEL : TEMPLATE_BUTTON_LABEL)}
            </button>
          }
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
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="journal-company-picker" ref={companyPickerRef}>
              <button
                type="button"
                className="journal-company-trigger"
                onClick={() => setCompanyPickerOpen((current) => !current)}
              >
                <span className={`journal-company-trigger-text ${form.company ? 'has-value' : ''}`}>
                  {form.company || t('journal.company_optional')}
                </span>
                <ChevronsUpDown size={16} />
              </button>
            </div>

            {companyPanel}

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
            <div className="journal-form-actions">
              <button className="btn-primary journal-save-btn" onClick={addEntry}>
                <Plus size={16} /> {pickText(language, JOURNAL_SUBMIT_LABEL)}
              </button>
            </div>
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
                {editingId === entry.id ? (
                  <div className="journal-edit-panel">
                    <div className="journal-edit-row">
                      <input
                        className="ui-input"
                        type="date"
                        value={editForm.date}
                        onChange={(e) => setEditForm((current) => ({ ...current, date: e.target.value }))}
                      />
                      <input
                        className="ui-input"
                        placeholder={t('journal.company_optional')}
                        value={editForm.company}
                        onChange={(e) => setEditForm((current) => ({ ...current, company: e.target.value }))}
                      />
                    </div>
                    <input
                      className="ui-input"
                      placeholder={t('journal.title_placeholder')}
                      value={editForm.title}
                      onChange={(e) => setEditForm((current) => ({ ...current, title: e.target.value }))}
                    />
                    <textarea
                      className="ui-textarea"
                      rows={6}
                      value={editForm.content}
                      onChange={(e) => setEditForm((current) => ({ ...current, content: e.target.value }))}
                    />
                    <div className="journal-edit-actions">
                      <button className="btn-secondary journal-inline-btn" onClick={cancelEdit}>
                        {language.startsWith('ja') ? 'キャンセル' : language.startsWith('zh') ? '取消' : 'Cancel'}
                      </button>
                      <button className="btn-primary journal-inline-primary" onClick={() => saveEdit(entry.id)}>
                        {language.startsWith('ja') ? '保存' : language.startsWith('zh') ? '保存' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="journal-item-head">
                      <div className="journal-item-header-meta">
                        <div className="journal-item-title-row">
                          <strong className="journal-item-title">{entry.title}</strong>
                          <span className="journal-item-date">{entry.date}</span>
                        </div>
                        <div className="journal-item-company-row">
                          <span className="journal-company-pill">{entry.company || generalScopeLabel}</span>
                        </div>
                        {entry.createdAt ? (
                          <p className="text-muted journal-item-created-at">
                            {language.startsWith('ja')
                              ? `記録作成: ${formatCreatedAt(language, entry.createdAt)}`
                              : language.startsWith('zh')
                                ? `创建时间：${formatCreatedAt(language, entry.createdAt)}`
                                : `Created at: ${formatCreatedAt(language, entry.createdAt)}`}
                          </p>
                        ) : null}
                      </div>
                      <div className="journal-item-actions">
                        <Badge variant="accent">{typeLabelMap[normalizeType(entry.type)] || entry.type}</Badge>
                        <button
                          className="icon-btn"
                          onClick={() => startEdit(entry)}
                          title={language.startsWith('ja') ? '編集' : language.startsWith('zh') ? '编辑' : 'Edit'}
                        >
                          <Pencil size={14} />
                        </button>
                        <button className="icon-btn" onClick={() => removeEntry(entry.id)} title={t('journal.delete')}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="journal-content">{entry.content}</p>
                  </>
                )}
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
