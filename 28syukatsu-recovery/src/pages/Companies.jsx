import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCoreData } from '../hooks/useCoreData';
import { Card, Badge } from '../components/ui/Card';
import { useTranslation } from 'react-i18next';
import { Users, Globe, Plus, Filter, Database, ArrowRight, Coins } from 'lucide-react';
import './Companies.css';

const CORE_API = 'http://127.0.0.1:8789/api/core';

function getUi(lang) {
  if ((lang || '').startsWith('ja')) {
    return {
      importSeed: 'シード企業を導入',
      importing: '導入中...',
      enrichOpenwork: 'OpenWork 指標を更新',
      enriching: '更新中...',
      importCsvSummary: '企業一覧で canonical CSV を導入',
      importCsvHelp: 'canonical_name_ja, canonical_name_en などを含む CSV を貼り付けて導入します。',
      importCsvBtn: 'canonical CSV を導入',
      importCsvBusy: 'CSV 導入中...',
      filter: 'フィルター',
      targetOnly: 'ターゲット企業のみ',
      allEmployees: '従業員数制限なし',
      allSources: '全ソース',
      sortByScore: '機会スコア順',
      apply: '適用',
      totalCompanies: '企業数',
      targetCompanies: 'ターゲット企業',
      avgOpenwork: 'OpenWork 平均',
      avgSalary: '平均年収',
      opportunity: '機会分',
      detail: '会社詳細へ',
      seedImported: (a, b) => `シード導入完了: 追加 ${a} 社 / スキップ ${b} 社`,
      seedImportFailed: 'シード導入に失敗しました',
      csvEmpty: '先に CSV を貼り付けてください',
      csvImported: (n) => `CSV 導入完了: ${n} 社`,
      csvImportFailed: 'CSV 導入に失敗しました',
      enrichDone: (a, b) => `OpenWork 更新完了: ${a}/${b}`,
      enrichFailed: 'OpenWork 更新に失敗しました'
    };
  }
  if ((lang || '').startsWith('en')) {
    return {
      importSeed: 'Import Seed Companies',
      importing: 'Importing...',
      enrichOpenwork: 'Update OpenWork Metrics',
      enriching: 'Updating...',
      importCsvSummary: 'Import canonical CSV in Companies',
      importCsvHelp: 'Paste CSV with canonical_name_ja, canonical_name_en, etc.',
      importCsvBtn: 'Import canonical CSV',
      importCsvBusy: 'Importing CSV...',
      filter: 'Filter',
      targetOnly: 'Target only',
      allEmployees: 'All employee sizes',
      allSources: 'All sources',
      sortByScore: 'Sort by opportunity',
      apply: 'Apply',
      totalCompanies: 'Companies',
      targetCompanies: 'Targets',
      avgOpenwork: 'OpenWork Avg',
      avgSalary: 'Avg Salary',
      opportunity: 'Opportunity',
      detail: 'View Detail',
      seedImported: (a, b) => `Seed import done: +${a}, skipped ${b}`,
      seedImportFailed: 'Seed import failed',
      csvEmpty: 'Please paste CSV first',
      csvImported: (n) => `CSV imported: ${n}`,
      csvImportFailed: 'CSV import failed',
      enrichDone: (a, b) => `OpenWork updated: ${a}/${b}`,
      enrichFailed: 'OpenWork update failed'
    };
  }
  return {
    importSeed: '导入种子企业',
    importing: '导入中...',
    enrichOpenwork: '更新 OpenWork 指标',
    enriching: '更新中...',
    importCsvSummary: '在企业一览导入 canonical CSV',
    importCsvHelp: '粘贴包含 canonical_name_ja、canonical_name_en 等字段的 CSV。',
    importCsvBtn: '导入 canonical CSV',
    importCsvBusy: 'CSV 导入中...',
    filter: '过滤',
    targetOnly: '仅目标公司',
    allEmployees: '员工数不限',
    allSources: '全部来源',
    sortByScore: '按机会分排序',
    apply: '应用',
    totalCompanies: '当前企业数',
    targetCompanies: '目标企业',
    avgOpenwork: 'OpenWork 均分',
    avgSalary: '平均年收',
    opportunity: '机会分',
    detail: '进入公司详情',
    seedImported: (a, b) => `种子导入完成：新增 ${a} 家，跳过 ${b} 家`,
    seedImportFailed: '种子导入失败',
    csvEmpty: '请先粘贴 CSV',
    csvImported: (n) => `CSV 导入完成：${n} 家`,
    csvImportFailed: 'CSV 导入失败',
    enrichDone: (a, b) => `OpenWork 更新完成：${a}/${b}`,
    enrichFailed: 'OpenWork 更新失败'
  };
}

