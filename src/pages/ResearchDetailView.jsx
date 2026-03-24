import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Edit2, Save, X, Building2, Link2, Trash2, CheckCheck } from 'lucide-react';
import { Card, Badge } from '../components/ui/Card';
import {
  getNoteTypeLabel,
  getNoteTypeOptions,
  getSourceTypeOptions,
  isAiGenerated
} from '../utils/researchNotes';

const CORE_API = '/api/core';

const PAGE_COPY = {
  back: { ja: '戻る', en: 'Back', zh: '返回' },
  companyDetail: { ja: '会社詳細へ', en: 'Company Detail', zh: '公司详情' },
  notFound: { ja: '研究资料が見つかりません。', en: 'Research asset not found.', zh: '未找到研究资料。' },
  updated: { ja: '研究资料を更新しました。', en: 'Research asset updated.', zh: '研究资料已更新。' },
  updateFailed: { ja: '研究资料の更新に失敗しました。', en: 'Failed to update research asset.', zh: '更新研究资料失败。' },
  confirmed: { ja: 'この研究资料を確認済みにしました。', en: 'This research asset is now verified.', zh: '这条研究资料已确认。' },
  confirmFailed: { ja: '確認状態の更新に失敗しました。', en: 'Failed to update confirmation state.', zh: '更新确认状态失败。' },
  deletingTitle: { ja: 'この研究资料を削除しますか？', en: 'Delete this research asset?', zh: '确定删除这条研究资料吗？' },
  deletingDesc: { ja: 'この操作は元に戻せません。', en: 'This action cannot be undone.', zh: '此操作无法撤销。' },
  deleteFailed: { ja: '研究资料の削除に失敗しました。', en: 'Failed to delete research asset.', zh: '删除研究资料失败。' },
  company: { ja: '会社', en: 'Company', zh: '公司' },
  createdAt: { ja: '作成日', en: 'Created At', zh: '创建时间' },
  tags: { ja: 'タグ', en: 'Tags', zh: '标签' },
  titlePlaceholder: { ja: 'タイトル', en: 'Title', zh: '标题' },
  editTitle: { ja: '研究资料を編集', en: 'Edit Research Asset', zh: '编辑研究资料' },
  save: { ja: '保存', en: 'Save', zh: '保存' },
  cancel: { ja: 'キャンセル', en: 'Cancel', zh: '取消' },
  edit: { ja: '編集', en: 'Edit', zh: '编辑' },
  aiPending: { ja: 'AI生成 / 待確認', en: 'AI Generated / Pending Review', zh: 'AI生成 / 待确认' },
  confirming: { ja: '確認中...', en: 'Confirming...', zh: '确认中...' },
  delete: { ja: '削除', en: 'Delete', zh: '删除' },
  sourceLink: { ja: '参照元', en: 'Source', zh: '来源' }
};

function pickText(language, value) {
  if (language === 'zh') return value.zh;
  if (language === 'en') return value.en;
  return value.ja;
}

