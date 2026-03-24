import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge } from '../components/ui/Card';
import { BookOpenText, Sparkles, ArrowRight, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './ResearchHub.css';

const CORE_API = 'http://127.0.0.1:8789/api/core';

function ResearchHub() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${CORE_API}/research-overview`);
      if (!res.ok) throw new Error('failed');
      setRows(await res.json());
      setError('');
    } catch {
      setError(t('researchHub.load_error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((x) => String(x.name || '').toLowerCase().includes(search.toLowerCase()));
  }, [rows, search]);

  const priorityTargets = useMemo(() => {
    return filtered
      .filter((x) => x.is_target === 1)
      .sort((a, b) => a.assets_count - b.assets_count)
      .slice(0, 5);
  }, [filtered]);

  return (
    <div className="page-container research-hub-page">
      <header className="page-header">
        <div>
          <h1>{t('researchHub.title')}</h1>
          <p className="subtitle">{t('researchHub.subtitle')}</p>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="research-hub-grid">
        <Card title={t('researchHub.priority_targets')}>
          <div className="target-list">
            {priorityTargets.map((x) => (
              <div className="target-item" key={x.id}>
                <div>
                  <strong>{x.name}</strong>
                  <p>{t('researchHub.assets')} {x.assets_count} / {t('researchHub.rule_packs')} {x.rule_output_count}</p>
                </div>
                <Link to={`/companies/${x.id}`} className="target-link">
                  {t('researchHub.enter')} <ArrowRight size={13} />
                </Link>
              </div>
            ))}
            {!priorityTargets.length && !loading ? <p className="text-muted">{t('researchHub.empty_targets')}</p> : null}
          </div>
        </Card>

        <Card title={t('researchHub.coach_title')}>
          <ul className="coach-list">
            <li><Sparkles size={14} /> {t('researchHub.hint_assets')}</li>
            <li><BookOpenText size={14} /> {t('researchHub.hint_rulepack')}</li>
            <li><Sparkles size={14} /> {t('researchHub.hint_recent')}</li>
          </ul>
        </Card>
      </div>

      <Card title={t('researchHub.overview_title')} className="research-table-card">
        <div className="research-search">
          <Search size={14} />
          <input
            className="ui-input"
            placeholder={t('researchHub.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="research-table">
          <div className="research-head">
            <span>{t('companies.title')}</span>
            <span>{t('researchHub.assets')}</span>
            <span>{t('researchHub.rule_packs')}</span>
            <span>{t('researchHub.status')}</span>
            <span>{t('researchHub.action')}</span>
          </div>
          {filtered.map((x) => (
            <div className="research-row" key={x.id}>
              <span className="name-col">
                {x.name} {x.is_target ? <Badge variant="success">{t('researchHub.target')}</Badge> : null}
              </span>
              <span>{x.assets_count}</span>
              <span>{x.rule_output_count}</span>
              <span>{x.recruit_status || '-'}</span>
              <Link to={`/companies/${x.id}`} className="target-link">{t('researchHub.detail')}</Link>
            </div>
          ))}
          {!filtered.length && !loading ? <p className="text-muted">{t('researchHub.empty_results')}</p> : null}
        </div>
      </Card>
    </div>
  );
}

export default ResearchHub;
