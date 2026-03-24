import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, Badge } from '../components/ui/Card';
import {
  Building2,
  Users,
  Globe,
  ArrowLeft,
  CalendarClock,
  GraduationCap,
  Sparkles,
  CircleCheck,
  AlertTriangle,
  Plus,
  BookOpen,
  MessageSquareText
} from 'lucide-react';
import { loadPersonalContext } from '../utils/personalContext';
import './CompanyDetail.css';

const CORE_API = 'http://127.0.0.1:8789/api/core';
const companyMemoKey = (id) => `shukatsu_company_memo_${id}`;

const scoreFromCompany = (company) => {
  let score = 40;
  if (company?.is_target) score += 18;
  if ((company?.employees || 0) >= 1000) score += 12;
  else if ((company?.employees || 0) >= 100) score += 8;
  if (typeof company?.openwork_score === 'number') score += Math.round(company.openwork_score * 6);
  const status = String(company?.recruit_status || '').toLowerCase();
  if (status.includes('open') || status.includes('受付') || status.includes('募集中')) score += 15;
  if (status.includes('closed') || status.includes('終了')) score -= 20;
  return Math.max(0, Math.min(100, score));
};

const stageProgress = (status) => {
  const steps = ['Interested', 'Applied', 'Web Test', '1st Interview', '2nd Interview', 'Final', 'Offer'];
  const idx = steps.indexOf(status);
  if (status === 'Rejected') return 0;
  if (idx < 0) return 8;
  return Math.round(((idx + 1) / steps.length) * 100);
};

function scoreStoryFit(story, company) {
  let score = 0;
  const companyText = [
    company?.name,
    company?.industry,
    company?.category,
    company?.main_services,
    company?.notes
  ].join(' ').toLowerCase();
  const storyText = [
    story?.title,
    story?.tag,
    story?.situation,
    story?.strengthSignal,
    story?.reusableFor
  ].join(' ').toLowerCase();

  if (story?.tag?.includes('problem')) score += 10;
  if (story?.tag?.includes('team')) score += 8;
  if (story?.tag?.includes('lead')) score += 8;
  if (story?.tag?.includes('gakuchika')) score += 6;

  if (/strategy|戦略/.test(companyText) && /logic|problem|analysis|改善|戦略|構造/.test(storyText)) score += 18;
  if (/it|dx|technology|テクノロジー/.test(companyText) && /project|multitask|execution|system|dx|実行/.test(storyText)) score += 18;
  if (/fas|m&a|financial|fa/.test(companyText) && /analysis|ownership|finance|numeric|定量/.test(storyText)) score += 18;
  if (/people|hr|organization|人事|組織/.test(companyText) && /team|communication|coordination|組織|協働/.test(storyText)) score += 18;
  if (/consult/.test(companyText) && /ownership|logic|improvement|team|problem/.test(storyText)) score += 10;

  if (/interview|self-pr|es/.test(story?.reusableFor || '')) score += 6;
  if ((story?.situation || '').length > 40) score += 6;
  if ((story?.strengthSignal || '').length > 16) score += 6;
  return score;
}

function derivePrepFocus(company, stories) {
  const hints = [];
  const category = String(company?.category || company?.industry || '').toLowerCase();

  if (/strategy|戦略/.test(category)) {
    hints.push('结构化表达和问题拆解会更重要，先准备能体现逻辑清晰度的故事。');
  }
  if (/it|dx|technology|テクノロジー/.test(category)) {
    hints.push('优先准备跨团队推进、复杂项目执行和落地能力相关的经历。');
  }
  if (/fas|m&a|financial|fa/.test(category)) {
    hints.push('建议强调定量判断、依据说明和高压下的稳定推进。');
  }
  if (/people|hr|organization|人事|組織/.test(category)) {
    hints.push('更适合准备沟通协调、组织改善和影响他人的故事。');
  }
  if (company?.webtest_type) {
    hints.push(`这家公司有 ${company.webtest_type}，本周至少安排一次针对性练习。`);
  }
  if (company?.case_style) {
    hints.push(`如果进入案例环节，先补 ${company.case_style} 方向的基本结构。`);
  }
  if (stories[0]?.title) {
    hints.push(`现在最该优先打磨的故事是「${stories[0].title}」。`);
  }
  return hints.slice(0, 4);
}