export default function ResearchDetailView() {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const noteTypeOptions = useMemo(() => getNoteTypeOptions(language), [language]);
  const sourceTypeOptions = useMemo(() => getSourceTypeOptions(language), [language]);
  const { assetId, companyId } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    note_type: 'company_overview',
    source_type: 'verified'
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${CORE_API}/research-assets/${assetId}`);
        if (!res.ok) throw new Error('failed');
        const found = await res.json();
        setAsset(found || null);
        setForm({
          title: found?.title || '',
          content: found?.content || '',
          note_type: found?.note_type || 'company_overview',
          source_type: found?.source_type || 'verified'
        });
      } catch {
        setAsset(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [assetId]);

  const dismissSoon = () => {
    window.setTimeout(() => setMessage(''), 1600);
  };

  const updateAssetLocally = (next) => {
    setAsset((current) => (current ? { ...current, ...next } : current));
    setForm((current) => ({ ...current, ...next }));
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${CORE_API}/research-assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('failed');
      updateAssetLocally(form);
      setEditing(false);
      setMessage(pickText(language, PAGE_COPY.updated));
      dismissSoon();
    } catch {
      setMessage(pickText(language, PAGE_COPY.updateFailed));
      dismissSoon();
    }
  };

  const handleConfirm = async () => {
    if (!asset) return;

    try {
      setConfirming(true);
      const payload = {
        title: asset.title,
        content: asset.content,
        note_type: asset.note_type,
        source_type: 'verified'
      };
      const res = await fetch(`${CORE_API}/research-assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('failed');
      updateAssetLocally({ source_type: 'verified' });
      setMessage(pickText(language, PAGE_COPY.confirmed));
      dismissSoon();
    } catch {
      setMessage(pickText(language, PAGE_COPY.confirmFailed));
      dismissSoon();
    } finally {
      setConfirming(false);
    }
  };

  const handleDelete = async () => {
    if (!asset) return;
    const confirmed = window.confirm(
      `${pickText(language, PAGE_COPY.deletingTitle)}\n\n${pickText(language, PAGE_COPY.deletingDesc)}`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${CORE_API}/research-assets/${assetId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('failed');
      navigate('/research-hub');
    } catch {
      setMessage(pickText(language, PAGE_COPY.deleteFailed));
      dismissSoon();
    }
  };

  const handleCancel = () => {
    setForm({
      title: asset?.title || '',
      content: asset?.content || '',
      note_type: asset?.note_type || 'company_overview',
      source_type: asset?.source_type || 'verified'
    });
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-pulse" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="page-container">
        <div className="error-banner">{pickText(language, PAGE_COPY.notFound)}</div>
      </div>
    );
  }

  return (
    <div className="page-container research-detail-page">
      <header className="page-header" style={{ marginBottom: '1rem' }}>
        <div className="research-detail-breadcrumbs">
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> {pickText(language, PAGE_COPY.back)}
          </button>
          <Link
            className="btn-secondary"
            to={companyId ? `/companies/${companyId}` : `/companies/${asset.company_id}`}
          >
            <Building2 size={16} /> {pickText(language, PAGE_COPY.companyDetail)}
          </Link>
        </div>
      </header>

      {message ? <div className="success-banner">{message}</div> : null}

      <Card
        title={editing ? pickText(language, PAGE_COPY.editTitle) : form.title}
        action={
          <div className="research-library-actions">
            <Badge variant="accent">{getNoteTypeLabel(form.note_type, language)}</Badge>
          </div>
        }
        className="research-detail-card"
      >
        <div className="research-detail-meta">
          <span>
            <strong>{pickText(language, PAGE_COPY.company)}:</strong> {asset.company_name}
          </span>
          {asset.company_name_en ? <span>{asset.company_name_en}</span> : null}
          {asset.created_at ? (
            <span>
              <strong>{pickText(language, PAGE_COPY.createdAt)}:</strong> {String(asset.created_at).slice(0, 19).replace('T', ' ')}
            </span>
          ) : null}
          {asset.tags ? (
            <span>
              <strong>{pickText(language, PAGE_COPY.tags)}:</strong> {asset.tags}
            </span>
          ) : null}
        </div>

        {editing ? (
          <>
            <div className="research-create-grid">
              <input
                className="ui-input research-create-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder={pickText(language, PAGE_COPY.titlePlaceholder)}
              />
              <select
                className="ui-input"
                value={form.note_type}
                onChange={(event) => setForm((current) => ({ ...current, note_type: event.target.value }))}
              >
                {noteTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                className="ui-input"
                value={form.source_type}
                onChange={(event) => setForm((current) => ({ ...current, source_type: event.target.value }))}
              >
                {sourceTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <textarea
              className="ui-textarea research-detail-editor"
              value={form.content}
              onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
            />
            <div className="research-detail-actions">
              <button className="btn-primary" onClick={handleSave}>
                <Save size={15} /> {pickText(language, PAGE_COPY.save)}
              </button>
              <button className="btn-secondary" onClick={handleCancel}>
                <X size={15} /> {pickText(language, PAGE_COPY.cancel)}
              </button>
            </div>
          </>
        ) : (
          <>
            <article className="research-detail-content">{asset.content}</article>
            <div className="research-detail-actions">
              <button className="btn-primary" onClick={() => setEditing(true)}>
                <Edit2 size={15} /> {pickText(language, PAGE_COPY.edit)}
              </button>
              {isAiGenerated(asset.source_type) ? (
                <button className="research-confirm-btn" onClick={handleConfirm} disabled={confirming}>
                  <CheckCheck size={15} />
                  {confirming ? pickText(language, PAGE_COPY.confirming) : pickText(language, PAGE_COPY.aiPending)}
                </button>
              ) : null}
              <button className="btn-secondary danger-text" onClick={handleDelete}>
                <Trash2 size={15} /> {pickText(language, PAGE_COPY.delete)}
              </button>
              {asset.source_url ? (
                <a className="btn-secondary" href={asset.source_url} target="_blank" rel="noreferrer">
                  <Link2 size={15} /> {pickText(language, PAGE_COPY.sourceLink)}
                </a>
              ) : null}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
