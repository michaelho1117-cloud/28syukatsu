import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, Badge } from '../components/ui/Card';
import { consumeResearchHubIntake } from '../utils/researchHubIntake';
import {
  BookOpenText,
  Building2,
  Search,
  ArrowRight,
  Trash2,
  CheckCheck,
  ChevronsUpDown
} from 'lucide-react';
import {
  getNoteTypeLabel,
  getNoteTypeOptions,
  getSourceTypeOptions,
  isAiGenerated
} from '../utils/researchNotes';
import './ResearchHub.css';

const CORE_API = '/api/core';

const PAGE_COPY = {
  title: { ja: '研究资料', en: 'Research Hub', zh: '研究资料' },
  subtitle: {
    ja: '企业研究资料を、用途ごとに整理・保存・確認していく資料库です。',
    en: 'A document library for storing, reviewing, and organizing company research.',
    zh: '按用途整理、保存并确认企业研究资料的文档库。'
  },
  createTitle: { ja: '研究资料を追加', en: 'Add Research Asset', zh: '添加研究资料' },
  libraryTitle: { ja: '研究资料ライブラリ', en: 'Research Library', zh: '研究资料库' },
  selectedCompany: { ja: '選択中', en: 'Selected', zh: '已选择' },
  searchCompany: { ja: '会社名を検索して選択', en: 'Search and select a company', zh: '搜索并选择公司' },
  noCompanies: { ja: '該当する会社が見つかりません。', en: 'No companies found.', zh: '没有找到匹配公司。' },
  sourceUrl: { ja: '参照 URL（任意）', en: 'Source URL (optional)', zh: '参考 URL（可选）' },
  titlePlaceholder: { ja: 'タイトル', en: 'Title', zh: '标题' },
  contentPlaceholder: {
    ja: '研究メモ、説明会整理、比較メモ、AI生成の下書きなどを貼り付けてください。',
    en: 'Paste research notes, event summaries, comparison notes, or AI drafts here.',
    zh: '可粘贴研究笔记、说明会整理、比较备忘或 AI 草稿。'
  },
  tagsPlaceholder: {
    ja: 'タグ（任意・カンマ区切り。例：説明会, 面接, カルチャー）',
    en: 'Tags (optional, comma-separated. e.g. seminar, interview, culture)',
    zh: '标签（可选，逗号分隔。例如：说明会, 面试, 文化）'
  },
  submit: { ja: '研究资料を追加', en: 'Add Research Asset', zh: '添加研究资料' },
  saving: { ja: '保存中...', en: 'Saving...', zh: '保存中...' },
  added: { ja: '研究资料を追加しました。', en: 'Research asset added.', zh: '研究资料已添加。' },
  addFailed: { ja: '研究资料の保存に失敗しました。', en: 'Failed to save research asset.', zh: '保存研究资料失败。' },
  loadFailed: { ja: 'Research Hub を読み込めません。Core API を確認してください。', en: 'Unable to load Research Hub. Check the Core API.', zh: '无法加载 Research Hub，请检查 Core API。' },
  requiredError: { ja: '会社・タイトル・本文は必須です。', en: 'Company, title, and content are required.', zh: '公司、标题和正文为必填项。' },
  searchPlaceholder: { ja: '会社名・タイトル・本文で検索', en: 'Search by company, title, or content', zh: '按公司名、标题或正文搜索' },
  noBody: { ja: '本文はまだありません。', en: 'No body content yet.', zh: '还没有正文内容。' },
  untitled: { ja: '無題ノート', en: 'Untitled note', zh: '未命名笔记' },
  noCompany: { ja: '会社未指定', en: 'No company linked', zh: '未指定公司' },
  aiPending: { ja: 'AI生成 / 待確認', en: 'AI Generated / Pending Review', zh: 'AI生成 / 待确认' },
  confirming: { ja: '確認中...', en: 'Confirming...', zh: '确认中...' },
  confirmed: { ja: '確認済みに更新しました。', en: 'Marked as verified.', zh: '已更新为已确认。' },
  confirmFailed: { ja: '確認状態の更新に失敗しました。', en: 'Failed to update confirmation state.', zh: '更新确认状态失败。' },
  deleteTitle: { ja: 'この研究资料を削除しますか？', en: 'Delete this research asset?', zh: '确定删除这条研究资料吗？' },
  deleteDesc: { ja: 'この操作は元に戻せません。', en: 'This action cannot be undone.', zh: '此操作无法撤销。' },
  deleted: { ja: '研究资料を削除しました。', en: 'Research asset deleted.', zh: '研究资料已删除。' },
  deleteFailed: { ja: '研究资料の削除に失敗しました。', en: 'Failed to delete research asset.', zh: '删除研究资料失败。' },
  openFull: { ja: '全文を開く', en: 'Open full note', zh: '打开全文' },
  noResultsTitle: { ja: '該当する研究资料がありません。', en: 'No matching research assets.', zh: '没有匹配的研究资料。' },
  noResultsBody: { ja: '検索条件を変えるか、新しい研究ノートを追加してください。', en: 'Try another search or add a new research note.', zh: '请调整搜索条件，或新增一条研究资料。' }
};

