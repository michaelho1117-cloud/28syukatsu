import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { useTranslation } from 'react-i18next';
import { useCoreData } from '../hooks/useCoreData';
import { Mail, Settings, RefreshCw, ShieldCheck, PlusSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveCaptureIntake } from '../utils/captureIntake';
import './Emails.css';

const CORE_API = '/api/core';
const EMAIL_TEXT = {
  ja: {
    title: 'メール・更新',
    subtitle: '応募関連の通知や更新をまとめて確認します。',
    searchPlaceholder: '件名または送信者で検索...',
    syncBtn: 'メール同期',
    syncing: '同期中...',
    jobFocus: '就活 Focus',
    allEmails: 'すべて',
    noEmails: 'まだメールが同期されていません。',
    detailTitle: 'メール本文',
    extractToEvent: 'Extract Event',
    createTask: '一键转任务',
    detailFrom: 'From',
    detailTime: 'Time',
    emptyTitle: 'メール設定',
    connected: 'Connected',
    autoSyncHint: 'Auto-sync active: fetches and tags job-hunting emails every few minutes.',
    switchAccount: 'Switch Account',
    noReadableBody: '未能提取到可读正文。当前邮箱可能仅保存了编码预览内容，请稍后重试。',
    taskCreated: '已创建任务，正在打开 Planner...',
    taskFailed: '任务创建失败，请确认 Core API 正在运行。',
    unknownCompany: 'Unknown Company',
  },
  zh: {
    title: '邮件・更新',
    subtitle: '集中查看与申请相关的通知和更新。',
    searchPlaceholder: '按标题或发件人搜索...',
    syncBtn: '邮件同步',
    syncing: '同步中...',
    jobFocus: '求职 Focus',
    allEmails: '全部',
    noEmails: '还没有同步到邮件。',
    detailTitle: '邮件正文',
    extractToEvent: '提取 Event',
    createTask: '一键转任务',
    detailFrom: 'From',
    detailTime: 'Time',
    emptyTitle: '邮件设置',
    connected: 'Connected',
    autoSyncHint: '已开启自动同步：每隔几分钟抓取并标记求职邮件。',
    switchAccount: '切换账户',
    noReadableBody: '未能提取到可读正文。当前邮箱可能只保存了编码预览内容，请稍后重试。',
    taskCreated: '已创建任务，正在打开 Planner...',
    taskFailed: '任务创建失败，请确认 Core API 正在运行。',
    unknownCompany: '未知公司',
  },
  en: {
    title: 'Mail & Updates',
    subtitle: 'Review recruiting-related notifications and updates in one place.',
    searchPlaceholder: 'Search subject or sender...',
    syncBtn: 'Sync Mail',
    syncing: 'Syncing...',
    jobFocus: 'Job Hunt Focus',
    allEmails: 'All',
    noEmails: 'No emails have been synced yet.',
    detailTitle: 'Email Body',
    extractToEvent: 'Extract Event',
    createTask: 'Create Task',
    detailFrom: 'From',
    detailTime: 'Time',
    emptyTitle: 'Mail Settings',
    connected: 'Connected',
    autoSyncHint: 'Auto-sync active: fetches and tags job-hunting emails every few minutes.',
    switchAccount: 'Switch Account',
    noReadableBody: 'Could not extract a readable body yet. The inbox may only have an encoded preview right now.',
    taskCreated: 'Task created. Opening Planner...',
    taskFailed: 'Failed to create task. Please confirm the Core API is running.',
    unknownCompany: 'Unknown Company',
  },
};

function stripHtml(input = '') {
  return String(input || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function decodeUtf8FromByteLikeString(text = '') {
  const bytes = Uint8Array.from(Array.from(String(text || '')), (char) => char.charCodeAt(0) & 0xff);
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return text;
  }
}

function readabilityScore(text = '') {
  const value = String(text || '');
  const japanese = (value.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) || []).length;
  const replacement = (value.match(/�/g) || []).length;
  const mojibake = (value.match(/[ÃÂÐ]/g) || []).length;
  return japanese * 3 - replacement * 4 - mojibake * 2 + Math.min(value.length, 200) * 0.02;
}

function repairMojibake(input = '') {
  let current = String(input || '');
  for (let i = 0; i < 2; i += 1) {
    const repaired = decodeUtf8FromByteLikeString(current);
    if (readabilityScore(repaired) > readabilityScore(current)) {
      current = repaired;
    } else {
      break;
    }
  }
  return current;
}

