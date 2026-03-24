import React, { useEffect, useMemo, useState } from 'react';
import { useCoreData } from '../hooks/useCoreData';
import { Card } from '../components/ui/Card';
import { useTranslation } from 'react-i18next';
import './Applications.css';
import { Clock, Plus, MoveRight } from 'lucide-react';

const KANBAN_STAGES = [
  'Interested', 'Applied', 'Web Test', '1st Interview', '2nd Interview', 'Final', 'Offer', 'Rejected'
];

const CORE_API = 'http://localhost:8789/api/core';

function Applications() {
  const { t } = useTranslation();
  const { applications, fetchApplications, loading, error } = useCoreData();
  const [showForm, setShowForm] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [dropStage, setDropStage] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [form, setForm] = useState({
    company_id: '',
    position: '',
    status: 'Interested',
    deadline: '',
    next_step: '',
    memo: ''
  });

  useEffect(() => {
    fetchApplications();
    fetch(`${CORE_API}/companies`).then((r) => r.json()).then(setCompanies).catch(console.error);
  }, [fetchApplications]);

  const kanbanBoard = useMemo(() => {
    const board = {};
    KANBAN_STAGES.forEach((stage) => {
      board[stage] = [];
    });
    applications.forEach((app) => {
      const status = KANBAN_STAGES.includes(app.status) ? app.status : 'Interested';
      board[status].push(app);
    });
    return board;
  }, [applications]);

  const timelineItems = useMemo(() => {
    return applications
      .filter((a) => a.deadline)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 8);
  }, [applications]);

  const handleAdd = async (e) => {
    e.preventDefault();
    await fetch(`${CORE_API}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, company_id: Number(form.company_id) })
    });
    setShowForm(false);
    setForm({ company_id: '', position: '', status: 'Interested', deadline: '', next_step: '', memo: '' });
    fetchApplications();
  };

  const updateStatus = async (app, nextStatus) => {
    if (!app || app.status === nextStatus) return;
    try {
      const res = await fetch(`${CORE_API}/applications/${app.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, next_step: app.next_step || '' })
      });
      if (!res.ok) throw new Error('failed');
      setStatusMsg(`${app.company_name} -> ${nextStatus}`);
      window.setTimeout(() => setStatusMsg(''), 1600);
      fetchApplications();
    } catch {
      setStatusMsg('状態更新に失敗しました。Core API を確認してください。');
      window.setTimeout(() => setStatusMsg(''), 1600);
    }
  };

  const moveToNextStage = (app) => {
    const idx = KANBAN_STAGES.indexOf(app.status);
    if (idx < 0 || idx >= KANBAN_STAGES.length - 1) return;
    updateStatus(app, KANBAN_STAGES[idx + 1]);
  };

  const onDropStage = async (stage) => {
    if (!draggingId) return;
    const app = applications.find((x) => x.id === draggingId);
    setDropStage('');
    setDraggingId(null);
    await updateStatus(app, stage);
  };

  return (
    <div className="page-container applications-page">
      <header className="page-header">
        <div>
          <h1>{t('applications.title')}</h1>
          <p className="subtitle">{t('applications.subtitle')}</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            <Plus size={18} />
            <span>{showForm ? 'フォームを閉じる' : t('applications.add_btn')}</span>
          </button>
        </div>
      </header>

      {statusMsg && <div className="success-banner">{statusMsg}</div>}

      {showForm && (
        <Card className="app-quick-form-card">
          <form className="app-quick-form" onSubmit={handleAdd}>
            <div className="app-form-field">
              <label>会社 *</label>
              <select value={form.company_id} onChange={(e) => setForm((p) => ({ ...p, company_id: e.target.value }))} required>
                <option value="">-- 会社を選択 --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="app-form-field">
              <label>ポジション</label>
              <input
                placeholder="例: Digital Consultant"
                value={form.position}
                onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
              />
            </div>
            <div className="app-form-field">
              <label>選考ステータス</label>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                {KANBAN_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="app-form-field">
              <label>締切</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))} />
            </div>
            <div className="app-form-field" style={{ gridColumn: '1/-1' }}>
              <label>次のアクション</label>
              <input
                placeholder="例: エントリーシート提出"
                value={form.next_step}
                onChange={(e) => setForm((p) => ({ ...p, next_step: e.target.value }))}
              />
            </div>
            <div className="app-form-actions" style={{ gridColumn: '1/-1' }}>
              <button type="submit" className="btn-primary">追加する</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>キャンセル</button>
            </div>
          </form>
        </Card>
      )}

      {error && <div className="error-banner">{error}</div>}

      <Card title="応募タイムライン（直近8件）" className="timeline-card">
        {timelineItems.length ? (
          <div className="app-timeline-list">
            {timelineItems.map((item) => (
              <div key={item.id} className="app-timeline-row">
                <span className="app-timeline-date">{item.deadline}</span>
                <span className="app-timeline-company">{item.company_name}</span>
                <span className="app-timeline-stage">{item.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">締切が設定された応募はまだありません。</p>
        )}
      </Card>

      <div className="kanban-container">
        {KANBAN_STAGES.map((stage) => (
          <div
            key={stage}
            className={`kanban-column glass-panel ${dropStage === stage ? 'drop-active' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDropStage(stage);
            }}
            onDragLeave={() => setDropStage('')}
            onDrop={(e) => {
              e.preventDefault();
              onDropStage(stage);
            }}
          >
            <div className="kanban-column-header">
              <h3 className="kanban-column-title">{stage}</h3>
              <span className="kanban-count">{kanbanBoard[stage].length}</span>
            </div>

            <div className="kanban-cards">
              {kanbanBoard[stage].map((app) => (
                <div
                  key={app.id}
                  className="kanban-card mix-glass"
                  draggable
                  onDragStart={() => setDraggingId(app.id)}
                >
                  <div className="kanban-card-company">{app.company_name}</div>
                  <div className="kanban-card-position">{app.position || t('applications.general_app')}</div>
                  {app.deadline && (
                    <div className="kanban-card-deadline">
                      <Clock size={12} />
                      <span>{app.deadline}</span>
                    </div>
                  )}
                  {app.next_step && (
                    <div className="kanban-card-next">
                      <strong>{t('applications.next')}</strong> {app.next_step}
                    </div>
                  )}
                  {app.status !== 'Rejected' && app.status !== 'Offer' && (
                    <button className="kanban-next-btn" onClick={() => moveToNextStage(app)}>
                      <MoveRight size={13} /> 次へ進める
                    </button>
                  )}
                </div>
              ))}
              {kanbanBoard[stage].length === 0 && !loading && (
                <div className="kanban-empty">{t('applications.no_apps')}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Applications;
