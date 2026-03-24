import React, { useEffect, useState } from 'react';
import { Card, Badge } from '../components/ui/Card';
import { useTranslation } from 'react-i18next';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { recordTrainingSignal } from '../utils/practiceInsights';
import './Practice.css';

const CORE_API_BASE = 'http://localhost:8789/api/core';
const AI_COACH_CACHE_KEY = 'shukatsu_ai_coach_snapshot_v1';

function buildCaseSignal(form) {
  const score = Number(form.score) || 0;
  let weakness = '需要继续稳定 case 的结构化表达';
  let nextDrill = '再做一题 case，并用 5 分钟单独练开场结构';
  let priority = 'medium';

  if (score < 70) {
    weakness = 'case 基础结构和假设推进还不稳';
    nextDrill = '优先补基础框架，连续练 2 题 market sizing / profitability';
    priority = 'high';
  } else if (score < 85) {
    weakness = 'case 的定量严谨度和结论收束还可以更强';
    nextDrill = '下一次练习时重点补 quant 与 conclusion punchline';
  } else {
    weakness = '基础 readiness 不差，但还需要提升速度与深度';
    nextDrill = '做一题限时 case，重点压缩思考时间';
  }

  return {
    id: `training-case-${Date.now()}`,
    source: 'case',
    title: form.case_question || 'Case practice',
    company: form.company || '',
    score,
    weakness,
    next_drill: nextDrill,
    suggested_task_title: `[Practice Next] ${form.company || 'General'} / ${nextDrill}`,
    priority,
    created_at: new Date().toISOString()
  };
}

function buildWebSignal(form) {
  const score = Number(form.score) || 0;
  let weakness = '还需要继续稳定 web test 的表现';
  let nextDrill = `再做一轮 ${form.test_type || 'Web Test'}，重点看错题模式`;
  let priority = 'medium';

  if (score < 70) {
    weakness = `${form.test_type || 'Web Test'} 的正确率和节奏都偏弱`;
    nextDrill = `优先补 ${form.test_type || 'Web Test'} 基础题型，并做一轮限时训练`;
    priority = 'high';
  } else if (score < 85) {
    weakness = `${form.test_type || 'Web Test'} 还需要提升准确率与时间管理`;
    nextDrill = `下次训练重点控制时间，并复盘最容易失分的题型`;
  } else {
    weakness = `${form.test_type || 'Web Test'} 基本稳定，但要避免手感下滑`;
    nextDrill = `本周安排一轮短练，维持速度和正确率`;
  }

  return {
    id: `training-web-${Date.now()}`,
    source: 'webtest',
    title: form.test_type || 'Web test practice',
    company: '',
    score,
    weakness,
    next_drill: nextDrill,
    suggested_task_title: `[Practice Next] ${form.test_type || 'Web Test'} / ${nextDrill}`,
    priority,
    created_at: new Date().toISOString()
  };
}