function extractBase64Block(input = '') {
  const lines = String(input || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const base64Lines = lines.filter((line) => /^[A-Za-z0-9+/=]{40,}$/.test(line));
  if (base64Lines.length < 2) return '';
  return base64Lines.join('');
}

function decodeLooseBase64(input = '') {
  const compact = String(input || '').replace(/\s+/g, '');
  if (!compact || compact.length < 40 || compact.length % 4 !== 0) return '';
  if (!/^[A-Za-z0-9+/=]+$/.test(compact)) return '';

  try {
    const decoded = atob(compact);
    const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return '';
  }
}

function cleanupBody(text = '') {
  return String(text || '')
    .replace(/^--[A-Za-z0-9'()+_,./:=?-]+$/gm, '')
    .replace(/^(Content-Id:|Content-Type:|Content-Transfer-Encoding:|Content-Disposition:).*/gim, '')
    .replace(/^(Delivered-To:|Received:|X-Received:|ARC-|Authentication-Results:|Return-Path:|Message-ID:|MIME-Version:|DKIM-Signature:).*/gim, '')
    .replace(/^[A-Za-z0-9+/=]{80,}$/gm, '')
    .replace(/^[-\w]+:\s.*$/gim, (line) => (line.length > 120 ? '' : line))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractReadableBody(raw) {
  const src = String(raw || '').replace(/\r\n/g, '\n').trim();
  if (!src) return 'No content preview available.';

  let candidate = src;

  const embeddedBase64 = extractBase64Block(src);
  if (embeddedBase64) {
    const decoded = decodeLooseBase64(embeddedBase64);
    if (decoded) candidate = decoded;
  } else {
    const fullyBase64 = decodeLooseBase64(src);
    if (fullyBase64) candidate = fullyBase64;
  }

  candidate = stripHtml(candidate);
  candidate = repairMojibake(candidate);
  candidate = cleanupBody(candidate);

  const lines = candidate.split('\n').map((line) => line.trim()).filter(Boolean);
  const headerLikeCount = lines.filter((line) =>
    /^(Delivered-To:|Received:|X-Received:|ARC-|Authentication-Results:|Return-Path:|Message-ID:|MIME-Version:)/i.test(line)
  ).length;

  if (!candidate || lines.length === 0 || headerLikeCount >= 3) {
    return '';
  }

  return candidate;
}

function Emails() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language === 'ja' ? 'ja' : i18n.language === 'zh' ? 'zh' : 'en';
  const text = EMAIL_TEXT[lang];
  const {
    emails,
    loading,
    syncActive,
    fetchLocalEmails,
    updateEmailStatus,
    triggerManualSync
  } = useCoreData();

  const [jobOnly, setJobOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [actionMsg, setActionMsg] = useState('');
  const [loadingBodyUid, setLoadingBodyUid] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchLocalEmails(jobOnly, debouncedSearch);
  }, [fetchLocalEmails, jobOnly, debouncedSearch]);

  const handleToggleSync = async () => {
    const success = await triggerManualSync();
    if (success) {
      await fetchLocalEmails(jobOnly, debouncedSearch);
    }
  };

  const handleEmailClick = async (mail) => {
    setSelectedEmail(mail);
    updateEmailStatus(mail.id, 'read');

    if (!mail?.uid) return;

    try {
      setLoadingBodyUid(mail.uid);
      const res = await fetch(`/api/email/body/${mail.uid}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.body) return;
      setSelectedEmail((current) => (current?.uid === mail.uid
        ? { ...current, body_preview: data.body }
        : current));
    } catch {
      // keep existing preview
    } finally {
      setLoadingBodyUid(null);
    }
  };

  const handleExtractToCapture = () => {
    if (!selectedEmail) return;
    const sourceText = [
      `Subject: ${selectedEmail.subject || ''}`,
      `From: ${selectedEmail.sender || ''}`,
      `Date: ${selectedEmail.date || ''}`,
      '',
      extractReadableBody(selectedEmail.body_preview)
    ].join('\n');

    saveCaptureIntake({
      sourceType: 'email',
      sourceText
    });
    navigate('/capture');
  };

  const detectCompanyName = (mail) => {
    const text = `${mail.sender || ''} ${mail.subject || ''}`.toLowerCase();
    const patterns = ['pwc', 'deloitte', '銉囥儹銈ゃ儓', 'kpmg', 'ey', 'kearney', 'bain', 'bcg', 'mckinsey'];
    const hit = patterns.find((keyword) => text.includes(keyword));
    return hit || mail.sender || 'Unknown Company';
  };

  const handleCreateTaskFromEmail = async () => {
    if (!selectedEmail) return;

    const company = detectCompanyName(selectedEmail);
    const title = `[閭欢璺熻繘] ${company}: ${selectedEmail.subject || '鍚庣画浠诲姟'}`;

    try {
      const res = await fetch(`${CORE_API}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          company_id: null,
          deadline: selectedEmail.detected_event_date || null,
          status: 'todo',
          priority: selectedEmail.detected_event_date ? 'high' : 'medium'
        })
      });

      if (!res.ok) throw new Error('Failed to create task');

      setActionMsg(text.taskCreated);
      window.setTimeout(() => {
        setActionMsg('');
        navigate('/planner');
      }, 900);
    } catch {
      setActionMsg(text.taskFailed);
      window.setTimeout(() => setActionMsg(''), 1800);
    }
  };

  return (
    <div className="page-container emails-page">
      <header className="page-header">
        <div className="header-left">
          <h1>{text.title}</h1>
          <p className="subtitle">{text.subtitle}</p>
        </div>
        <div className="header-right">
          <div className="search-box">
            <Mail size={16} />
            <input
              type="text"
              placeholder={text.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className={`btn-primary ${syncActive ? 'syncing' : ''}`} onClick={handleToggleSync} disabled={loading || syncActive}>
            <RefreshCw size={18} className={syncActive ? 'spin' : ''} />
            <span>{syncActive ? text.syncing : text.syncBtn}</span>
          </button>
        </div>
      </header>

      <div className="emails-content">
        <div className="emails-main">
          <Card className="emails-card">
            <div className="email-tabs">
              <button className={`tab-btn ${jobOnly ? 'active' : ''}`} onClick={() => setJobOnly(true)}>
                {text.jobFocus}
              </button>
              <button className={`tab-btn ${!jobOnly ? 'active' : ''}`} onClick={() => setJobOnly(false)}>
                {text.allEmails}
              </button>
              {syncActive && (
                <div className="sync-status">
                  <span className="sync-dot" />
                  {text.syncing}
                </div>
              )}
            </div>

            {emails && emails.length > 0 ? (
              <div className="mail-list">
                {emails.map((mail) => (
                  <div
                    key={mail.id}
                    className={`mail-item glass-panel ${mail.status === 'unread' ? 'unread' : ''} ${selectedEmail?.id === mail.id ? 'active' : ''}`}
                    onClick={() => handleEmailClick(mail)}
                  >
                    <div className="mail-header">
                      <span className="mail-company">
                        {mail.sender}
                        {mail.is_job_hunt === 1 && <span className="mail-chip">JOB</span>}
                      </span>
                      <span className="mail-date">
                        {new Date(mail.date).toLocaleString(i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'zh' ? 'zh-CN' : 'en-US')}
                      </span>
                    </div>
                    <div className="mail-subject">
                      <Mail size={16} />
                      <span>{mail.subject}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !loading && <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>{text.noEmails}</p>
            )}
          </Card>
        </div>

        <div className="emails-sidebar">
          {selectedEmail ? (
            <Card title={text.detailTitle} className="email-detail-card">
              <div className="email-detail-content">
                <div className="detail-header">
                  <h3>{selectedEmail.subject}</h3>
                  <div className="detail-meta">
                    <span><strong>{text.detailFrom}:</strong> {selectedEmail.sender}</span>
                    <span><strong>{text.detailTime}:</strong> {new Date(selectedEmail.date).toLocaleString()}</span>
                  </div>
                </div>

                <div className="detail-actions">
                  <button className="btn-secondary" onClick={handleExtractToCapture}>
                    <PlusSquare size={16} /> {text.extractToEvent}
                  </button>
                  <button className="btn-primary" onClick={handleCreateTaskFromEmail}>
                    <PlusSquare size={16} /> {text.createTask}
                  </button>
                </div>

                <div className="detail-body glass-panel">
                  {extractReadableBody(selectedEmail.body_preview) || text.noReadableBody}
                </div>

                {actionMsg && <div className="email-action-msg">{actionMsg}</div>}
              </div>
            </Card>
          ) : (
            <Card title={text.emptyTitle} className="config-card">
              <div className="config-form">
                <div className="status-indicator">
                  <div className="status-label">
                    <ShieldCheck size={16} color="var(--status-success)" />
                    <span style={{ color: 'var(--status-success)', fontWeight: 'bold' }}>{text.connected}</span>
                  </div>
                  <div className="status-detail" style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.8 }}>
                    michaelho1117@gmail.com
                  </div>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
                  <p style={{ fontSize: '0.75rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                    {text.autoSyncHint}
                  </p>
                  <button className="btn-secondary" onClick={() => alert('Account switching coming soon.')} style={{ width: '100%' }}>
                    <Settings size={16} /> {text.switchAccount}
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default Emails;

