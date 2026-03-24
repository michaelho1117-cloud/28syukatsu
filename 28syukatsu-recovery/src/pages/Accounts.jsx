import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useCoreData } from '../hooks/useCoreData';
import { Card } from '../components/ui/Card';
import { Plus, Eye, EyeOff, Edit2, Trash2, ExternalLink, Search, ChevronDown, ChevronUp, X } from 'lucide-react';
import './Accounts.css';

export default function Accounts() {
  const { fetchAccounts, addAccount, updateAccount, deleteAccount } = useCoreData();
  const [accounts, setAccounts] = useState([]);
  const [showPassword, setShowPassword] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [formData, setFormData] = useState({ company_name: '', login_url: '', login_id: '', password: '' });

  const loadAccounts = useCallback(async () => {
    const data = await fetchAccounts();
    setAccounts(data);
  }, [fetchAccounts]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const filtered = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (a.login_id || '').toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [accounts, searchQuery]
  );

  const displayed = isExpanded ? filtered : filtered.slice(0, 10);

  const handleTogglePassword = (id) => {
    setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await updateAccount(editingId, formData);
      setSaveMessage('更新しました');
    } else {
      await addAccount(formData);
      setSaveMessage('追加しました');
    }
    setEditingId(null);
    setFormData({ company_name: '', login_url: '', login_id: '', password: '' });
    setShowForm(false);
    loadAccounts();
    window.setTimeout(() => setSaveMessage(''), 1800);
  };

  const handleEdit = (account) => {
    setEditingId(account.id);
    setFormData({
      company_name: account.company_name,
      login_url: account.login_url || '',
      login_id: account.login_id || '',
      password: account.password || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('このアカウントを削除しますか？')) {
      await deleteAccount(id);
      setSaveMessage('削除しました');
      loadAccounts();
      window.setTimeout(() => setSaveMessage(''), 1800);
    }
  };

  const cancelForm = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({ company_name: '', login_url: '', login_id: '', password: '' });
  };

  return (
    <div className="page-container accounts-page">
      <header className="page-header">
        <div>
          <h1>MyPage アカウント管理</h1>
          <p className="subtitle">各社のログイン情報を一括管理します。</p>
        </div>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={() => {
              setShowForm((v) => !v);
              setEditingId(null);
              setFormData({ company_name: '', login_url: '', login_id: '', password: '' });
            }}
          >
            <Plus size={18} />
            <span>アカウント追加</span>
          </button>
        </div>
      </header>

      {saveMessage && <div className="success-banner">{saveMessage}</div>}

      {showForm && (
        <Card className="account-form-card" title={editingId ? 'アカウント編集' : '新規アカウント'}>
          <form className="acc-form" onSubmit={handleSubmit}>
            <div className="acc-form-fields">
              <div className="acc-field">
                <label>会社名 *</label>
                <input
                  name="company_name"
                  placeholder="例: PwC Japanグループ"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="acc-field">
                <label>ログインURL</label>
                <input name="login_url" placeholder="https://..." value={formData.login_url} onChange={handleChange} />
              </div>
              <div className="acc-field">
                <label>ID / メール</label>
                <input name="login_id" placeholder="ログインID" value={formData.login_id} onChange={handleChange} />
              </div>
              <div className="acc-field">
                <label>パスワード</label>
                <input name="password" type="text" placeholder="パスワード" value={formData.password} onChange={handleChange} />
              </div>
            </div>
            <div className="acc-form-actions">
              <button type="submit" className="btn-primary">{editingId ? '更新する' : '追加する'}</button>
              <button type="button" className="btn-secondary" onClick={cancelForm}>キャンセル</button>
            </div>
          </form>
        </Card>
      )}

      <div className="accounts-list-section">
        <div className="acc-search-wrap">
          <Search size={16} className="acc-search-icon" />
          <input
            className="acc-search-input"
            placeholder="会社名 / ID で検索..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsExpanded(false);
            }}
          />
          {searchQuery && (
            <button className="acc-search-clear" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="acc-list-header">
          <span className="col-company">会社名</span>
          <span className="col-url">ログインURL</span>
          <span className="col-id">ID</span>
          <span className="col-pw">パスワード</span>
          <span className="col-actions">操作</span>
        </div>

        <div className="acc-list-body">
          {displayed.length === 0 ? (
            <div className="acc-empty">アカウントが見つかりません。</div>
          ) : displayed.map((account) => (
            <div key={account.id} className="acc-row">
              <span className="col-company acc-company">{account.company_name}</span>
              <span className="col-url">
                {account.login_url ? (
                  <a href={account.login_url} target="_blank" rel="noreferrer" className="acc-url" title={account.login_url}>
                    {account.login_url} <ExternalLink size={11} />
                  </a>
                ) : (
                  <span className="acc-muted">-</span>
                )}
              </span>
              <span className="col-id acc-muted">{account.login_id || '-'}</span>
              <span className="col-pw acc-pw">
                <span className="acc-pw-text">{showPassword[account.id] ? account.password || '-' : '•••••••••'}</span>
                <button className="acc-eye" onClick={() => handleTogglePassword(account.id)}>
                  {showPassword[account.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </span>
              <span className="col-actions acc-actions">
                <button className="acc-btn-edit" onClick={() => handleEdit(account)}><Edit2 size={13} /> 編集</button>
                <button className="acc-btn-del" onClick={() => handleDelete(account.id)}><Trash2 size={13} /></button>
              </span>
            </div>
          ))}
        </div>

        {filtered.length > 10 && (
          <div className="acc-toggle-row">
            <button className="acc-toggle-btn" onClick={() => setIsExpanded((v) => !v)}>
              {isExpanded ? (
                <><ChevronUp size={15} /> 折りたたむ（全{filtered.length}件）</>
              ) : (
                <><ChevronDown size={15} /> 残り{filtered.length - 10}件を表示（全{filtered.length}件）</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