async function ensurePracticeTask(signal) {
  const existingRes = await fetch(`${CORE_API_BASE}/tasks`);
  if (!existingRes.ok) return;
  const existingTasks = await existingRes.json();
  const exists = existingTasks.some((task) => task.title === signal.suggested_task_title && task.status !== 'done');
  if (exists) return;

  await fetch(`${CORE_API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: signal.suggested_task_title,
      company_id: null,
      deadline: null,
      status: 'todo',
      priority: signal.priority
    })
  });
}

function Practice() {
  const { t } = useTranslation();
  const [cases, setCases] = useState([]);
  const [webTests, setWebTests] = useState([]);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [showWebForm, setShowWebForm] = useState(false);
  const [caseForm, setCaseForm] = useState({ date: '', company: '', case_question: '', user_answer: '', score: '', summary: '' });
  const [webForm, setWebForm] = useState({ date: '', test_type: '', score: '', time_spent: '' });
  const [saveMsg, setSaveMsg] = useState('');

  const loadData = () => {
    fetch(`${CORE_API_BASE}/case-practice`).then(r => r.json()).then(setCases).catch(console.error);
    fetch(`${CORE_API_BASE}/webtest-practice`).then(r => r.json()).then(setWebTests).catch(console.error);
  };

  useEffect(loadData, []);

  const handleAddCase = async (e) => {
    e.preventDefault();
    await fetch(`${CORE_API_BASE}/case-practice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...caseForm, score: Number(caseForm.score) || null })
    });
    const signal = buildCaseSignal(caseForm);
    window.localStorage.removeItem(AI_COACH_CACHE_KEY);
    recordTrainingSignal(signal);
    await ensurePracticeTask(signal);
    setCaseForm({ date: '', company: '', case_question: '', user_answer: '', score: '', summary: '' });
    setShowCaseForm(false);
    setSaveMsg('练习已记录，下一步训练建议已同步到 Planner / Dashboard。');
    window.setTimeout(() => setSaveMsg(''), 1800);
    loadData();
  };

  const handleAddWeb = async (e) => {
    e.preventDefault();
    await fetch(`${CORE_API_BASE}/webtest-practice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...webForm, score: Number(webForm.score) || null, time_spent: Number(webForm.time_spent) || null })
    });
    const signal = buildWebSignal(webForm);
    window.localStorage.removeItem(AI_COACH_CACHE_KEY);
    recordTrainingSignal(signal);
    await ensurePracticeTask(signal);
    setWebForm({ date: '', test_type: '', score: '', time_spent: '' });
    setShowWebForm(false);
    setSaveMsg('练习已记录，下一步训练建议已同步到 Planner / Dashboard。');
    window.setTimeout(() => setSaveMsg(''), 1800);
    loadData();
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="page-container practice-page">
      <header className="page-header">
        <div>
          <h1>{t('practice.title')}</h1>
          <p className="subtitle">{t('practice.subtitle')}</p>
        </div>
      </header>

      {saveMsg ? <div className="success-banner">{saveMsg}</div> : null}
      
      <div className="practice-grids">
        {/* Case Practice */}
        <Card className="practice-card">
          <div className="practice-card-header">
            <h3>{t('practice.recent_cases')}</h3>
            <button className="btn-primary btn-sm" onClick={() => setShowCaseForm(v => !v)}>
              <Plus size={15} />{showCaseForm ? '閉じる' : '記録追加'}
            </button>
          </div>
          {showCaseForm && (
            <form className="practice-mini-form" onSubmit={handleAddCase}>
              <input placeholder="日付" type="date" defaultValue={today} onChange={e => setCaseForm(p => ({...p, date: e.target.value}))} required />
              <input placeholder="会社名" onChange={e => setCaseForm(p => ({...p, company: e.target.value}))} />
              <input placeholder="ケース問題" onChange={e => setCaseForm(p => ({...p, case_question: e.target.value}))} required />
              <input placeholder="概要・メモ" onChange={e => setCaseForm(p => ({...p, summary: e.target.value}))} />
              <input placeholder="スコア (0-100)" type="number" min="0" max="100" onChange={e => setCaseForm(p => ({...p, score: e.target.value}))} />
              <button type="submit" className="btn-primary">保存</button>
            </form>
          )}
          <div className="practice-list">
            {cases.length > 0 ? cases.map(c => (
              <div key={c.id} className="practice-item glass-panel">
                <div className="practice-meta">
                  <span className="practice-date">{c.date}</span>
                  <Badge variant="accent">{c.company}</Badge>
                </div>
                <h4 className="practice-title">{c.case_question}</h4>
                {c.summary && <p className="practice-summary">{c.summary}</p>}
                <div className="practice-score">{t('practice.score')}: <strong>{c.score}</strong>/100</div>
              </div>
            )) : <p className="text-muted">{t('practice.no_cases')}</p>}
          </div>
        </Card>

        {/* Web Test */}
        <Card className="practice-card">
          <div className="practice-card-header">
            <h3>{t('practice.web_tests')}</h3>
            <button className="btn-primary btn-sm" onClick={() => setShowWebForm(v => !v)}>
              <Plus size={15} />{showWebForm ? '閉じる' : '記録追加'}
            </button>
          </div>
          {showWebForm && (
            <form className="practice-mini-form" onSubmit={handleAddWeb}>
              <input placeholder="日付" type="date" defaultValue={today} onChange={e => setWebForm(p => ({...p, date: e.target.value}))} required />
              <input placeholder="テスト種類 (SPI/TG-Web/玉手箱)" onChange={e => setWebForm(p => ({...p, test_type: e.target.value}))} required />
              <input placeholder="スコア" type="number" onChange={e => setWebForm(p => ({...p, score: e.target.value}))} />
              <input placeholder="所要時間 (分)" type="number" onChange={e => setWebForm(p => ({...p, time_spent: e.target.value}))} />
              <button type="submit" className="btn-primary">保存</button>
            </form>
          )}
          <div className="practice-list">
            {webTests.length > 0 ? webTests.map(w => (
              <div key={w.id} className="practice-item glass-panel">
                <div className="practice-meta">
                  <span className="practice-date">{w.date}</span>
                  <Badge variant="warning">{w.test_type}</Badge>
                </div>
                <div className="practice-stats">
                  <div>{t('practice.score')}: <strong>{w.score}</strong></div>
                  <div>{t('practice.time')}: <strong>{w.time_spent}m</strong></div>
                </div>
              </div>
            )) : <p className="text-muted">{t('practice.no_web_tests')}</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Practice;
