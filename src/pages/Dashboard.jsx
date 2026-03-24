import React, { useEffect, useMemo } from 'react';
import { Card, Badge } from '../components/ui/Card';
import { useCoreData } from '../hooks/useCoreData';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Briefcase,
  CalendarClock,
  TrendingUp,
  AlertCircle,
  ArrowRightCircle
} from 'lucide-react';
import { getDailyMotto } from '../utils/dailyMotto';
import './Dashboard.css';

const COPY = {
  ja: {
    totalApps: '応募数',
    upcomingDeadlinesStat: '近い締切',
    tasksPending: '未完了タスク',
    todayFocus: 'Today Focus',
    noTodayFocus: '今日の重点タスクはありません。',
    upcomingDeadlines: 'Upcoming Deadlines',
    noDeadlines: '近い締切はありません。',
    nextActions: 'Next Actions',
    noNextActions: '次に進めるアクションはありません。',
    applicationAlerts: 'Application Alerts',
    noAlerts: '停滞している応募はありません。',
    aiInsight: 'AI Insight',
    noInsight: '今は追加の AI 提案はありません。',
    weatherTitle: '東京の天気予報',
    weatherLoading: '天気を取得しています...',
    weatherError: '天気予報を取得できませんでした。',
    weatherToday: '今日',
    highPriority: '高優先',
    dueToday: '今日が期限',
    dueTomorrow: '明日が期限',
    dueInDays: '{{count}}日後',
    overdue: '{{count}}日超過',
    task: 'タスク',
    application: '応募',
    eventPrep: 'イベント準備',
    general: '共通',
    resultPending: '結果待ち',
    nextStepMissing: '次アクション未設定',
    webTestPending: 'Webテスト後の動き待ち',
  },
  zh: {
    totalApps: '申请数',
    upcomingDeadlinesStat: '临近截止',
    tasksPending: '未完成任务',
    todayFocus: '今日重点',
    noTodayFocus: '今天没有重点任务。',
    upcomingDeadlines: '临近截止',
    noDeadlines: '暂无临近截止。',
    nextActions: '下一步行动',
    noNextActions: '暂无下一步行动。',
    applicationAlerts: '申请提醒',
    noAlerts: '暂无停滞申请。',
    aiInsight: 'AI 提示',
    noInsight: '当前没有额外 AI 建议。',
    weatherTitle: '东京天气预报',
    weatherLoading: '正在获取天气...',
    weatherError: '暂时无法获取天气预报。',
    weatherToday: '今天',
    highPriority: '高优先级',
    dueToday: '今天截止',
    dueTomorrow: '明天截止',
    dueInDays: '{{count}}天后',
    overdue: '已超期{{count}}天',
    task: '任务',
    application: '申请',
    eventPrep: '活动准备',
    general: '通用',
    resultPending: '等待结果',
    nextStepMissing: '未设置下一步',
    webTestPending: 'Web 测试后待推进',
  },
  en: {
    totalApps: 'Applications',
    upcomingDeadlinesStat: 'Upcoming deadlines',
    tasksPending: 'Open tasks',
    todayFocus: 'Today Focus',
    noTodayFocus: 'No priority tasks for today.',
    upcomingDeadlines: 'Upcoming Deadlines',
    noDeadlines: 'No upcoming deadlines.',
    nextActions: 'Next Actions',
    noNextActions: 'No next actions right now.',
    applicationAlerts: 'Application Alerts',
    noAlerts: 'No stalled applications.',
    aiInsight: 'AI Insight',
    noInsight: 'No additional AI suggestions right now.',
    weatherTitle: 'Tokyo Weather Forecast',
    weatherLoading: 'Loading weather...',
    weatherError: 'Unable to load weather forecast.',
    weatherToday: 'Today',
    highPriority: 'High priority',
    dueToday: 'Due today',
    dueTomorrow: 'Due tomorrow',
    dueInDays: '{{count}} days left',
    overdue: '{{count}} days overdue',
    task: 'Task',
    application: 'Application',
    eventPrep: 'Event prep',
    general: 'General',
    resultPending: 'Interview result pending',
    nextStepMissing: 'Next step missing',
    webTestPending: 'Waiting after web test',
  },
};

