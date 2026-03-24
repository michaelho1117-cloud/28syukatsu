import React, { useEffect, useMemo, useState } from 'react';
import { Card, Badge } from '../components/ui/Card';
import { useCoreData } from '../hooks/useCoreData';
import { CalendarClock, CheckCircle, Circle, Briefcase, AlertTriangle, Save, Sparkles, CalendarPlus, RefreshCw, FolderKanban, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getDailyMotto } from '../utils/dailyMotto';
import { getEventUpdatedEventName, getUpcomingEvents } from '../utils/eventStore';
import { getLatestTrainingSignals, getTrainingSignalEventName } from '../utils/practiceInsights';
import { loadPersonalContext, summarizePersonalContext } from '../utils/personalContext';
import './Dashboard.css';

const WEEK_PLAN_KEY = 'shukatsu_week_plan_v1';
const AI_COACH_CACHE_KEY = 'shukatsu_ai_coach_snapshot_v1';

const daysUntil = (dateStr) => {
  if (!dateStr) return 999;
  const now = new Date();
  const date = new Date(dateStr);
  return Math.ceil((date - now) / (1000 * 60 * 60 * 24));
};

const mondayOf = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

function formatEventTime(startAt = '', endAt = '') {
  if (!startAt) return 'Time TBD';
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;
  const datePart = start.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
  const startPart = start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  if (!end || Number.isNaN(end.getTime())) {
    return `${datePart} ${startPart}`;
  }
  const endPart = end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} ${startPart}-${endPart}`;
}

function formatEventTimeParts(startAt = '', endAt = '') {
  if (!startAt) {
    return { date: '日時未設定', time: '' };
  }

  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;
  const date = start.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
  const startTime = start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

  if (!end || Number.isNaN(end.getTime())) {
    return { date, time: startTime };
  }

  const endTime = end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  return { date, time: `${startTime}-${endTime}` };
}

function locationLabel(type = 'unknown') {
  return {
    online: 'Online',
    offline: 'Offline',
    hybrid: 'Hybrid',
    unknown: ''
  }[type] || '';
}

function eventStatusLabel(status = 'draft') {
  return {
    draft: 'Draft',
    confirmed: 'Confirmed',
    needs_attention: 'Needs attention',
    archived: 'Archived'
  }[status] || status;
}

function eventStatusVariant(status = 'draft') {
  if (status === 'confirmed') return 'success';
  if (status === 'needs_attention') return 'warning';
  if (status === 'archived') return 'danger';
  return 'accent';
}

function eventTypeLabel(type = 'general') {
  return {
    seminar: '説明会',
    interview: '面接',
    meeting: '面談',
    deadline: '締切',
    webtest: 'Webテスト',
    general: ''
  }[type] || '';
}

function readableSourceName(event = {}) {
  if (event.company_name_raw && !/^(other|general)$/i.test(event.company_name_raw.trim())) {
    return event.company_name_raw;
  }

  const fromMatch = String(event.source_text || '').match(/^from\s*:\s*([^\s]+@[^\s]+)$/im);
  if (fromMatch?.[1]) {
    return fromMatch[1].split('@')[1] || fromMatch[1];
  }

  if (event.source_type === 'email') return 'メール由来';
  if (event.source_type === 'notice') return '通知由来';
  return 'イベント';
}

function locationSummary(event = {}) {
  const mode = locationLabel(event.location_type);
  let detail = event.location_value || '';

  if (/^https?:\/\//i.test(detail)) {
    try {
      const url = new URL(detail);
      const host = url.hostname.replace(/^www\./, '');
      if (/zoom/i.test(host)) detail = 'Zoom';
      else if (/teams/i.test(host)) detail = 'Teams';
      else if (/meet\.google/i.test(host)) detail = 'Google Meet';
      else if (/youtube/i.test(host)) detail = 'YouTube';
      else detail = host;
    } catch {
      detail = '';
    }
  }

  if (mode && detail) return `${mode} / ${detail}`;
  if (mode) return mode;
  if (detail) return detail;
  return '';
}

function Dashboard() {
  const { i18n } = useTranslation();
  const {
    dashboardData,
    tasks,
    applications,
    fetchDashboard,
    fetchTasks,
    fetchApplications,
    toggleTask,
    error
  } = useCoreData();

  const weekStart = mondayOf(new Date()).toISOString().slice(0, 10);
  const dailyMotto = useMemo(() => getDailyMotto(i18n.resolvedLanguage || i18n.language || 'ja'), [i18n.language, i18n.resolvedLanguage]);
  
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [trainingSignals, setTrainingSignals] = useState([]);
  const [aiSnapshot, setAiSnapshot] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [weekPlan, setWeekPlan] = useState(['', '', '']);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    // 强制轮询：每 30 秒自动同步 Dashboard 状态
    const pollInterval = setInterval(() => {
      fetchDashboard();
      fetchTasks();
    }, 30000);
    return () => clearInterval(pollInterval);
  }, [fetchDashboard, fetchTasks]);

  useEffect(() => {
    async function loadInitialData() {
      const events = await getUpcomingEvents(5);
      setUpcomingEvents(Array.isArray(events) ? events : []);
      const signals = await getLatestTrainingSignals(3);
      setTrainingSignals(Array.isArray(signals) ? signals : []);
    }
    loadInitialData();

    const reloadEvents = async () => {
      const events = await getUpcomingEvents(5);
      setUpcomingEvents(Array.isArray(events) ? events : []);
    };
    const reloadTraining = async () => {
      const signals = await getLatestTrainingSignals(3);
      setTrainingSignals(Array.isArray(signals) ? signals : []);
    };
    
    const eventName = getEventUpdatedEventName();
    const trainingEventName = getTrainingSignalEventName();
    window.addEventListener('focus', reloadEvents);
    window.addEventListener('focus', reloadTraining);
    window.addEventListener('storage', reloadEvents);
    window.addEventListener('storage', reloadTraining);
    window.addEventListener(eventName, reloadEvents);
    window.addEventListener(trainingEventName, reloadTraining);
    return () => {
      window.removeEventListener('focus', reloadEvents);
      window.removeEventListener('focus', reloadTraining);
      window.removeEventListener('storage', reloadEvents);
      window.removeEventListener('storage', reloadTraining);
      window.removeEventListener(eventName, reloadEvents);
      window.removeEventListener(trainingEventName, reloadTraining);
    };
  }, []);

  const fetchAiSnapshot = async () => {
    try {
      setAiLoading(true);
      const response = await fetch('http://127.0.0.1:8789/api/core/ai/coaching-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upcoming_events: upcomingEvents,
          training_readiness: trainingSignals,
          week_plan: weekPlan,
          journal_summary: '',
          personal_context: summarizePersonalContext(loadPersonalContext())
        })
      });
      if (!response.ok) throw new Error('AI coach request failed')
      const data = await response.json();
      const next = {
        ...data.snapshot,
        model: data.model,
        generated_at: new Date().toISOString()
      };
      setAiSnapshot(next);
      window.localStorage.setItem(AI_COACH_CACHE_KEY, JSON.stringify(next));
    } catch {
      // Fallback stays visible.
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!dashboardData) return;
    const raw = window.localStorage.getItem(AI_COACH_CACHE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const generated = parsed?.generated_at ? new Date(parsed.generated_at) : null;
        if (generated && Date.now() - generated.getTime() < 1000 * 60 * 60 * 6) {
          setAiSnapshot(parsed);
          return;
        }
      } catch {
        // ignore cache parse failure
      }
    }
    fetchAiSnapshot();
  }, [dashboardData]);

  const saveWeekPlan = () => {
    window.localStorage.setItem(WEEK_PLAN_KEY, JSON.stringify({ weekStart, items: weekPlan }));
    setSavedMsg('今週の計画を保存しました。');
    window.setTimeout(() => setSavedMsg(''), 1500);
  };

  const todayTop3 = useMemo(() => {
    return tasks
      .filter((x) => x.status !== 'done')
      .sort((a, b) => {
        const p = { high: 0, medium: 1, low: 2 };
        const pDiff = (p[a.priority] ?? 2) - (p[b.priority] ?? 2);
        if (pDiff !== 0) return pDiff;
        return daysUntil(a.deadline) - daysUntil(b.deadline);
      })
      .slice(0, 3);
  }, [tasks]);

  const weeklyTopCompanies = useMemo(() => {
    const grouped = new Map();
    (dashboardData?.upcoming_deadlines || []).forEach((d) => {
      const key = d.company_name || 'Unknown';
      const current = grouped.get(key) || { company: key, count: 0, nearest: 999 };
      current.count += 1;
      current.nearest = Math.min(current.nearest, daysUntil(d.deadline));
      grouped.set(key, current);
    });
    return [...grouped.values()]
      .sort((a, b) => (a.nearest - b.nearest) || (b.count - a.count))
      .slice(0, 3);
  }, [dashboardData]);

  const commandQueue = useMemo(() => {
    const queue = [];

    (dashboardData?.upcoming_deadlines || []).forEach((item) => {
      const days = daysUntil(item.deadline);
      queue.push({
        id: `deadline-${item.id}`,
        label: `[Deadline] ${item.company_name} / ${item.position || 'General'}`,
        why: `D-${days < 0 ? 0 : days}. 截止时间最直接决定这周优先级。`,
        score: days <= 1 ? 100 : days <= 3 ? 88 : 72
      });
    });

    upcomingEvents.forEach((event) => {
      const days = event.start_at ? daysUntil(event.start_at) : 7;
      queue.push({
        id: `event-${event.id}`,
        label: `[Event] ${event.company_name_raw || 'General'} / ${event.title}`,
        why: event.status === 'needs_attention'
          ? '时间或地点仍需确认，不处理会影响后续行动。'
          : `活动临近（约 D-${days < 0 ? 0 : days}），值得提前准备。`,
        score: event.status === 'needs_attention' ? 92 : days <= 2 ? 82 : 62
      });
    });

    tasks
      .filter((task) => task.status !== 'done')
      .slice(0, 8)
      .forEach((task) => {
        queue.push({
          id: `task-${task.id}`,
          label: `[Task] ${task.title}`,
          why: task.priority === 'high'
            ? '高优先级任务，系统建议今天先完成。'
            : '当前行动链上的已知待办。',
          score: task.priority === 'high' ? 85 : 58
        });
      });

    trainingSignals.forEach((signal) => {
      queue.push({
        id: `training-${signal.id}`,
        label: `[Training] ${signal.next_drill}`,
        why: signal.weakness,
        score: signal.priority === 'high' ? 80 : 60
      });
    });

    return queue
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [dashboardData, upcomingEvents, tasks, trainingSignals]);

  const riskAlerts = useMemo(() => {
    const alerts = [];
    const urgentDeadlineCount = (dashboardData?.upcoming_deadlines || []).filter((d) => daysUntil(d.deadline) <= 3).length;
    if (urgentDeadlineCount > 0) alerts.push(`3日以内の締切が ${urgentDeadlineCount} 件あります。ES と応募行動を優先しましょう。`);

    const highTodo = tasks.filter((x) => x.status !== 'done' && x.priority === 'high').length;
    if (highTodo >= 3) alerts.push(`高優先タスクが ${highTodo} 件あります。今日は最低 1 件完了させたいです。`);

    const eventReviewCount = upcomingEvents.filter((event) => event.status === 'needs_attention').length;
    if (eventReviewCount > 0) alerts.push(`確認待ちイベントが ${eventReviewCount} 件あります。時間と場所を先に固めましょう。`);

    if (alerts.length === 0) alerts.push('全体の流れは安定しています。今週は継続と精度を意識すれば十分です。');
    return alerts.slice(0, 3);
  }, [dashboardData, tasks, upcomingEvents]);

  const ruleCoach = useMemo(() => {
    const tips = [];
    const nearest = (dashboardData?.upcoming_deadlines || [])
      .slice()
      .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline))[0];
    if (nearest) {
      tips.push(`最優先は ${nearest.company_name}。今日のうちに 1 ステップ前へ進めましょう。`);
    }
    if (upcomingEvents.length > 0) {
      tips.push(`直近イベントは ${upcomingEvents[0].company_name_raw || 'General'}。参加前に目的と質問を 3 つ用意しておくと強いです。`);
    }
    const interviewStage = applications.filter((x) => x.status.includes('Interview')).length;
    if (interviewStage > 0) {
      tips.push(`面接フェーズが ${interviewStage} 件あります。15 分でも口頭練習を入れる価値があります。`);
    }
    if (tips.length === 0) {
      tips.push('まずは Capture に通知文を入れてイベントを整え、今週の行動リズムを作りましょう。');
    }
    return tips.slice(0, 3);
  }, [dashboardData, applications, upcomingEvents]);

  return (
    <div className="page-container dashboard-page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle" style={{ fontStyle: 'italic', opacity: 0.85 }}>
            {dailyMotto}
          </p>
        </div>
      </header>

      {error && <div className="error-banner">{error}. Ensure the core API is running.</div>}
      {savedMsg && <div className="success-banner">{savedMsg}</div>}

      <div className="dashboard-stats">
        <div className="stat-card glass-panel">
          <div className="stat-icon"><Briefcase size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{dashboardData?.application_progress?.reduce((acc, curr) => acc + curr.count, 0) || 0}</span>
            <span className="stat-label">Applications</span>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon warning"><CalendarClock size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{dashboardData?.upcoming_deadlines?.length || 0}</span>
            <span className="stat-label">Upcoming Deadlines</span>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon danger"><CheckCircle size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{dashboardData?.today_tasks_open || 0}</span>
            <span className="stat-label">Open Tasks</span>
          </div>
        </div>
      </div>

      <Card title="Next Actions Command Queue" className="decision-card" style={{ marginBottom: '1.2rem' }}>
        {commandQueue.length ? (
          <div className="deadline-list">
            {commandQueue.map((item) => (
              <div key={item.id} className="deadline-item">
                <div className="deadline-meta">
                  <strong>{item.label}</strong>
                  <span>{item.why}</span>
                </div>
                <Badge variant={item.score >= 90 ? 'danger' : item.score >= 75 ? 'warning' : 'accent'}>
                  {item.score}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">当前还没有足够的行动信号。先从 Capture、Practice 或 Applications 任一入口推进一次，指挥队列就会开始工作。</p>
        )}
      </Card>

      <div className="dashboard-grid">
        <Card title="Today’s MIT 3" className="decision-card">
          {todayTop3.length ? (
            <div className="task-list">
              {todayTop3.map((task) => (
                <div key={task.id} className="task-item" onClick={() => toggleTask(task.id)}>
                  <Circle size={18} className="task-checkbox" />
                  <div className="task-content">
                    <span className="task-title">{task.title}</span>
                    {task.company_name && <span className="task-company">{task.company_name}</span>}
                  </div>
                  {task.priority === 'high' && <Badge variant="danger">High</Badge>}
                </div>
              ))}
            </div>
          ) : <p className="text-muted">未完了タスクはありません。次の 3 アクションを追加しましょう。</p>}
        </Card>

        <Card
          title="Upcoming Events"
          className="decision-card"
          action={(
            <div className="dashboard-inline-actions">
              <Link to="/capture" className="dashboard-inline-link">
                <CalendarPlus size={14} /> Capture
              </Link>
              <Link to="/events" className="dashboard-inline-link">
                <FolderKanban size={14} /> Manage
              </Link>
            </div>
          )}
        >
          {upcomingEvents.length ? (
            <div className="event-list">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="event-item">
                  <div className="event-card-top">
                    <div className="event-kicker">
                      <span className="event-company">{readableSourceName(event)}</span>
                      {eventTypeLabel(event.event_type) ? (
                        <span className="event-kind">{eventTypeLabel(event.event_type)}</span>
                      ) : null}
                    </div>
                    <div className="event-time-chip">
                      <CalendarClock size={14} />
                      <div className="event-time-copy">
                        <span className="event-time-date">{formatEventTimeParts(event.start_at, event.end_at).date}</span>
                        {formatEventTimeParts(event.start_at, event.end_at).time ? (
                          <span className="event-time-range">{formatEventTimeParts(event.start_at, event.end_at).time}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="event-title">
                    {event.title || 'Untitled event'}
                  </div>

                  <div className="event-card-bottom">
                    <div className="event-meta-row">
                      <MapPin size={14} />
                      <span className="event-mode">{locationSummary(event) || '詳細未設定'}</span>
                    </div>
                    <span className={`event-status-pill event-status-${eventStatusVariant(event.status)}`}>
                      {eventStatusLabel(event.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-state">
              <p className="text-muted">まだイベントがありません。Capture で通知文を貼り付けると、ここに次の予定が並びます。</p>
            </div>
          )}
        </Card>

        <Card title="Focus Companies" className="decision-card">
          {weeklyTopCompanies.length ? (
            <div className="deadline-list">
              {weeklyTopCompanies.map((item) => (
                <div key={item.company} className="deadline-item">
                  <div className="deadline-meta">
                    <strong>{item.company}</strong>
                    <span>{item.count} active checkpoints</span>
                  </div>
                  <Badge variant={item.nearest <= 3 ? 'danger' : 'warning'}>
                    D-{item.nearest < 0 ? 0 : item.nearest}
                  </Badge>
                </div>
              ))}
            </div>
          ) : <p className="text-muted">今週の重点企業はまだ設定されていません。</p>}
        </Card>
      </div>

      <section className="dashboard-lower-grid">
        <div className="dashboard-lower-left">
          <Card title="Risk Radar" className="decision-card compact-card risk-radar-card">
            <ul className="risk-list compact-risk-list">
            {riskAlerts.map((r, idx) => (
              <li key={idx}>
                <AlertTriangle size={15} />
                <span>{r}</span>
              </li>
            ))}
            </ul>
          </Card>

        <Card title={`This Week Plan (${weekStart})`} className="decision-card compact-card week-plan-card">
          <div className="week-plan compact-week-plan">
            {weekPlan.map((item, idx) => (
              <div key={idx} className="week-plan-row compact-week-plan-row">
                <span className="week-plan-index compact-week-plan-index">#{idx + 1}</span>
                <input
                  className="week-plan-input compact-week-plan-input"
                  value={item}
                  placeholder="今週やり切る行動を書いてください..."
                  onChange={(e) => {
                    const next = [...weekPlan];
                    next[idx] = e.target.value;
                    setWeekPlan(next);
                  }}
                />
              </div>
            ))}
            <button className="btn-secondary compact-week-plan-button" onClick={saveWeekPlan}>
              <Save size={15} /> Save Week Plan
            </button>
          </div>
        </Card>
        </div>

        <div className="dashboard-lower-middle">
        <Card title="Training Readiness" className="decision-card training-readiness-card">
          {trainingSignals.length ? (
            <div className="deadline-list compact-training-list">
              {trainingSignals.map((signal) => (
                <div key={signal.id} className="deadline-item training-signal-item">
                  <div className="deadline-meta">
                    <strong>{signal.source === 'case' ? 'Case' : 'Web Test'} / {signal.title}</strong>
                    <span>{signal.weakness}</span>
                    <span>{signal.next_drill}</span>
                  </div>
                  <Badge variant={signal.priority === 'high' ? 'danger' : 'warning'}>
                    {signal.score ?? '-'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">还没有形成训练信号。记录一条 case 或 web test 后，这里会直接出现下一步建议。</p>
          )}
        </Card>
        </div>

        <div className="dashboard-lower-right">
          <Card
            title="AI Coach"
            className="decision-card ai-coach-card ai-coach-primary"
            action={(
              <button className="dashboard-inline-link dashboard-ghost-btn" onClick={fetchAiSnapshot} disabled={aiLoading}>
                <RefreshCw size={14} className={aiLoading ? 'spin' : ''} />
                {aiLoading ? 'Updating' : 'Refresh'}
              </button>
            )}
          >
            {aiSnapshot ? (
              <div className="ai-snapshot ai-snapshot-elevated">
                <div className="ai-snapshot-block ai-priority-block">
                  <div className="ai-snapshot-label">Top Priorities</div>
                  <ul className="risk-list ai-priority-list">
                    {aiSnapshot.priorities?.map((tip, idx) => (
                      <li key={idx}>
                        <Sparkles size={15} />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="ai-snapshot-meta ai-meta-block">
                  <p><strong>Focus Company:</strong> {aiSnapshot.company_focus || 'General'}</p>
                  <p><strong>Skill Focus:</strong> {aiSnapshot.skill_focus || '-'}</p>
                  <p>{aiSnapshot.coach_note}</p>
                  <p className="text-muted">Model: {aiSnapshot.model || 'Gemini'}{aiSnapshot.generated_at ? ` / ${new Date(aiSnapshot.generated_at).toLocaleString()}` : ''}</p>
                </div>
              </div>
            ) : (
              <ul className="risk-list ai-priority-list">
                {ruleCoach.map((tip, idx) => (
                  <li key={idx}>
                    <Sparkles size={15} />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
