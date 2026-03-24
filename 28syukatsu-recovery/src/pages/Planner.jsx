import React, { useEffect, useMemo, useState } from 'react';
import { Card, Badge } from '../components/ui/Card';
import { useCoreData } from '../hooks/useCoreData';
import { CalendarClock, CheckCircle2, Plus, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Planner.css';

const CORE_API = 'http://127.0.0.1:8789/api/core';

function isReviewTask(task) {
  return String(task.title || '').startsWith('[Review Event]');
}

function isDueSoon(deadline) {
  if (!deadline) return false;
  const now = new Date();
  const due = new Date(deadline);
  const diff = due.getTime() - now.getTime();
  return diff <= 1000 * 60 * 60 * 24 * 3;
}

function Planner() {
  const { t } = useTranslation();
  const { tasks, companies, fetchTasks, fetchCompanies, toggleTask, loading, error } = useCoreData();
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    title: '',
    company_id: '',
    deadline: '',
    priority: 'medium'
  });

  useEffect(() => {
    fetchTasks();
    fetchCompanies();
  }, [fetchTasks, fetchCompanies]);

  const taskBuckets = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== 'done');
    return {
      focus: openTasks.filter((task) => task.priority === 'high').slice(0, 5),
      review: openTasks.filter((task) => isReviewTask(task)).slice(0, 5),
      upcoming: openTasks
        .filter((task) => task.deadline)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 8)
    };
  }, [tasks]);

  const plannerHints = useMemo(() => {
    const hints = [];
    if (taskBuckets.review.length > 0) {
      hints.push(t('planner.hint_review', { count: taskBuckets.review.length }));
    }
    if (taskBuckets.focus.length > 0) {
      hints.push(t('planner.hint_focus', { count: taskBuckets.focus.length }));
    }
    if (taskBuckets.upcoming.some((task) => isDueSoon(task.deadline))) {
      hints.push(t('planner.hint_soon'));
    }
    if (hints.length === 0) {
      hints.push(t('planner.hint_calm'));
    }
    return hints.slice(0, 3);
  }, [taskBuckets, t]);

  const createTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const res = await fetch(`${CORE_API}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        company_id: form.company_id ? Number(form.company_id) : null,
        deadline: form.deadline || null,
        status: 'todo',
        priority: form.priority
      })
    });

    if (res.ok) {
      setForm({ title: '', company_id: '', deadline: '', priority: 'medium' });
      setMsg(t('planner.task_added'));
      fetchTasks();
      window.setTimeout(() => setMsg(''), 1400);
    } else {
      setMsg(t('planner.task_failed'));
      window.setTimeout(() => setMsg(''), 1800);
    }
  };

  return (
    <div className="page-container planner-page">
      <header className="page-header">
        <div>
          <h1>{t('planner.title')}</h1>
          <p className="subtitle">{t('planner.subtitle')}</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}
      {msg ? <div className="success-banner">{msg}</div> : null}

      <div className="planner-grid">
        <Card title={t('planner.quick_add')} className="planner-form-card">
          <form className="planner-form" onSubmit={createTask}>
            <input
              className="ui-input"
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              placeholder={t('planner.task_placeholder')}
            />
            <select
              className="ui-input"
              value={form.company_id}
              onChange={(e) => setForm((current) => ({ ...current, company_id: e.target.value }))}
            >
              <option value="">{t('planner.no_company')}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
            <input
              className="ui-input"
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((current) => ({ ...current, deadline: e.target.value }))}
            />
            <select
              className="ui-input"
              value={form.priority}
              onChange={(e) => setForm((current) => ({ ...current, priority: e.target.value }))}
            >
              <option value="high">{t('planner.priority_high')}</option>
              <option value="medium">{t('planner.priority_medium')}</option>
              <option value="low">{t('planner.priority_low')}</option>
            </select>
            <button className="btn-primary" type="submit" disabled={loading}>
              <Plus size={16} /> {t('planner.add_task')}
            </button>
          </form>
        </Card>

        <Card title={t('planner.signals')} className="planner-signals-card">
          <ul className="planner-hint-list">
            {plannerHints.map((hint, index) => (
              <li key={index}>
                <Sparkles size={15} />
                <span>{hint}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="planner-board">
        <Card title={t('planner.focus_tasks')} action={<Badge variant="danger">{taskBuckets.focus.length}</Badge>}>
          <div className="planner-task-list">
            {taskBuckets.focus.map((task) => (
              <button key={task.id} className="planner-task-item" onClick={() => toggleTask(task.id)}>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.company_name || t('planner.general')}{task.deadline ? ` / ${task.deadline}` : ''}</p>
                </div>
                <CheckCircle2 size={16} />
              </button>
            ))}
            {!taskBuckets.focus.length ? <p className="text-muted">{t('planner.no_high')}</p> : null}
          </div>
        </Card>

        <Card title={t('planner.review_queue')} action={<Badge variant="warning">{taskBuckets.review.length}</Badge>}>
          <div className="planner-task-list">
            {taskBuckets.review.map((task) => (
              <button key={task.id} className="planner-task-item" onClick={() => toggleTask(task.id)}>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.company_name || t('planner.event_review')}{task.deadline ? ` / ${task.deadline}` : ''}</p>
                </div>
                <CheckCircle2 size={16} />
              </button>
            ))}
            {!taskBuckets.review.length ? <p className="text-muted">{t('planner.no_review')}</p> : null}
          </div>
        </Card>

        <Card title={t('planner.upcoming_deadlines')} action={<Badge variant="accent">{taskBuckets.upcoming.length}</Badge>}>
          <div className="planner-task-list">
            {taskBuckets.upcoming.map((task) => (
              <button key={task.id} className="planner-task-item" onClick={() => toggleTask(task.id)}>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.company_name || t('planner.general')} / {task.deadline || t('planner.no_deadline_label')}</p>
                </div>
                <div className="planner-task-meta">
                  <CalendarClock size={15} />
                  {isDueSoon(task.deadline) ? <Badge variant="danger">{t('planner.soon')}</Badge> : null}
                </div>
              </button>
            ))}
            {!taskBuckets.upcoming.length ? <p className="text-muted">{t('planner.no_deadline')}</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Planner;