function pickText(language, value) {
  if (language === 'zh') return value.zh;
  if (language === 'en') return value.en;
  return value.ja;
}

function createPreview(content) {
  const normalized = String(content || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > 150 ? `${normalized.slice(0, 150)}...` : normalized;
}

export default function ResearchHub() {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [companyQuery, setCompanyQuery] = useState('');
  const [companyPickerOpen, setCompanyPickerOpen] = useState(false);
  const companyPickerRef = useRef(null);
  const [form, setForm] = useState({
    company_id: '',
    note_type: 'company_overview',
    source_type: 'verified',
    source_url: '',
    title: '',
    content: '',
    tags: ''
  });

  const noteTypeOptions = useMemo(() => getNoteTypeOptions(language), [language]);
  const sourceTypeOptions = useMemo(() => getSourceTypeOptions(language), [language]);

  const dismissSoon = (setter) => {
    window.setTimeout(() => setter(''), 1600);
  };

  const load = async () => {
    try {
      setLoading(true);
      const [assetsRes, companiesRes] = await Promise.all([
        fetch(`${CORE_API}/research-assets`),
        fetch(`${CORE_API}/companies`)
      ]);
      if (!assetsRes.ok || !companiesRes.ok) throw new Error('failed');
      const [assetsData, companiesData] = await Promise.all([assetsRes.json(), companiesRes.json()]);
      setRows(assetsData || []);
      setCompanies(companiesData || []);
      setError('');
    } catch {
      setError(pickText(language, PAGE_COPY.loadFailed));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [language]);

  useEffect(() => {
    if (!companies.length) return;
    const intake = consumeResearchHubIntake();
    if (!intake?.content) return;

    const matchedCompany = intake.company_id
      ? companies.find((company) => String(company.id) === String(intake.company_id))
      : null;

    setForm((current) => ({
      ...current,
      company_id: intake.company_id ? String(intake.company_id) : '',
      note_type: intake.note_type || 'event_note',
      source_type: intake.source_type || 'verified',
      source_url: intake.source_url || '',
      title: intake.title || '',
      content: intake.content || '',
      tags: intake.tags || '',
    }));
    setCompanyQuery(matchedCompany?.name || '');
  }, [companies]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!companyPickerRef.current?.contains(event.target)) {
        setCompanyPickerOpen(false);
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((item) => {
      const haystack = [
        item.title,
        item.company_name,
        item.company_name_en,
        item.tags,
        item.content,
        item.note_type
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, search]);

  const selectedCompany = useMemo(
    () => companies.find((company) => String(company.id) === String(form.company_id)) || null,
    [companies, form.company_id]
  );

  const companyResults = useMemo(() => {
    const query = companyQuery.trim().toLowerCase();
    if (!query) return companies.slice(0, 12);

    return companies
      .filter((company) => {
        const haystack = [
          company.name,
          company.canonical_name_en,
          company.aliases,
          company.industry,
          company.category
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 12);
  }, [companies, companyQuery]);

  const handleChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCompanySelect = (company) => {
    setForm((current) => ({ ...current, company_id: String(company.id) }));
    setCompanyQuery(company.name || '');
    setCompanyPickerOpen(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.company_id || !form.title.trim() || !form.content.trim()) {
      setError(pickText(language, PAGE_COPY.requiredError));
      dismissSoon(setError);
      return;
    }

    try {
      setSaving(true);
      setError('');
      const res = await fetch(`${CORE_API}/companies/${form.company_id}/research-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          reliability: 3
        })
      });
      if (!res.ok) throw new Error('failed');

      setSuccess(pickText(language, PAGE_COPY.added));
      setForm({
        company_id: '',
        note_type: 'company_overview',
        source_type: 'verified',
        source_url: '',
        title: '',
        content: '',
        tags: ''
      });
      setCompanyQuery('');
      await load();
      dismissSoon(setSuccess);
    } catch {
      setError(pickText(language, PAGE_COPY.addFailed));
      dismissSoon(setError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event, assetId) => {
    event.preventDefault();
    event.stopPropagation();

    const confirmed = window.confirm(
      `${pickText(language, PAGE_COPY.deleteTitle)}\n\n${pickText(language, PAGE_COPY.deleteDesc)}`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${CORE_API}/research-assets/${assetId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('failed');
      setRows((current) => current.filter((item) => item.id !== assetId));
      setSuccess(pickText(language, PAGE_COPY.deleted));
      dismissSoon(setSuccess);
    } catch {
      setError(pickText(language, PAGE_COPY.deleteFailed));
      dismissSoon(setError);
    }
  };

  const handleConfirm = async (event, asset) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      setConfirmingId(asset.id);
      const res = await fetch(`${CORE_API}/research-assets/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: asset.title,
          content: asset.content,
          note_type: asset.note_type,
          source_type: 'verified'
        })
      });
      if (!res.ok) throw new Error('failed');

      setRows((current) =>
        current.map((item) =>
          item.id === asset.id ? { ...item, source_type: 'verified' } : item
        )
      );
      setSuccess(pickText(language, PAGE_COPY.confirmed));
      dismissSoon(setSuccess);
    } catch {
      setError(pickText(language, PAGE_COPY.confirmFailed));
      dismissSoon(setError);
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="page-container research-hub-page">
      <header className="page-header">
        <div>
          <h1>{pickText(language, PAGE_COPY.title)}</h1>
          <p className="subtitle">{pickText(language, PAGE_COPY.subtitle)}</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}
      {success ? <div className="success-banner">{success}</div> : null}

      <Card title={pickText(language, PAGE_COPY.createTitle)} className="research-create-card">
        <form className="research-create-form" onSubmit={handleSubmit}>
          <div className="research-create-grid">
            <div className="research-company-picker" ref={companyPickerRef}>
              <div className="research-company-input-wrap">
                <Search size={14} />
                <input
                  className="ui-input research-company-input"
                  value={companyQuery}
                  placeholder={pickText(language, PAGE_COPY.searchCompany)}
                  onFocus={() => setCompanyPickerOpen(true)}
                  onChange={(event) => {
                    setCompanyQuery(event.target.value);
                    setCompanyPickerOpen(true);
                    if (selectedCompany && event.target.value !== selectedCompany.name) {
                      setForm((current) => ({ ...current, company_id: '' }));
                    }
                  }}
                />
                <button
                  type="button"
                  className="research-company-toggle"
                  onClick={() => setCompanyPickerOpen((current) => !current)}
                  aria-label={pickText(language, PAGE_COPY.searchCompany)}
                >
                  <ChevronsUpDown size={16} />
                </button>
              </div>

              {companyPickerOpen ? (
                <div className="research-company-results">
                  {companyResults.length ? (
                    companyResults.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        className={`research-company-option ${String(form.company_id) === String(company.id) ? 'is-selected' : ''}`}
                        onClick={() => handleCompanySelect(company)}
                      >
                        <span className="research-company-option-name">{company.name}</span>
                        {company.canonical_name_en ? (
                          <span className="research-company-option-meta">{company.canonical_name_en}</span>
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <div className="research-company-empty">{pickText(language, PAGE_COPY.noCompanies)}</div>
                  )}
                </div>
              ) : null}

              {selectedCompany ? (
                <div className="research-company-selected">
                  {pickText(language, PAGE_COPY.selectedCompany)}: <strong>{selectedCompany.name}</strong>
                </div>
              ) : null}
            </div>

            <select
              className="ui-input"
              value={form.note_type}
              onChange={(event) => handleChange('note_type', event.target.value)}
            >
              {noteTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              className="ui-input"
              value={form.source_type}
              onChange={(event) => handleChange('source_type', event.target.value)}
            >
              {sourceTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <input
              className="ui-input"
              placeholder={pickText(language, PAGE_COPY.sourceUrl)}
              value={form.source_url}
              onChange={(event) => handleChange('source_url', event.target.value)}
            />

            <input
              className="ui-input research-create-title"
              placeholder={pickText(language, PAGE_COPY.titlePlaceholder)}
              value={form.title}
              onChange={(event) => handleChange('title', event.target.value)}
            />
          </div>

          <textarea
            className="ui-textarea"
            placeholder={pickText(language, PAGE_COPY.contentPlaceholder)}
            rows={8}
            value={form.content}
            onChange={(event) => handleChange('content', event.target.value)}
          />

          <div className="research-create-grid research-create-meta">
            <input
              className="ui-input"
              placeholder={pickText(language, PAGE_COPY.tagsPlaceholder)}
              value={form.tags}
              onChange={(event) => handleChange('tags', event.target.value)}
            />
          </div>

          <div className="research-create-actions">
            <button className="btn-primary" type="submit" disabled={saving}>
              <BookOpenText size={16} />
              {saving ? pickText(language, PAGE_COPY.saving) : pickText(language, PAGE_COPY.submit)}
            </button>
          </div>
        </form>
      </Card>

      <Card
        title={pickText(language, PAGE_COPY.libraryTitle)}
        action={<span className="text-muted">{filtered.length} 件</span>}
      >
        <div className="research-search">
          <Search size={14} />
          <input
            className="ui-input"
            placeholder={pickText(language, PAGE_COPY.searchPlaceholder)}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="research-library-list">
          {filtered.map((asset) => (
            <article key={asset.id} className="research-library-card">
              <div className="research-library-meta">
                <span className="research-library-company">
                  <Building2 size={14} />
                  {asset.company_name || pickText(language, PAGE_COPY.noCompany)}
                </span>
                <div className="research-library-actions">
                  <Badge variant="accent">{getNoteTypeLabel(asset.note_type, language)}</Badge>
                  {isAiGenerated(asset.source_type) ? (
                    <button
                      type="button"
                      className="research-confirm-btn"
                      onClick={(event) => handleConfirm(event, asset)}
                      disabled={confirmingId === asset.id}
                      title={pickText(language, PAGE_COPY.aiPending)}
                    >
                      <CheckCheck size={14} />
                      {confirmingId === asset.id ? pickText(language, PAGE_COPY.confirming) : pickText(language, PAGE_COPY.aiPending)}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="research-delete-btn"
                    onClick={(event) => handleDelete(event, asset.id)}
                    aria-label={pickText(language, PAGE_COPY.deleteTitle)}
                    title={pickText(language, PAGE_COPY.deleteTitle)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="research-library-main">
                <h3>{asset.title || pickText(language, PAGE_COPY.untitled)}</h3>
                <p>{createPreview(asset.content) || pickText(language, PAGE_COPY.noBody)}</p>
              </div>

              <div className="research-library-footer">
                <span className="text-muted">
                  {asset.created_at ? String(asset.created_at).slice(0, 10) : '--'}
                </span>
                <Link className="research-library-open" to={`/research-hub/${asset.id}`}>
                  {pickText(language, PAGE_COPY.openFull)} <ArrowRight size={14} />
                </Link>
              </div>
            </article>
          ))}

          {!filtered.length && !loading ? (
            <div className="research-empty-state">
              <BookOpenText size={18} />
              <div>
                <strong>{pickText(language, PAGE_COPY.noResultsTitle)}</strong>
                <p>{pickText(language, PAGE_COPY.noResultsBody)}</p>
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
