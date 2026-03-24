import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCoreData } from '../hooks/useCoreData';
import { Card, Badge } from '../components/ui/Card';
import { useTranslation } from 'react-i18next';
import { Users, Globe, Plus, ArrowRight, Coins } from 'lucide-react';
import './Companies.css';

const COPY = {
  ja: {
    title: '企業一覧',
    subtitle: 'ターゲット企業を一覧で比較し、評価や採用情報をまとめて見られます。',
    addBtn: '企業を追加',
    searchPlaceholder: '会社名やカテゴリで検索...',
    employees: '名',
    avgSalary: '平均年収',
    website: 'Webサイト',
    targeted: 'ターゲット',
    watching: 'ウォッチ中',
    detail: '会社詳細へ',
    empty: '該当する企業がありません。'
  },
  en: {
    title: 'Companies',
    subtitle: 'Compare target firms, ratings, and recruiting info in one place.',
    addBtn: 'Add Company',
    searchPlaceholder: 'Search by company or category...',
    employees: 'employees',
    avgSalary: 'Avg. salary',
    website: 'Website',
    targeted: 'Target',
    watching: 'Watching',
    detail: 'Open company detail',
    empty: 'No companies found.'
  },
  zh: {
    title: '企业一览',
    subtitle: '把目标企业、评分和招聘信息放在同一页集中查看。',
    addBtn: '添加企业',
    searchPlaceholder: '按公司名或类别搜索...',
    employees: '名',
    avgSalary: '平均年收',
    website: '官网',
    targeted: '目标企业',
    watching: '观察中',
    detail: '进入公司详情',
    empty: '没有找到匹配的企业。'
  }
};

function pickText(language, values) {
  if (language === 'zh') return values.zh;
  if (language === 'en') return values.en;
  return values.ja;
}

function formatManYen(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return `${Math.round(n)} 万円`;
}

function shouldShowEnSubtitle(company) {
  const primary = String(company?.name || '').trim().toLowerCase();
  const secondary = String(company?.canonical_name_en || '').trim().toLowerCase();
  if (!secondary) return false;
  return primary !== secondary;
}

function getCompanyDomain(company) {
  const raw = String(company?.website || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).hostname;
  } catch {
    return '';
  }
}

function getCompanyInitial(company) {
  const label = String(company?.name || company?.canonical_name_en || '?').trim();
  if (!label) return '?';
  return label[0].toUpperCase();
}

function getLogoUrls(company) {
  const key = String(company?.canonical_name_en || company?.name || '').toLowerCase();
  const pinnedLogos = [
    {
      match: ['ibm consulting', 'ibm'],
      primary: 'https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg',
      fit: 'contain'
    },
    {
      match: ['kpmg consulting'],
      primary: 'https://kpmg.com/etc.clientlibs/kpmg/clientlibs/clientlib-site/resources/images/favicons/favicon-32x32.png'
    },
    {
      match: ['mercer japan', 'mercer'],
      primary: 'https://www.mercer.com/content/dam/mercer-dotcom/global/en/mercer-brand/favicon/icon-192x192.png'
    },
    {
      match: ['ntt data institute of management consulting', 'ntt'],
      primary: 'https://www.nttdata-strategy.com/favicon.ico'
    },
    {
      match: ['celm'],
      primary: 'https://www.celm.co.jp/wordpress/wp-content/uploads/2023/11/cropped-favicon-192x192.png'
    }
  ];

  const pinned = pinnedLogos.find((item) => item.match.some((token) => key.includes(token)));
  if (pinned) {
    return {
      primary: pinned.primary,
      fallback: pinned.primary,
      fit: pinned.fit || 'cover'
    };
  }

  const domain = getCompanyDomain(company);
  if (!domain) return { primary: '', fallback: '', fit: 'cover' };

  return {
    primary: `https://logo.clearbit.com/${domain}`,
    fallback: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    fit: 'cover'
  };
}

function Companies() {
  const { i18n } = useTranslation();
  const language = i18n.language === 'zh' ? 'zh' : i18n.language === 'en' ? 'en' : 'ja';
  const text = COPY[language];
  const { companies, fetchCompanies, loading, error } = useCoreData();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const filteredCompanies = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return companies;
    return companies.filter((company) => {
      const haystack = [
        company.name,
        company.canonical_name_en,
        company.industry,
        company.category,
        company.aliases
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [companies, searchTerm]);

  return (
    <div className="page-container companies-page">
      <header className="page-header">
        <div>
          <h1>{text.title}</h1>
          <p className="subtitle">{text.subtitle}</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" type="button">
            <Plus size={18} />
            <span>{text.addBtn}</span>
          </button>
        </div>
      </header>

      <div className="filters-bar glass-panel">
        <input
          type="text"
          placeholder={text.searchPlaceholder}
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="filter-tags">
          <Badge variant="accent">Top 50</Badge>
          <Badge variant="default">Consulting</Badge>
        </div>
      </div>

      {loading && <div className="loading-pulse" style={{ marginTop: '2rem' }} />}
      {error && <div className="error-banner">{error}</div>}

      <div className="companies-grid">
        {filteredCompanies.map((company) => {
          const logos = getLogoUrls(company);
          return (
            <Card
              key={company.id}
              className={`company-card ${typeof company.openwork_score === 'number' ? 'has-rating' : 'no-rating'}`}
            >
              <div className="company-header">
                <div className="company-logo">
                  {logos.primary ? (
                    <img
                      src={logos.primary}
                      alt={`${company.name} logo`}
                      loading="lazy"
                      style={{ objectFit: logos.fit || 'cover' }}
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (logos.fallback && !img.dataset.fallback) {
                          img.dataset.fallback = '1';
                          img.src = logos.fallback;
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
                  {shouldShowEnSubtitle(company) ? (
                    <div className="company-name-en">{company.canonical_name_en}</div>
                  ) : null}
                  <span className="company-industry">
                    {company.industry || company.category || 'General'}
                  </span>
                </div>

                <div className="company-rating">
                  {typeof company.openwork_score === 'number' ? `★${company.openwork_score.toFixed(2)}` : '-'}
                </div>
              </div>

              <div className="company-details">
                {company.employees ? (
                  <div className="detail-item">
                    <Users size={14} />
                    <span>
                      {company.employees} {text.employees}
                    </span>
                  </div>
                ) : null}

                {company.openwork_avg_salary ? (
                  <div className="detail-item">
                    <Coins size={14} />
                    <span>{text.avgSalary} {formatManYen(company.openwork_avg_salary)}</span>
                  </div>
                ) : null}

                {company.website ? (
                  <div className="detail-item">
                    <Globe size={14} />
                    <a href={company.website} target="_blank" rel="noreferrer">
                      {text.website}
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="company-footer">
                <Badge variant={company.is_target ? 'success' : 'default'}>
                  {company.is_target ? text.targeted : text.watching}
                </Badge>
                {company.recruit_status ? (
                  <span className="recruit-status">{company.recruit_status}</span>
                ) : null}
              </div>

              <Link className="company-detail-link" to={`/companies/${company.id}`}>
                {text.detail}<ArrowRight size={14} />
              </Link>
            </Card>
          );
        })}

        {filteredCompanies.length === 0 && !loading && (
          <p className="text-muted">{text.empty}</p>
        )}
      </div>
    </div>
  );
}

export default Companies;
