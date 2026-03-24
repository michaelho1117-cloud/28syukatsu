import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { useTranslation } from 'react-i18next';
import { useCoreData } from '../hooks/useCoreData';
import { Mail, Settings, RefreshCw, ShieldCheck, PlusSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveCaptureIntake } from '../utils/captureIntake';
import './Emails.css';

const CORE_API = 'http://127.0.0.1:8789/api/core';

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
  const japanese = (value.match(/[ぁ-んァ-ヶー一-龠]/g) || []).length;
  const replacement = (value.match(/�/g) || []).length;
  const mojibake = (value.match(/[茫芒脙脗]/g) || []).length;
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
    return '未能提取到可读正文。当前邮箱里可能只存了编码后的预览内容，请先重新同步后再查看。';
  }

  return candidate;
}

function Emails() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
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

  const handleEmailClick = (mail) => {
    setSelectedEmail(mail);
    updateEmailStatus(mail.id, 'read');
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
    const patterns = ['pwc', 'deloitte', 'デロイト', 'kpmg', 'ey', 'kearney', 'bain', 'bcg', 'mckinsey'];
    const hit = patterns.find((keyword) => text.includes(keyword));
    return hit || mail.sender || 'Unknown Company';
  };

  const handleCreateTaskFromEmail = async () => {
    if (!selectedEmail) return;

    const company = detectCompanyName(selectedEmail);
    const title = `[邮件跟进] ${company}: ${selectedEmail.subject || '后续任务'}`;

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

      setActionMsg('已创建任务，正在打开 Planner...');
      window.setTimeout(() => {
        setActionMsg('');
        navigate('/planner');
      }, 900);
    } catch {
      setActionMsg('任务创建失败，请确认 Core API 正在运行');
      window.setTimeout(() => setActionMsg(''), 1800);
    }
  };

  const searchPlaceholder = i18n.language === 'zh'
    ? '搜索标题或发件人...'
    : i18n.language === 'ja'
      ? '件名または送信者で検索...'
      : 'Search subject or sender...';

  return (
    <div className="page-container emails-page">
      <header className="page-header">
        <div className="header-left">
          <h1>{t('emails.title')}</h1>
          <p className="subtitle">{t('emails.subtitle')}</p>
        </div>
        <div className="header-right">
          <div className="search-box">
            <Mail size={16} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className={`btn-primary ${syncActive ? 'syncing' : ''}`} onClick={handleToggleSync} disabled={loading || syncActive}>
            <RefreshCw size={18} className={syncActive ? 'spin' : ''} />
            <span>{syncActive ? 'Syncing...' : t('emails.sync_btn')}</span>
          </button>
        </div>
      </header>

      <div className="emails-content">
        <div className="emails-main">
          <Card className="emails-card">
            <div className="email-tabs">
              <button className={`tab-btn ${jobOnly ? 'active' : ''}`} onClick={() => setJobOnly(true)}>
                {t('emails.job_hunt_focus')}
              </button>
              <button className={`tab-btn ${!jobOnly ? 'active' : ''}`} onClick={() => setJobOnly(false)}>
                {t('emails.all_emails')}
              </button>
              {syncActive && (
                <div className="sync-status">
                  <span className="sync-dot" />
                  {t('emails.syncing')}
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
              !loading && <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>{t('emails.no_emails')}</p>
            )}
          </Card>
        </div>

        <div className="emails-sidebar">
          {selectedEmail ? (
            <Card title={t('emails.detail_view') || '邮件正文'} className="email-detail-card">
              <div className="email-detail-content">
                <div className="detail-header">
                  <h3>{selectedEmail.subject}</h3>
                  <div className="detail-meta">
                    <span><strong>From:</strong> {selectedEmail.sender}</span>
                    <span><strong>Time:</strong> {new Date(selectedEmail.date).toLocaleString()}</span>
                  </div>
                </div>

                <div className="detail-actions">
                  <button className="btn-secondary" onClick={handleExtractToCapture}>
                    <PlusSquare size={16} /> 提取为 Event 草稿
                  </button>
                  <button className="btn-primary" onClick={handleCreateTaskFromEmail}>
                    <PlusSquare size={16} /> 一键转任务
                  </button>
                </div>

                <div className="detail-body glass-panel">
                  {extractReadableBody(selectedEmail.body_preview)}
                </div>

                {actionMsg && <div className="email-action-msg">{actionMsg}</div>}
              </div>
            </Card>
          ) : (
            <Card title={t('emails.imap_setup')} className="config-card">
              <div className="config-form">
                <div className="status-indicator">
                  <div className="status-label">
                    <ShieldCheck size={16} color="var(--status-success)" />
                    <span style={{ color: 'var(--status-success)', fontWeight: 'bold' }}>Connected</span>
                  </div>
                  <div className="status-detail" style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.8 }}>
                    michaelho1117@gmail.com
                  </div>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
                  <p style={{ fontSize: '0.75rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                    Auto-sync active: fetches and tags job-hunting emails every few minutes.
                  </p>
                  <button className="btn-secondary" onClick={() => alert('Account switching coming soon.')} style={{ width: '100%' }}>
                    <Settings size={16} /> Switch Account
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