function buildFitNarrative(company, story, motivationLayer = {}) {
  if (!company || !story) return '';
  const parts = [
    `${company.name} 对你更有说服力的一点，是它和你已经形成的经历线索能接上。`,
    story.title ? `当前最值得优先调用的故事是「${story.title}」。` : '',
    story.strengthSignal ? `这条故事能证明的核心能力是：${story.strengthSignal}。` : '',
    motivationLayer.whyConsulting ? `它也能自然连接你“为什么想做咨询”的主线：${motivationLayer.whyConsulting}` : '',
    `如果现在要准备这家公司，最好的切口不是泛泛说“我想进咨询”，而是把这段故事讲成“为什么你已经在往这类问题和环境靠近”。`
  ];
  return parts.filter(Boolean).join('');
}

import { ResearchModal } from '../components/ResearchModal';

function CompanyDetail() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [applications, setApplications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [assets, setAssets] = useState([]);
  const [ruleHistory, setRuleHistory] = useState([]);
  const [ruleOutput, setRuleOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [editingAsset, setEditingAsset] = useState(null);
  const [memo, setMemo] = useState({
    fit: '',
    blockers: '',
    nextAction: ''
  });
  const [assetForm, setAssetForm] = useState({
    source_type: 'manual',
    source_url: '',
    title: '',
    content: '',
    tags: '',
    reliability: 3
  });
  const personalContext = useMemo(() => loadPersonalContext(), []);

  const saveAssetContent = async (assetId, newContent) => {
    try {
      const res = await fetch(`${CORE_API}/companies/${id}/research-assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
      });
      if (!res.ok) throw new Error('update failed');
      setSaveMsg('更新成功');
      setEditingAsset(null);
      loadAll();
    } catch (e) {
      console.error(e);
      setSaveMsg('更新失败');
    }
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const [companyRes, appRes, taskRes, assetRes] = await Promise.all([
        fetch(`${CORE_API}/companies/${id}`),
        fetch(`${CORE_API}/applications`),
        fetch(`${CORE_API}/tasks`),
        fetch(`${CORE_API}/companies/${id}/research-assets`)
      ]);
      const historyRes = await fetch(`${CORE_API}/companies/${id}/rule-output-history`);
      if (!companyRes.ok || !appRes.ok || !taskRes.ok || !assetRes.ok || !historyRes.ok) throw new Error('load failed');

      const companyData = await companyRes.json();
      const appData = await appRes.json();
      const taskData = await taskRes.json();
      const assetData = await assetRes.json();
      const historyData = await historyRes.json();

      setCompany(companyData);
      setApplications((appData.items || []).filter((item) => String(item.company_id) === String(id)));
      setTasks((taskData || []).filter((item) => Number(item.company_id) === Number(id)));
      setAssets(assetData || []);
      setRuleHistory(historyData || []);
      setError('');
    } catch {
      setError('无法加载公司详情，请确认 Core API 正常运行。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(companyMemoKey(id));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setMemo((current) => ({ ...current, ...parsed }));
    } catch {
      // ignore
    }
  }, [id]);

  const timeline = useMemo(() => {
    return applications
      .filter((item) => item.deadline)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 8);
  }, [applications]);

  const todayActions = useMemo(() => {
    const openTasks = tasks.filter((item) => item.status !== 'done').slice(0, 3);
    if (openTasks.length) return openTasks.map((item) => item.title);

    if (applications.length > 0) {
      const app = applications[0];
      return [
        `${app.position || 'General'} 的下一步行动: ${app.next_step || '确认最新截止日'}`,
        '准备 30 分钟公司案例与业务理解',
        '更新这家公司的志望动机版本'
      ];
    }

    return [
      '确认最新招聘信息与截止日期',
      '准备志望动机与目标岗位对齐版本',
      '设定本周这家公司的推进目标'
    ];
  }, [tasks, applications]);

  const riskList = useMemo(() => {
    const items = [];
    const urgent = timeline.filter((item) => {
      const diff = Math.ceil((new Date(item.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      return diff <= 3;
    });
    if (urgent.length > 0) items.push(`3 天内有 ${urgent.length} 个关键节点，今天先处理最早的那一个。`);
    const interviewCount = applications.filter((item) => String(item.status || '').includes('Interview')).length;
    if (interviewCount > 0) items.push(`当前处于面试阶段 ${interviewCount} 项，今晚建议做一轮口头模拟。`);
    if (applications.length === 0) items.push('暂时还没有申请记录，建议先完成一轮 Entry。');
    return items.slice(0, 3);
  }, [timeline, applications]);

  const matchedStories = useMemo(() => {
    const stories = Array.isArray(personalContext.storyBank) ? personalContext.storyBank : [];
    return stories
      .filter((story) => story.title || story.situation || story.strengthSignal)
      .map((story) => ({ ...story, fitScore: scoreStoryFit(story, company) }))
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 3);
  }, [company, personalContext]);

  const prepFocus = useMemo(() => derivePrepFocus(company, matchedStories), [company, matchedStories]);
  const fitNarrative = useMemo(() => {
    return buildFitNarrative(company, matchedStories[0], personalContext.motivationLayer);
  }, [company, matchedStories, personalContext]);

  const researchHighlights = useMemo(() => {
    return assets.filter((asset) =>
      ['structured_note', 'decision_summary', 'internship_rule'].includes(asset.source_type)
    );
  }, [assets]);

  const metadataPayload = useMemo(() => {
    const raw = ruleHistory.find((item) => item.output_type === 'research_metadata_json');
    return raw?.parsed || null;
  }, [ruleHistory]);

  const saveMemo = () => {
    localStorage.setItem(companyMemoKey(id), JSON.stringify(memo));
    setSaveMsg('已保存');
    window.setTimeout(() => setSaveMsg(''), 1300);
  };

  const createQuickTask = async () => {
    try {
      const payload = {
        title: `${company.name}: ${memo.nextAction || '推进下一步选考动作'}`,
        company_id: Number(id),
        deadline: null,
        status: 'todo',
        priority: 'high'
      };
      const res = await fetch(`${CORE_API}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('create failed');
      setSaveMsg('已加入任务列表');
      window.setTimeout(() => setSaveMsg(''), 1300);
      loadAll();
    } catch {
      setSaveMsg('任务创建失败');
      window.setTimeout(() => setSaveMsg(''), 1300);
    }
  };

  const addAsset = async () => {
    if (!assetForm.title.trim() || !assetForm.content.trim()) {
      setSaveMsg('请先填写标题和内容');
      window.setTimeout(() => setSaveMsg(''), 1300);
      return;
    }
    try {
      const res = await fetch(`${CORE_API}/companies/${id}/research-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetForm)
      });
      if (!res.ok) throw new Error('insert failed');
      setAssetForm({
        source_type: 'manual',
        source_url: '',
        title: '',
        content: '',
        tags: '',
        reliability: 3
      });
      setSaveMsg('研究资料已入库');
      window.setTimeout(() => setSaveMsg(''), 1300);
      loadAll();
    } catch {
      setSaveMsg('资料入库失败');
      window.setTimeout(() => setSaveMsg(''), 1300);
    }
  };

  const generateRulePack = async () => {
    try {
      const res = await fetch(`${CORE_API}/companies/${id}/rule-pack`);
      if (!res.ok) throw new Error('rule failed');
      const data = await res.json();
      setRuleOutput(data);
      setSaveMsg('规则包已生成');
      window.setTimeout(() => setSaveMsg(''), 1300);
    } catch {
      setSaveMsg('规则包生成失败');
      window.setTimeout(() => setSaveMsg(''), 1300);
    }
  };

  if (loading) {
    return <div className="page-container"><div className="loading-pulse" /></div>;
  }

  if (error) {
    return <div className="page-container"><div className="error-banner">{error}</div></div>;
  }

  if (!company) {
    return <div className="page-container"><div className="error-banner">公司不存在。</div></div>;
  }

  const opportunity = scoreFromCompany(company);
  const bestStatus = applications[0]?.status || 'Not Started';
  const progress = Math.max(...applications.map((item) => stageProgress(item.status)), 6);

  return (
    <div className="page-container company-detail-page">
      <header className="page-header">
        <div>
          <h1>{company.name}</h1>
          {company.canonical_name_en ? <p className="subtitle">{company.canonical_name_en}</p> : null}
          <p className="subtitle">{company.industry || 'Consulting / Finance'}</p>
        </div>
        <div className="header-actions">
          <Link className="btn-secondary" to="/companies"><ArrowLeft size={16} /> 返回企业库</Link>
        </div>
      </header>

      <section className="battle-strip glass-panel">
        <div className="battle-item">
          <span className="battle-label">机会分</span>
          <strong>{opportunity}</strong>
        </div>
        <div className="battle-item">
          <span className="battle-label">当前阶段</span>
          <strong>{bestStatus}</strong>
        </div>
        <div className="battle-item battle-progress">
          <span className="battle-label">推进度</span>
          <div className="progress-bar">
            <div className="progress-inner" style={{ width: `${progress}%` }} />
          </div>
          <strong>{progress}%</strong>
        </div>
        <div className="battle-actions">
          <button className="btn-primary" onClick={createQuickTask}><Plus size={14} /> 下一步行动</button>
          <button className="btn-secondary" onClick={saveMemo}><CircleCheck size={14} /> 保存备注</button>
          {saveMsg ? <span className="save-msg">{saveMsg}</span> : null}
        </div>
      </section>

      <div className="company-detail-grid">
        <Card title="公司信息">
          <div className="detail-list">
            <div className="detail-row"><Building2 size={15} /><span>来源标签: {company.source_tags || '-'}</span></div>
            <div className="detail-row"><Users size={15} /><span>员工数: {company.employees || '-'}</span></div>
            <div className="detail-row"><GraduationCap size={15} /><span>Web Test: {company.webtest_type || '-'}</span></div>
            <div className="detail-row"><CalendarClock size={15} /><span>招聘状态: {company.recruit_status || '-'}</span></div>
            {company.website ? (
              <div className="detail-row"><Globe size={15} /><a href={company.website} target="_blank" rel="noreferrer">官网链接</a></div>
            ) : null}
          </div>
          <div className="company-tags">
            <Badge variant={company.is_target ? 'success' : 'default'}>
              {company.is_target ? '目标公司' : '观察中'}
            </Badge>
          </div>

          <div className="memo-box">
            <label>契合度判断</label>
            <textarea
              className="ui-textarea"
              rows={2}
              placeholder="例如：业务匹配高，文化偏结构化"
              value={memo.fit}
              onChange={(e) => setMemo((current) => ({ ...current, fit: e.target.value }))}
            />
            <label>阻塞点</label>
            <textarea
              className="ui-textarea"
              rows={2}
              placeholder="例如：案例面试不稳，ES 尚未定稿"
              value={memo.blockers}
              onChange={(e) => setMemo((current) => ({ ...current, blockers: e.target.value }))}
            />
          </div>
        </Card>

        <Card title="选考推进">
          {applications.length ? (
            <div className="application-chip-list">
              {applications.map((application) => (
                <div key={application.id} className="application-chip">
                  <div>
                    <strong>{application.position || 'General'}</strong>
                    <p>{application.next_step || 'Next step not set'}</p>
                  </div>
                  <span>{application.status}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-muted">暂无申请记录</p>}

          <div className="timeline-wrap">
            <h4>关键时间线</h4>
            {timeline.length ? (
              <div className="timeline-list">
                {timeline.map((item) => (
                  <div key={item.id} className="timeline-row">
                    <span className="timeline-date">{item.deadline}</span>
                    <span className="timeline-text">{item.position || 'General'} / {item.status}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted">暂无已设置截止日期的节点</p>}
          </div>
        </Card>

        <Card title="今日执行">
          <div className="todo-list">
            {todayActions.map((item, index) => (
              <div key={index} className="todo-item">
                <CircleCheck size={14} />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="memo-box">
            <label>下一步动作（快捷任务标题）</label>
            <input
              className="ui-input"
              placeholder="例如：完成 EY 志望动机最终稿"
              value={memo.nextAction}
              onChange={(e) => setMemo((current) => ({ ...current, nextAction: e.target.value }))}
            />
          </div>

          <div className="risk-box">
            <h4><AlertTriangle size={14} /> 风险提示</h4>
            {riskList.map((item, index) => (
              <p key={index}>{item}</p>
            ))}
          </div>
        </Card>

        <Card title="Personal Context Match">
          <div className="fit-panel">
            <p className="fit-panel-lead">
              系统会根据你在 Profile 里沉淀的 Story Bank，找出这家公司当前最值得优先调用的故事。
            </p>

            <div className="fit-story-list">
              {matchedStories.length ? matchedStories.map((story) => (
                <div key={story.id} className="fit-story-card">
                  <div className="fit-story-head">
                    <strong>{story.title || 'Untitled story'}</strong>
                    <Badge variant="accent">{story.fitScore}</Badge>
                  </div>
                  <p className="text-muted">{story.tag || 'story'}</p>
                  {story.strengthSignal ? <p>{story.strengthSignal}</p> : null}
                  {story.reusableFor ? <p className="text-muted">Reusable for: {story.reusableFor}</p> : null}
                </div>
              )) : (
                <p className="text-muted">Profile 里还没有可匹配的 Story Bank。先补 2-3 条可复用故事，这里就会开始变得有用。</p>
              )}
            </div>

            <div className="fit-prep-box">
              <h4><Sparkles size={14} /> Interview / ES Prep Focus</h4>
              <ul>
                {prepFocus.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </div>

            {fitNarrative ? (
              <div className="fit-prep-box">
                <h4><Sparkles size={14} /> Why You Fit / Suggested Angle</h4>
                <p>{fitNarrative}</p>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      {researchHighlights.length ? (
        <div className="company-detail-grid" style={{ marginTop: '1rem' }}>
          <Card title="Group Comparison Research" className="research-note-card">
            <div className="research-note-list">
              {researchHighlights.map((asset) => (
                <article key={asset.id} className="research-note-item">
                  <div className="research-note-head">
                    <strong>{asset.title}</strong>
                    <Badge variant="accent">{asset.source_type}</Badge>
                  </div>
                  <p>{asset.content}</p>
                </article>
              ))}
            </div>
          </Card>

          {metadataPayload ? (
            <Card title="Structured Research Metadata" className="research-note-card">
              <textarea
                className="ui-textarea"
                rows={18}
                readOnly
                value={JSON.stringify(metadataPayload, null, 2)}
              />
            </Card>
          ) : null}
        </div>
      ) : null}

      <div className="company-detail-grid research-grid" style={{ marginTop: '1rem' }}>
        <Card title="研究资料入库（规则版）">
          <div className="asset-form">
            <select className="ui-input" value={assetForm.source_type} onChange={(e) => setAssetForm((current) => ({ ...current, source_type: e.target.value }))}>
              <option value="manual">manual</option>
              <option value="chatgpt_deep_research">chatgpt_deep_research</option>
              <option value="web_crawl">web_crawl</option>
            </select>
            <input
              className="ui-input"
              placeholder="来源 URL（可选）"
              value={assetForm.source_url}
              onChange={(e) => setAssetForm((current) => ({ ...current, source_url: e.target.value }))}
            />
            <input
              className="ui-input"
              placeholder="标题"
              value={assetForm.title}
              onChange={(e) => setAssetForm((current) => ({ ...current, title: e.target.value }))}
            />
            <textarea
              className="ui-textarea"
              rows={4}
              placeholder="粘贴研究摘要、深度研究结果或网页提炼内容..."
              value={assetForm.content}
              onChange={(e) => setAssetForm((current) => ({ ...current, content: e.target.value }))}
            />
            <div className="asset-row">
              <input
                className="ui-input"
                placeholder="标签（逗号分隔）"
                value={assetForm.tags}
                onChange={(e) => setAssetForm((current) => ({ ...current, tags: e.target.value }))}
              />
              <select className="ui-input" value={assetForm.reliability} onChange={(e) => setAssetForm((current) => ({ ...current, reliability: Number(e.target.value) }))}>
                <option value={5}>可信度 5</option>
                <option value={4}>可信度 4</option>
                <option value={3}>可信度 3</option>
                <option value={2}>可信度 2</option>
                <option value={1}>可信度 1</option>
              </select>
            </div>
            <button className="btn-primary" onClick={addAsset}><BookOpen size={14} /> 入库</button>
          </div>
          <div className="asset-list">
            {assets.slice(0, 8).map((asset) => (
              <div key={asset.id} className="asset-item" style={{ cursor: 'pointer', border: '1px solid #ccc', margin: '5px 0', padding: '10px' }} onClick={() => setEditingAsset(asset)}>
                <strong>{asset.title}</strong>
                <p>{asset.content.substring(0, 100)}...</p>
              </div>
            ))}
            {assets.length === 0 ? <p className="text-muted">暂无研究资料</p> : null}
          </div>
          {editingAsset && <ResearchModal asset={editingAsset} onClose={() => setEditingAsset(null)} onSave={saveAssetContent} />}
        </Card>

        <Card title="规则生成（ES / 面试）">
          <button className="btn-primary" onClick={generateRulePack}>
            <MessageSquareText size={14} /> 生成规则包
          </button>
          {ruleOutput ? (
            <div className="rule-output">
              <h4>ES 提纲</h4>
              <ol>
                {(ruleOutput.esOutline || []).map((item, index) => <li key={index}>{item}</li>)}
              </ol>
              <h4>面试问题包</h4>
              <ul>
                {(ruleOutput.interviewPack?.questions || []).map((item, index) => <li key={index}>{item}</li>)}
              </ul>
              {(ruleOutput.interviewPack?.sourceHighlights || []).length ? (
                <>
                  <h4>来源要点</h4>
                  <ul>
                    {(ruleOutput.interviewPack.sourceHighlights || []).map((item, index) => <li key={index}>{item}</li>)}
                  </ul>
                </>
              ) : null}
            </div>
          ) : (
            <p className="text-muted">点击“生成规则包”后显示结果。</p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default CompanyDetail;