function pickText(language, values) {
  if (language.startsWith('zh')) return values.zh;
  if (language.startsWith('en')) return values.en;
  return values.ja;
}

function diffDays(dateText) {
  if (!dateText) return null;
  const now = new Date();
  const target = new Date(dateText);
  if (Number.isNaN(target.getTime())) return null;
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((startTarget.getTime() - startNow.getTime()) / (1000 * 60 * 60 * 24));
}

function formatCountdown(dateText, text) {
  const diff = diffDays(dateText);
  if (diff === null) return '';
  if (diff < 0) return text.overdue.replace('{{count}}', String(Math.abs(diff)));
  if (diff === 0) return text.dueToday;
  if (diff === 1) return text.dueTomorrow;
  return text.dueInDays.replace('{{count}}', String(diff));
}

function Dashboard() {
  const { i18n } = useTranslation();
  const { dashboardData, tasks, applications, fetchDashboard, fetchTasks, fetchApplications, error } = useCoreData();
  const text = pickText(i18n.language, COPY);

  const dailyMotto = getDailyMotto(
    i18n.language === 'zh' ? 'zh' : i18n.language === 'en' ? 'en' : 'ja'
  );

  useEffect(() => {
    fetchDashboard();
    fetchTasks();
    fetchApplications();
  }, [fetchDashboard, fetchTasks, fetchApplications]);

  const openTasks = useMemo(() => tasks.filter((task) => task.status !== 'done'), [tasks]);

  const todayFocus = useMemo(() => {
    const items = [];
    const seen = new Set();

    openTasks
      .filter((task) => task.priority === 'high' || diffDays(task.deadline) === 0)
      .forEach((task) => {
        if (items.length >= 3) return;
        const key = `task-${task.id}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push({
          id: key,
          title: task.title,
          subtitle: task.company_name || text.general,
          kind: text.task,
          meta: task.deadline ? formatCountdown(task.deadline, text) : text.highPriority,
        });
      });

    (dashboardData?.upcoming_deadlines || []).forEach((item) => {
      if (items.length >= 3) return;
      const diff = diffDays(item.deadline);
      if (diff === null || diff < 0 || diff > 3) return;
      const key = `deadline-${item.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        id: key,
        title: item.position || item.company_name,
        subtitle: item.company_name || text.general,
        kind: text.application,
        meta: formatCountdown(item.deadline, text),
      });
    });

    return items.slice(0, 3);
  }, [dashboardData, openTasks, text]);

  const deadlines = useMemo(() => (dashboardData?.upcoming_deadlines || []).slice(0, 5), [dashboardData]);

  const nextActions = useMemo(() => {
    const items = [];

    openTasks.slice(0, 3).forEach((task) => {
      items.push({
        id: `task-${task.id}`,
        title: task.title,
        subtitle: task.company_name || text.general,
        kind: text.task,
      });
    });

    applications
      .filter((app) => app.status !== 'Offer' && app.status !== 'Rejected')
      .filter((app) => String(app.next_step || '').trim())
      .slice(0, 3)
      .forEach((app) => {
        if (items.length >= 5) return;
        items.push({
          id: `app-${app.id}`,
          title: app.next_step,
          subtitle: app.company_name || text.general,
          kind: text.application,
        });
      });

    return items.slice(0, 5);
  }, [applications, openTasks, text]);

  const applicationAlerts = useMemo(() => {
    return applications
      .filter((app) => app.status !== 'Offer' && app.status !== 'Rejected')
      .map((app) => {
        const status = String(app.status || '');
        const nextStep = String(app.next_step || '').trim();

        let message = '';
        if (/interview|面接/i.test(status)) {
          message = text.resultPending;
        } else if (/web test|webtest|spi|tg-web|玉手箱/i.test(status)) {
          message = text.webTestPending;
        } else if (!nextStep) {
          message = text.nextStepMissing;
        }

        if (!message) return null;

        return {
          id: app.id,
          company: app.company_name || text.general,
          position: app.position,
          message,
        };
      })
      .filter(Boolean)
      .slice(0, 4);
  }, [applications, text]);

  return (
    <div className="page-container dashboard-page">
      <header className="page-header">
        <div>
          <h1>{pickText(i18n.language, {
            ja: 'おかえりなさい、Michael 👋',
            en: 'Welcome back, Michael 👋',
            zh: '欢迎回来，Michael 👋'
          })}</h1>
          <p className="subtitle" style={{ fontStyle: 'italic', opacity: 0.85 }}>
            {dailyMotto}
          </p>
        </div>
      </header>

      {error && <div className="error-banner">{error}. Ensure the core API is running.</div>}

      <div className="dashboard-stats">
        <div className="stat-card glass-panel">
          <div className="stat-icon">
            <Briefcase size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {dashboardData?.application_progress?.reduce((acc, curr) => acc + curr.count, 0) || 0}
            </span>
            <span className="stat-label">{text.totalApps}</span>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon warning">
            <CalendarClock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{dashboardData?.upcoming_deadlines?.length || 0}</span>
            <span className="stat-label">{text.upcomingDeadlinesStat}</span>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon danger">
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{dashboardData?.today_tasks_open || 0}</span>
            <span className="stat-label">{text.tasksPending}</span>
          </div>
        </div>
      </div>

      <Card title={text.todayFocus} className="dashboard-focus-card">
        {todayFocus.length ? (
          <div className="dashboard-focus-list">
            {todayFocus.map((item) => (
              <div key={item.id} className="dashboard-focus-item">
                <div className="dashboard-focus-copy">
                  <strong>{item.title}</strong>
                  <p>{item.subtitle}</p>
                </div>
                <div className="dashboard-focus-meta">
                  <Badge variant="accent">{item.kind}</Badge>
                  <Badge variant="warning">{item.meta}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">{text.noTodayFocus}</p>
        )}
      </Card>

      <div className="dashboard-action-grid">
        <Card title={text.upcomingDeadlines}>
          {deadlines.length ? (
            <div className="deadline-list">
              {deadlines.map((item) => (
                <div key={item.id} className="deadline-item">
                  <div className="deadline-meta">
                    <strong>{item.company_name || text.general}</strong>
                    <span>{item.position}</span>
                  </div>
                  <div className="deadline-side">
                    <span className="deadline-date">{item.deadline}</span>
                    <Badge variant={diffDays(item.deadline) <= 1 ? 'danger' : 'warning'}>
                      {formatCountdown(item.deadline, text)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">{text.noDeadlines}</p>
          )}
        </Card>

        <Card title={text.nextActions}>
          {nextActions.length ? (
            <div className="task-list">
              {nextActions.map((item) => (
                <div key={item.id} className="task-item is-static">
                  <ArrowRightCircle size={18} className="task-checkbox" />
                  <div className="task-content">
                    <span className="task-title">{item.title}</span>
                    <span className="task-company">{item.subtitle}</span>
                  </div>
                  <Badge variant="accent">{item.kind}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">{text.noNextActions}</p>
          )}
        </Card>
      </div>

      <Card title={text.applicationAlerts}>
        {applicationAlerts.length ? (
          <ul className="dashboard-alert-list">
            {applicationAlerts.map((item) => (
              <li key={item.id} className="dashboard-alert-item">
                <AlertCircle size={16} />
                <div>
                  <strong>{item.company}</strong>
                  <p>{item.position ? `${item.position} · ${item.message}` : item.message}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">{text.noAlerts}</p>
        )}
      </Card>

      <Card title={text.aiInsight} className="ai-suggestions-card">
        {dashboardData?.ai_suggestions?.length ? (
          <ul className="suggestion-list">
            {dashboardData.ai_suggestions.map((sug, idx) => (
              <li key={idx}>
                <TrendingUp size={16} className="text-accent" />
                <span>{sug}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">{text.noInsight}</p>
        )}
      </Card>
    </div>
  );
}

export default Dashboard;
