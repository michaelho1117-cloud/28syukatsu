import React, { useEffect, useMemo, useState } from 'react';
import { useCoreData } from '../hooks/useCoreData';
import { Card } from '../components/ui/Card';
import { useTranslation } from 'react-i18next';
import './Applications.css';
import { Clock, Plus } from 'lucide-react';

const KANBAN_STAGES = [
  'Interested',
  'Applied',
  'Web Test',
  '1st Interview',
  '2nd Interview',
  'Final',
  'Offer',
  'Rejected'
];

const CORE_API = '/api/core';

function Applications() {
  const { t } = useTranslation();
  const { applications, fetchApplications, loading, error } = useCoreData();
  const [showForm, setShowForm] = useState(false);
  const [companies, setCompanies] = useState([]);
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
    fetch(`${CORE_API}/companies`)
      .then((r) => r.json())
      .then(setCompanies)
      .catch(console.error);
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

  const handleAdd = async (e) => {
    e.preventDefault();
    await fetch(`${CORE_API}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, company_id: Number(form.company_id) })
    });
    setShowForm(false);
    setForm({
      company_id: '',
      position: '',
      status: 'Interested',
      deadline: '',
      next_step: '',
      memo: ''
    });
    fetchApplications();
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
            <span>{showForm ? 'Close' : t('applications.add_btn')}</span>
          </button>
        </div>
      </header>

      {showForm && (
        <Card className="app-quick-form-card">
          <form className="app-quick-form" onSubmit={handleAdd}>
            <div className="app-form-field">
              <label>Company *</label>
              <select
                value={form.company_id}
                onChange={(e) => setForm((p) => ({ ...p, company_id: e.target.value }))}
                required
              >
                <option value="">-- Select company --</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="app-form-field">
              <label>Position</label>
              <input
                placeholder="e.g. Digital Consultant"
                value={form.position}
                onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
              />
            </div>
            <div className="app-form-field">
              <label>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                {KANBAN_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>
            <div className="app-form-field">
              <label>Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
              />
            </div>
            <div className="app-form-field" style={{ gridColumn: '1/-1' }}>
              <label>Next Step</label>
              <input
                placeholder="e.g. Submit entry sheet"
                value={form.next_step}
                onChange={(e) => setForm((p) => ({ ...p, next_step: e.target.value }))}
              />
            </div>
            <div className="app-form-actions" style={{ gridColumn: '1/-1' }}>
              <button type="submit" className="btn-primary">
                Add
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="kanban-container">
        {KANBAN_STAGES.map((stage) => (
          <div key={stage} className="kanban-column glass-panel">
            <div className="kanban-column-header">
              <h3 className="kanban-column-title">{stage}</h3>
              <span className="kanban-count">{kanbanBoard[stage].length}</span>
            </div>

            <div className="kanban-cards">
              {kanbanBoard[stage].map((app) => (
                <div key={app.id} className="kanban-card mix-glass">
                  <div className="kanban-card-company">{app.company_name}</div>
                  <div className="kanban-card-position">
                    {app.position || t('applications.general_app')}
                  </div>
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
