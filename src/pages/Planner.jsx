import React, { useEffect, useMemo, useState } from 'react';
import { Card, Badge } from '../components/ui/Card';
import { useCoreData } from '../hooks/useCoreData';
import { CalendarClock, CheckCircle2, Plus, Sparkles } from 'lucide-react';
import './Planner.css';

const CORE_API = '/api/core';

const COPY = {
  ja: {
    title: 'プランナー',
    subtitle: '今日やること、近い締切、返答待ちをひと目で整理します。',
    todayFocus: 'Today Focus',
    noTodayFocus: '今日の重点タスクはありません',
    quickAdd: 'Quick Add',
    taskPlaceholder: '次に進める行動を書いてください…',
    noCompany: '会社を紐づけない',
    addTask: 'タスクを追加',
    taskAdded: 'タスクを追加しました。',
    taskFailed: 'タスクの追加に失敗しました。',
    highPriority: 'High Priority',
    followUps: 'Follow-ups',
    upcomingDeadlines: 'Upcoming Deadlines',
    plannerInsight: 'Planner Insight',
    general: '共通',
    review: '確認待ち',
    noHighPriority: '高優先タスクはまだありません。',
    noFollowUps: '確認待ちの項目はありません。',
    noUpcomingDeadlines: '近い締切はありません。',
    dueToday: '今日が期限',
    dueTomorrow: '明日が期限',
    dueInDays: '{{count}}日後が期限',
    overdue: '{{count}}日超過',
    insightReview: '確認待ちの項目が{{count}}件あります。返答待ちの会社から先に整理しましょう。',
    insightFocus: '高優先タスクが{{count}}件あります。Today Focus から先に片付けると流れが整います。',
    insightSoon: '今週は締切が近いタスクがあります。ES とイベント準備の衝突を先にほどいておきましょう。',
    insightCalm: '今週は比較的落ち着いています。次の締切に向けて小さくでも前進させましょう。',
    priorityHigh: '高',
    priorityMedium: '中',
    priorityLow: '低',
    lastUpdatedPrefix: '期限',
  },
  zh: {
    title: '规划台',
    subtitle: '把今天该做的、临近截止和待回复事项集中整理。',
    todayFocus: '今日重点',
    noTodayFocus: '今天没有重点任务',
    quickAdd: '快速添加',
    taskPlaceholder: '写下下一步要推进的行动…',
    noCompany: '不关联公司',
    addTask: '添加任务',
    taskAdded: '任务已添加。',
    taskFailed: '任务添加失败。',
    highPriority: '高优先级',
    followUps: '待跟进',
    upcomingDeadlines: '临近截止',
    plannerInsight: '规划提示',
    general: '通用',
    review: '待确认',
    noHighPriority: '暂无高优先级任务。',
    noFollowUps: '暂无待跟进事项。',
    noUpcomingDeadlines: '暂无临近截止。',
    dueToday: '今天截止',
    dueTomorrow: '明天截止',
    dueInDays: '{{count}}天后截止',
    overdue: '已超期{{count}}天',
    insightReview: '目前有{{count}}项待跟进事项。先把等待回复或确认的内容整理出来。',
    insightFocus: '目前有{{count}}项高优先级任务。先处理 Today Focus 会更顺。',
    insightSoon: '本周有临近截止的事项，建议先处理 ES 和活动准备的冲突。',
    insightCalm: '这周节奏相对平稳，可以把重点公司各推进一步。',
    priorityHigh: '高',
    priorityMedium: '中',
    priorityLow: '低',
    lastUpdatedPrefix: '截止',
  },
  en: {
    title: 'Planner',
    subtitle: 'See what to do today, what is due soon, and what is still waiting.',
    todayFocus: 'Today Focus',
    noTodayFocus: 'No priority tasks for today.',
    quickAdd: 'Quick Add',
    taskPlaceholder: 'Next action...',
    noCompany: 'No company linked',
    addTask: 'Add Task',
    taskAdded: 'Task added.',
    taskFailed: 'Failed to create task.',
    highPriority: 'High Priority',
    followUps: 'Follow-ups',
    upcomingDeadlines: 'Upcoming Deadlines',
    plannerInsight: 'Planner Insight',
    general: 'General',
    review: 'Waiting',
    noHighPriority: 'No high-priority tasks.',
    noFollowUps: 'No follow-ups waiting.',
    noUpcomingDeadlines: 'No upcoming deadlines.',
    dueToday: 'Due today',
    dueTomorrow: 'Due tomorrow',
    dueInDays: 'Due in {{count}} days',
    overdue: '{{count}} days overdue',
    insightReview: 'You have {{count}} follow-ups waiting. Clear replies and confirmations first.',
    insightFocus: 'You have {{count}} high-priority tasks. Start with Today Focus to create momentum.',
    insightSoon: 'You have deadlines coming up this week. Untangle ES work and event prep first.',
    insightCalm: 'This week is still manageable. Push one meaningful action for each focus company.',
    priorityHigh: 'High',
    priorityMedium: 'Medium',
    priorityLow: 'Low',
    lastUpdatedPrefix: 'Due',
  },
};

