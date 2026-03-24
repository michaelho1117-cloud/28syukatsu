import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, Badge } from '../components/ui/Card';
import { ArrowLeft, CalendarClock, Globe, Users, BookOpenText, Sparkles, Pencil, Trash2 } from 'lucide-react';
import { getNoteTypeLabel, isAiGenerated } from '../utils/researchNotes';
import './CompanyDetail.css';

const CORE_API = '/api/core';

function toCompanyForm(company) {
  return {
    name: company?.name || '',
    canonical_name_en: company?.canonical_name_en || '',
    aliases: company?.aliases || '',
    industry: company?.industry || '',
    category: company?.category || '',
    employees: company?.employees || '',
    website: company?.website || '',
    notes: company?.notes || '',
    recruit_url: company?.recruit_url || '',
    recruit_status: company?.recruit_status || '',
    recruit_deadline: company?.recruit_deadline || '',
    source_tags: company?.source_tags || '',
    ranking_note: company?.ranking_note || '',
    openwork_url: company?.openwork_url || '',
    gaishi_url: company?.gaishi_url || '',
    is_target: Number(company?.is_target) === 0 ? 0 : 1,
  };
}

function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [applications, setApplications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [assets, setAssets] = useState([]);
  const [ruleHistory, setRuleHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [formData, setFormData] = useState(toCompanyForm(null));

  const load = useCallback(async () => {
      try {
        setLoading(true);
        const [companyRes, appRes, taskRes] = await Promise.all([
          fetch(`${CORE_API}/companies/${id}`),
          fetch(`${CORE_API}/applications`),
          fetch(`${CORE_API}/tasks`)
        ]);
        const [assetRes, ruleRes] = await Promise.all([
          fetch(`${CORE_API}/companies/${id}/research-assets`),
          fetch(`${CORE_API}/companies/${id}/rule-output-history`)
        ]);
        if (!companyRes.ok || !appRes.ok || !taskRes.ok || !assetRes.ok || !ruleRes.ok) throw new Error('load failed');
        const companyData = await companyRes.json();
        const appData = await appRes.json();
        const taskData = await taskRes.json();
        const assetData = await assetRes.json();
        const ruleData = await ruleRes.json();

        setCompany(companyData);
        setFormData(toCompanyForm(companyData));
        setApplications((appData.items || []).filter((item) => String(item.company_id) === String(id)));
        setTasks((taskData || []).filter((item) => Number(item.company_id) === Number(id)));
        setAssets(assetData || []);
        setRuleHistory(ruleData || []);
        setError('');
      } catch {
        setError('无法加载公司详情，请确认 Core API 正常运行。');
      } finally {
        setLoading(false);
      }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const timeline = useMemo(() => {
    return applications
      .filter((item) => item.deadline)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 8);
  }, [applications]);

  const highlightedAssets = useMemo(() => assets.slice(0, 5), [assets]);
  const latestRulePack = useMemo(
    () => ruleHistory.find((item) => item.output_type === 'rule_pack')?.parsed || null,
    [ruleHistory]
  );

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === 'is_target' ? Number(value) : value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${CORE_API}/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          employees: formData.employees ? Number(formData.employees) : null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to update company');
      setSaveMessage('企业信息已更新。');
      setEditing(false);
      await load();
      window.setTimeout(() => setSaveMessage(''), 1800);
    } catch (saveError) {
      setError(saveError.message || 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`确认删除「${company.name}」吗？此操作不可撤回。`)) return;
    try {
      const response = await fetch(`${CORE_API}/companies/${id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to delete company');
      navigate('/companies');
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete company');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-banner">{error}</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="page-container">
        <div className="error-banner">Company not found.</div>
      </div>
    );
  }

  return (
    <div className="page-container company-detail-page">
      <header className="page-header">
        <div>
          <h1>{company.name}</h1>
          {company.canonical_name_en ? <p className="subtitle">{company.canonical_name_en}</p> : null}
          <p className="subtitle">{company.industry || 'Consulting'}</p>
        </div>
        <div className="header-actions">
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              setEditing((value) => {
                const next = !value;
                if (!next) setFormData(toCompanyForm(company));
                return next;
              });
            }}
          >
            <Pencil size={16} /> {editing ? '取消编辑' : '编辑企业'}
          </button>
          <button className="btn-secondary danger-action" type="button" onClick={handleDelete}>
            <Trash2 size={16} /> 删除企业
          </button>
          <Link className="btn-secondary" to="/companies">
            <ArrowLeft size={16} /> 返回企业库
          </Link>
        </div>
      </header>

      {saveMessage ? <div className="success-banner">{saveMessage}</div> : null}

      {editing ? (
        <Card title="编辑企业信息" style={{ marginBottom: '1rem' }}>
          <form className="company-edit-form" onSubmit={handleSave}>
            <div className="company-edit-grid">
              <div className="company-edit-field">
                <label>主体名</label>
                <input name="name" value={formData.name} onChange={handleFormChange} required />
              </div>
              <div className="company-edit-field">
                <label>英文名</label>
                <input name="canonical_name_en" value={formData.canonical_name_en} onChange={handleFormChange} />
              </div>
              <div className="company-edit-field company-edit-full">
                <label>Aliases</label>
                <input name="aliases" value={formData.aliases} onChange={handleFormChange} />
              </div>
              <div className="company-edit-field">
                <label>Industry</label>
                <input name="industry" value={formData.industry} onChange={handleFormChange} />
              </div>
              <div className="company-edit-field">
                <label>Category</label>
                <input name="category" value={formData.category} onChange={handleFormChange} />
              </div>
              <div className="company-edit-field">
                <label>Employees</label>
                <input name="employees" type="number" min="0" value={formData.employees} onChange={handleFormChange} />
              </div>
              <div className="company-edit-field">
                <label>Website</label>
                <input name="website" value={formData.website} onChange={handleFormChange} />
              </div>
              <div className="company-edit-field">
                <label>Recruit URL</label>
                <input name="recruit_url" value={formData.recruit_url} onChange={handleFormChange} />
              </div>
              <div className="company-edit-field">
                <label>Recruit Status</label>
                <input name="recruit_status" value={formData.recruit_status} onChange={handleFormChange} />
              </div>
              <div className="company-edit-field">
                <label>Recruit Deadline</label>
                <input name="recruit_deadline" type="date" value={formData.recruit_deadline || ''} onChange={handleFormChange} />
              </div>
              <div className="company-edit-field">
                <label>OpenWork URL</label>
                <input name="openwork_url" value={formData.openwork_url} onChange={handleFormChange} />
              </div>
              <div className="company-edit-field">
                <label>Gaishi URL</label>
                <input name="gaishi_url" value={formData.gaishi_url} onChange={handleFormChange} />
              </div>
              <div className="company-edit-field">
                <label>Source Tags</label>
                <input name="source_tags" value={formData.source_tags} onChange={handleFormChange} />
              </div>
              <div className="company-edit-field">
                <label>Ranking Note</label>
                <input name="ranking_note" value={formData.ranking_note} onChange={handleFormChange} />
              </div>
              <div className="company-edit-field">
                <label>企业分组</label>
                <select name="is_target" value={formData.is_target} onChange={handleFormChange}>
                  <option value={1}>目标企业</option>
                  <option value={0}>观察中</option>
                </select>
              </div>
              <div className="company-edit-field company-edit-full">
                <label>Notes</label>
                <textarea name="notes" rows="4" value={formData.notes} onChange={handleFormChange} />
              </div>
            </div>
            <div className="company-edit-actions">
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? '保存中...' : '保存修改'}
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setEditing(false);
                  setFormData(toCompanyForm(company));
                }}
              >
                取消
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="company-detail-grid">
        <Card title="公司概览">
          <div className="detail-list">
            <div className="detail-row">
              <Users size={15} />
              <span>员工数：{company.employees || '-'}</span>
            </div>
            <div className="detail-row">
              <CalendarClock size={15} />
              <span>招聘状态：{company.recruit_status || '-'}</span>
            </div>
            {company.website ? (
              <div className="detail-row">
                <Globe size={15} />
                <a href={company.website} target="_blank" rel="noreferrer">
                  官网链接
                </a>
              </div>
            ) : null}
          </div>
          <div className="company-tags">
            <Badge variant={company.is_target ? 'success' : 'default'}>
              {company.is_target ? '目标公司' : '观察中'}
            </Badge>
          </div>
        </Card>

        <Card title="申请状态">
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
          ) : (
            <p className="text-muted">暂无申请记录</p>
          )}
        </Card>

        <Card title="关键时间线">
          {timeline.length ? (
            <div className="timeline-list">
              {timeline.map((item) => (
                <div key={item.id} className="timeline-row">
                  <span className="timeline-date">{item.deadline}</span>
                  <span className="timeline-text">
                    {item.position || 'General'} / {item.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">暂无已设置截止日期的节点</p>
          )}
        </Card>
      </div>

      <Card title="关联任务" style={{ marginTop: '1rem' }}>
        {tasks.length ? (
          <div className="todo-list">
            {tasks.slice(0, 8).map((item) => (
              <div key={item.id} className="todo-item">
                <span>{item.title}</span>
                <Badge variant={item.status === 'done' ? 'success' : 'default'}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">暂无关联任务</p>
        )}
      </Card>

      <div className="company-detail-grid research-grid" style={{ marginTop: '1rem' }}>
        <Card
          title="Research Assets"
          action={
            <button type="button" className="research-ai-placeholder-btn" disabled>
              AIで企業研究
              <span>Coming Soon</span>
            </button>
          }
        >
          {highlightedAssets.length ? (
            <div className="research-note-list">
              {highlightedAssets.map((asset) => (
                <article key={asset.id} className="research-note-item">
                  <div className="research-note-head">
                    <strong>{asset.title}</strong>
                    <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <Badge variant="accent">{getNoteTypeLabel(asset.note_type)}</Badge>
                      {isAiGenerated(asset.source_type) ? (
                        <Badge variant="warning">AI生成 / 待確認</Badge>
                      ) : null}
                    </div>
                  </div>
                  <p>{String(asset.content || '').slice(0, 220)}{String(asset.content || '').length > 220 ? '...' : ''}</p>
                  <div style={{ marginTop: '0.6rem' }}>
                    <Link className="target-link" to={`/companies/${id}/research/${asset.id}`}>
                      Open full note
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-muted">No research assets yet. Add notes from Research Hub or company workflows.</p>
          )}
        </Card>

        <Card title="Rule Pack Snapshot">
          {latestRulePack ? (
            <div className="fit-panel">
              <div className="fit-prep-box">
                <h4>
                  <BookOpenText size={14} /> ES Outline
                </h4>
                <ul>
                  {(latestRulePack.esOutline || []).slice(0, 4).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="fit-prep-box">
                <h4>
                  <Sparkles size={14} /> Interview Focus
                </h4>
                <ul>
                  {(latestRulePack.interviewPack?.questions || []).slice(0, 4).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-muted">No rule pack generated yet for this company.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default CompanyDetail;