function Companies() {
  const { t, i18n } = useTranslation();
  const ui = getUi(i18n.language);
  const { companies, loading, error, fetchCompanies } = useCoreData();
  const [searchTerm, setSearchTerm] = useState('');
  const [minEmployees, setMinEmployees] = useState(100);
  const [targetOnly, setTargetOnly] = useState(true);
  const [sourceTag, setSourceTag] = useState('all');
  const [sortByOpportunity, setSortByOpportunity] = useState(true);
  const [busySeed, setBusySeed] = useState(false);
  const [busyEnrich, setBusyEnrich] = useState(false);
  const [msg, setMsg] = useState('');

  const calcOpportunityScore = (company) => {
    let score = 40;
    if (company.is_target) score += 18;
    if ((company.employees || 0) >= 1000) score += 12;
    else if ((company.employees || 0) >= 100) score += 8;
    if (typeof company.openwork_score === 'number') score += Math.round(company.openwork_score * 6);
    const status = (company.recruit_status || '').toLowerCase();
    if (status.includes('open') || status.includes('募集') || status.includes('受付中')) score += 15;
    if (status.includes('closed') || status.includes('終了')) score -= 20;
    return Math.max(0, Math.min(100, score));
  };

  const showMessage = (text, timeout = 2400) => {
    setMsg(text);
    window.setTimeout(() => setMsg(''), timeout);
  };

  const formatManYen = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    return `${Math.round(n)}万円`;
  };

  const shouldShowEnSubtitle = (company) => {
    const primary = String(company?.name || '').trim().toLowerCase();
    const secondary = String(company?.canonical_name_en || '').trim().toLowerCase();
    if (!secondary) return false;
    return primary !== secondary;
  };

  const getCompanyDomain = (company) => {
    const raw = String(company?.website || '').trim();
    if (!raw) return '';
    try {
      return new URL(raw).hostname;
    } catch {
      return '';
    }
  };

  const getLogoUrls = (company) => {
    const key = String(company?.canonical_name_en || company?.name || '').toLowerCase();
    const pinnedLogos = [
      {
        match: ['celm'],
        primary: 'https://www.celm.co.jp/wordpress/wp-content/uploads/2023/11/cropped-favicon-192x192.png'
      },
      {
        match: ['mercer japan', 'mercer'],
        primary: 'https://www.mercer.com/content/dam/mercer-dotcom/global/en/mercer-brand/favicon/icon-192x192.png'
      },
      {
        match: ['ibm consulting', 'ibm'],
        primary: 'https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg',
        fit: 'contain'
      },
      {
        match: ['ntt data institute of management consulting', 'ntt'],
        primary: 'https://www.nttdata-strategy.com/favicon.ico'
      },
      {
        match: ['kpmg consulting'],
        primary: 'https://kpmg.com/etc.clientlibs/kpmg/clientlibs/clientlib-site/resources/images/favicons/favicon-32x32.png'
      }
    ];
    const pinned = pinnedLogos.find((x) => x.match.some((m) => key.includes(m)));
    if (pinned) {
      return {
        primary: pinned.primary,
        fallback: pinned.primary,
        fit: pinned.fit || 'cover'
      };
    }

    const domain = getCompanyDomain(company);
    if (!domain) return { primary: '', fallback: '' };
    return {
      primary: `https://logo.clearbit.com/${domain}`,
      fallback: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      fit: 'cover'
    };
  };

  const getCompanyInitial = (company) => {
    const label = String(company?.name || company?.canonical_name_en || '?').trim();
    if (!label) return '?';
    return label[0].toUpperCase();
  };

  const loadCompanies = async () => {
    await fetchCompanies({
      q: searchTerm,
      min_employees: minEmployees,
      target_only: targetOnly ? 1 : 0
    });
  };

  useEffect(() => {
    loadCompanies();
  }, [minEmployees, targetOnly]);

  const handleSearch = async (e) => {
    e.preventDefault();
    await loadCompanies();
  };

  const handleImportUniverse = async () => {
    try {
      setBusySeed(true);
      const res = await fetch(`${CORE_API}/companies/import-universe`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.ok) {
        showMessage(ui.seedImported(data.inserted, data.skipped));
        await loadCompanies();
      } else {
        throw new Error('seed import failed');
      }
    } catch {
      showMessage(ui.seedImportFailed);
    } finally {
      setBusySeed(false);
    }
  };

  const handleEnrichOpenwork = async () => {
    try {
      setBusyEnrich(true);
      const res = await fetch(`${CORE_API}/companies/enrich-openwork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 150 })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error('enrich failed');
      showMessage(ui.enrichDone(data.success, data.total));
      await loadCompanies();
    } catch {
      showMessage(ui.enrichFailed);
    } finally {
      setBusyEnrich(false);
    }
  };

  const visibleCompanies = useMemo(() => {
    if (sourceTag === 'all') return companies;
    return companies.filter((c) => (c.source_tags || '').toLowerCase().includes(sourceTag));
  }, [companies, sourceTag]);

  const rankedCompanies = useMemo(() => {
    const withScore = visibleCompanies.map((c) => ({ ...c, opportunityScore: calcOpportunityScore(c) }));
    if (!sortByOpportunity) return withScore;
    return withScore.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }, [visibleCompanies, sortByOpportunity]);

  const stats = useMemo(() => {
    const targetCount = visibleCompanies.filter((c) => c.is_target === 1).length;
    const avgScoreItems = visibleCompanies.filter((c) => typeof c.openwork_score === 'number');
    const avgScore = avgScoreItems.length
      ? (avgScoreItems.reduce((sum, c) => sum + c.openwork_score, 0) / avgScoreItems.length).toFixed(2)
      : '-';
    return { total: visibleCompanies.length, targetCount, avgScore };
  }, [visibleCompanies]);

  return (
    <div className="page-container companies-page">
      <header className="page-header">
        <div>
          <h1>{t('companies.title')}</h1>
          <p className="subtitle">{t('companies.subtitle')}</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleImportUniverse} disabled={busySeed}>
            <Database size={18} />
            <span>{busySeed ? ui.importing : ui.importSeed}</span>
          </button>
          <button className="btn-secondary" onClick={handleEnrichOpenwork} disabled={busyEnrich}>
            <Coins size={18} />
            <span>{busyEnrich ? ui.enriching : ui.enrichOpenwork}</span>
          </button>
          <button className="btn-primary">
            <Plus size={18} />
            <span>{t('companies.add_btn')}</span>
          </button>
        </div>
      </header>

      {msg && <div className="success-banner">{msg}</div>}

      <form className="filters-bar glass-panel" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder={t('companies.search_ph')}
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="filter-tags">
          <Badge variant="accent"><Filter size={12} /> {ui.filter}</Badge>
          <button type="button" className={`mini-filter ${targetOnly ? 'active' : ''}`} onClick={() => setTargetOnly((v) => !v)}>
            {ui.targetOnly}
          </button>
          <select className="mini-filter" value={minEmployees} onChange={(e) => setMinEmployees(Number(e.target.value))}>
            <option value={0}>{ui.allEmployees}</option>
            <option value={100}>100+</option>
            <option value={300}>300+</option>
            <option value={1000}>1000+</option>
          </select>
          <select className="mini-filter" value={sourceTag} onChange={(e) => setSourceTag(e.target.value)}>
            <option value="all">{ui.allSources}</option>
            <option value="top50">Top50</option>
            <option value="openwork">OpenWork</option>
            <option value="gaishi">Gaishi</option>
          </select>
          <button type="button" className={`mini-filter ${sortByOpportunity ? 'active' : ''}`} onClick={() => setSortByOpportunity((v) => !v)}>
            {ui.sortByScore}
          </button>
          <button className="mini-filter active" type="submit">{ui.apply}</button>
        </div>
      </form>

      <div className="dashboard-stats" style={{ marginBottom: '1rem' }}>
        <div className="stat-card glass-panel">
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">{ui.totalCompanies}</span>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-info">
            <span className="stat-value">{stats.targetCount}</span>
            <span className="stat-label">{ui.targetCompanies}</span>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-info">
            <span className="stat-value">{stats.avgScore}</span>
            <span className="stat-label">{ui.avgOpenwork}</span>
          </div>
        </div>
      </div>

      {loading && <div className="loading-pulse" style={{ marginTop: '2rem' }} />}
      {error && <div className="error-banner">{error}</div>}

      <div className="companies-grid">
        {rankedCompanies.map((company) => (
          <Card
            key={company.id}
            className={`company-card ${typeof company.openwork_score === 'number' ? 'has-rating' : 'no-rating'}`}
          >
            <div className="company-header">
              <div className="company-logo">
                {getLogoUrls(company).primary ? (
                  <img
                    src={getLogoUrls(company).primary}
                    alt={`${company.name} logo`}
                    loading="lazy"
                    style={{ objectFit: getLogoUrls(company).fit || 'cover' }}
                    onError={(e) => {
                      const img = e.currentTarget;
                      const fb = getLogoUrls(company).fallback;
                      if (fb && !img.dataset.fallback) {
                        img.dataset.fallback = '1';
                        img.src = fb;
                        return;
                      }
                      img.style.display = 'none';
                    }}
                  />
                ) : null}
                <span className="company-logo-fallback">{getCompanyInitial(company)}</span>
              </div>
              <div className="company-info">
                <h3 className="company-name">{company.name}</h3>
                {shouldShowEnSubtitle(company) ? <div className="company-name-en">{company.canonical_name_en}</div> : null}
                <span className="company-industry">{company.industry || 'General'}</span>
              </div>
              <div className="company-rating">{company.openwork_score ? `★ ${company.openwork_score}` : '-'}</div>
            </div>

            <div className="company-details">
              {company.employees ? (
                <div className="detail-item">
                  <Users size={14} />
                  <span>{company.employees} {t('companies.employees')}</span>
                </div>
              ) : null}
              {company.openwork_avg_salary ? (
                <div className="detail-item">
                  <Coins size={14} />
                  <span>{ui.avgSalary} {formatManYen(company.openwork_avg_salary)}</span>
                </div>
              ) : null}
              {company.website ? (
                <div className="detail-item">
                  <Globe size={14} />
                  <a href={company.website} target="_blank" rel="noreferrer">{t('companies.website')}</a>
                </div>
              ) : null}
            </div>

            <div className="company-footer">
              <Badge variant={company.is_target ? 'success' : 'default'}>
                {company.is_target ? t('companies.targeted') : t('companies.watching')}
              </Badge>
              <span className="recruit-status">{ui.opportunity}: {company.opportunityScore}</span>
            </div>

            <Link className="company-detail-link" to={`/companies/${company.id}`}>
              {ui.detail} <ArrowRight size={14} />
            </Link>
          </Card>
        ))}
        {rankedCompanies.length === 0 && !loading && <p className="text-muted">{t('companies.no_companies')}</p>}
      </div>
    </div>
  );
}

export default Companies;