function isReviewTask(task) {
  return String(task.title || '').startsWith('[Review Event]');
}

function isDueToday(deadline) {
  if (!deadline) return false;
  const now = new Date();
  const due = new Date(deadline);
  return now.toDateString() === due.toDateString();
}

function deadlineDiffDays(deadline) {
  if (!deadline) return null;
  const now = new Date();
  const due = new Date(deadline);
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((startOfDue.getTime() - startOfNow.getTime()) / (1000 * 60 * 60 * 24));
}

function formatCountdown(deadline, text) {
  const diff = deadlineDiffDays(deadline);
  if (diff === null) return '';
  if (diff < 0) return text.overdue.replace('{{count}}', String(Math.abs(diff)));
  if (diff === 0) return text.dueToday;
  if (diff === 1) return text.dueTomorrow;
  return text.dueInDays.replace('{{count}}', String(diff));
}

function Planner() {
  const language = document.documentElement.lang?.startsWith('zh')
    ? 'zh'
    : document.documentElement.lang?.startsWith('en')
      ? 'en'
      : 'ja';
  const text = COPY[language];

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
    const highPriority = openTasks.filter((task) => task.priority === 'high');
    const dueToday = openTasks.filter((task) => isDueToday(task.deadline));
    const todayFocusMap = new Map();
    [...dueToday, ...highPriority].forEach((task) => {
      if (!todayFocusMap.has(task.id)) todayFocusMap.set(task.id, task);
    });
    return {
      todayFocus: Array.from(todayFocusMap.values()).slice(0, 3),
      focus: highPriority.slice(0, 6),
      followUps: openTasks.filter((task) => isReviewTask(task)).slice(0, 6),
      upcoming: openTasks
        .filter((task) => task.deadline)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 8)
    };
  }, [tasks]);

  const plannerHints = useMemo(() => {
    const hints = [];
    if (taskBuckets.followUps.length > 0) {
      hints.push(text.insightReview.replace('{{count}}', String(taskBuckets.followUps.length)));
    }
    if (taskBuckets.focus.length > 0) {
      hints.push(text.insightFocus.replace('{{count}}', String(taskBuckets.focus.length)));
    }
    if (taskBuckets.upcoming.some((task) => {
      const diff = deadlineDiffDays(task.deadline);
      return diff !== null && diff >= 0 && diff <= 3;
    })) {
      hints.push(text.insightSoon);
    }
    if (!hints.length) hints.push(text.insightCalm);
    return hints.slice(0, 2);
  }, [taskBuckets, text]);

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
      setMsg(text.taskAdded);
      fetchTasks();
      window.setTimeout(() => setMsg(''), 1400);
    } else {
      setMsg(text.taskFailed);
      window.setTimeout(() => setMsg(''), 1800);
    }
  };

  return (
    <div className="page-container planner-page">
      <header className="page-header">
        <div>
          <h1>{text.title}</h1>
          <p className="subtitle">{text.subtitle}</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}
      {msg ? <div className="success-banner">{msg}</div> : null}

      <Card title={text.todayFocus} className="planner-today-card">
        {taskBuckets.todayFocus.length ? (
          <div className="planner-today-list">
            {taskBuckets.todayFocus.map((task) => (
              <button key={task.id} className="planner-today-item" onClick={() => toggleTask(task.id)}>
                <div className="planner-today-copy">
                  <strong>{task.title}</strong>
                  <p>{task.company_name || text.general}</p>
                </div>
                {task.deadline ? <Badge variant="danger">{formatCountdown(task.deadline, text)}</Badge> : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-muted">{text.noTodayFocus}</p>
        )}
      </Card>

      <Card title={text.quickAdd} className="planner-form-card">
        <form className="planner-form" onSubmit={createTask}>
          <input
            className="ui-input planner-task-input"
            value={form.title}
            onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
            placeholder={text.taskPlaceholder}
          />
          <div className="planner-form-secondary">
            <select
              className="ui-input"
              value={form.company_id}
              onChange={(e) => setForm((current) => ({ ...current, company_id: e.target.value }))}
            >
              <option value="">{text.noCompany}</option>
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
              <option value="high">{text.priorityHigh}</option>
              <option value="medium">{text.priorityMedium}</option>
              <option value="low">{text.priorityLow}</option>
            </select>
          </div>
          <div className="planner-form-actions">
            <button className="btn-primary planner-submit-button" type="submit" disabled={loading}>
              <Plus size={16} /> {text.addTask}
            </button>
          </div>
        </form>
      </Card>

      <div className="planner-board">
        <Card title={text.upcomingDeadlines} action={<Badge variant="accent">{taskBuckets.upcoming.length}</Badge>}>
          <div className="planner-task-list">
            {taskBuckets.upcoming.map((task) => (
              <button key={task.id} className="planner-task-item" onClick={() => toggleTask(task.id)}>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.company_name || text.general}</p>
                </div>
                <div className="planner-task-meta">
                  <CalendarClock size={15} />
                  <div className="planner-deadline-copy">
                    <span>{task.deadline || '-'}</span>
                    <Badge variant={deadlineDiffDays(task.deadline) <= 1 ? 'danger' : 'accent'}>
                      {formatCountdown(task.deadline, text)}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
            {!taskBuckets.upcoming.length ? <p className="text-muted">{text.noUpcomingDeadlines}</p> : null}
          </div>
        </Card>

        <Card title={text.highPriority} action={<Badge variant="danger">{taskBuckets.focus.length}</Badge>}>
          <div className="planner-task-list">
            {taskBuckets.focus.map((task) => (
              <button key={task.id} className="planner-task-item" onClick={() => toggleTask(task.id)}>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.company_name || text.general}{task.deadline ? ` / ${text.lastUpdatedPrefix} ${task.deadline}` : ''}</p>
                </div>
                <CheckCircle2 size={16} />
              </button>
            ))}
            {!taskBuckets.focus.length ? <p className="text-muted">{text.noHighPriority}</p> : null}
          </div>
        </Card>

        <Card title={text.followUps} action={<Badge variant="warning">{taskBuckets.followUps.length}</Badge>}>
          <div className="planner-task-list">
            {taskBuckets.followUps.map((task) => (
              <button key={task.id} className="planner-task-item" onClick={() => toggleTask(task.id)}>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.company_name || text.review}{task.deadline ? ` / ${task.deadline}` : ''}</p>
                </div>
                <CheckCircle2 size={16} />
              </button>
            ))}
            {!taskBuckets.followUps.length ? <p className="text-muted">{text.noFollowUps}</p> : null}
          </div>
        </Card>
      </div>

      <Card title={text.plannerInsight} className="planner-signals-card">
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
  );
}

export default Planner;
