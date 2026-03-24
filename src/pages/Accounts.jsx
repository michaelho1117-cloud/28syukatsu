import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCoreData } from '../hooks/useCoreData';
import { Card } from '../components/ui/Card';
import { Plus, Eye, EyeOff, Edit2, Trash2, ExternalLink, Search, ChevronDown, ChevronUp, X } from 'lucide-react';
import './Accounts.css';

const PAGE_COPY = {
  title: { ja: 'MyPage アカウント管理', en: 'MyPage Account Manager', zh: 'MyPage 账号管理' },
  subtitle: {
    ja: '各社のログイン情報を一元管理します。',
    en: 'Manage company login credentials in one place.',
    zh: '集中管理各家公司 MyPage 登录信息。'
  },
  addAccount: { ja: 'アカウント追加', en: 'Add Account', zh: '添加账号' },
  editAccount: { ja: 'アカウント編集', en: 'Edit Account', zh: '编辑账号' },
  newAccount: { ja: '新規アカウント', en: 'New Account', zh: '新建账号' },
  companyLabel: { ja: '会社名 *', en: 'Company *', zh: '公司名 *' },
  loginUrlLabel: { ja: 'ログイン URL', en: 'Login URL', zh: '登录 URL' },
  loginIdLabel: { ja: 'ID / メール', en: 'ID / Email', zh: 'ID / 邮箱' },
  passwordLabel: { ja: 'パスワード', en: 'Password', zh: '密码' },
  companyPlaceholder: { ja: '例: PwC Japanグループ', en: 'e.g. PwC Japan Group', zh: '例如：PwC Japanグループ' },
  loginIdPlaceholder: { ja: 'ログインID', en: 'Login ID', zh: '登录 ID' },
  passwordPlaceholder: { ja: 'パスワード', en: 'Password', zh: '密码' },
  save: { ja: '更新する', en: 'Save Changes', zh: '保存修改' },
  create: { ja: '追加する', en: 'Create', zh: '添加' },
  cancel: { ja: 'キャンセル', en: 'Cancel', zh: '取消' },
  updated: { ja: '更新しました', en: 'Updated', zh: '已更新' },
  added: { ja: '追加しました', en: 'Added', zh: '已添加' },
  deleted: { ja: '削除しました', en: 'Deleted', zh: '已删除' },
  deleteConfirm: {
    ja: 'このアカウントを削除しますか？',
    en: 'Delete this account?',
    zh: '确定删除这个账号吗？'
  },
  searchPlaceholder: { ja: '会社名 / ID で検索...', en: 'Search by company or ID...', zh: '按公司名 / ID 搜索...' },
  companyColumn: { ja: '会社名', en: 'Company', zh: '公司名' },
  urlColumn: { ja: 'ログイン URL', en: 'Login URL', zh: '登录 URL' },
  idColumn: { ja: 'ID', en: 'ID', zh: 'ID' },
  passwordColumn: { ja: 'パスワード', en: 'Password', zh: '密码' },
  actionsColumn: { ja: '操作', en: 'Actions', zh: '操作' },
  empty: { ja: 'アカウントがまだありません。', en: 'No accounts yet.', zh: '还没有账号。' },
  edit: { ja: '編集', en: 'Edit', zh: '编辑' },
  showMore: { ja: '残り {count} 件を表示（全 {total} 件）', en: 'Show {count} more ({total} total)', zh: '显示剩余 {count} 项（共 {total} 项）' },
  showLess: { ja: '折りたたむ（全 {total} 件）', en: 'Show less ({total} total)', zh: '收起（共 {total} 项）' }
};

function pickText(language, value) {
  if (language === 'zh') return value.zh;
  if (language === 'en') return value.en;
  return value.ja;
}

function templateText(language, value, params = {}) {
  return Object.entries(params).reduce(
    (result, [key, item]) => result.replace(`{${key}}`, String(item)),
    pickText(language, value)
  );
}

export default function Accounts() {
  const { i18n } = useTranslation();
  const language = i18n.language;
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
        (account) =>
          account.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (account.login_id || '').toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [accounts, searchQuery]
  );

  const displayed = isExpanded ? filtered : filtered.slice(0, 10);

  const handleTogglePassword = (id) => {
    setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (editingId) {
      await updateAccount(editingId, formData);
      setSaveMessage(pickText(language, PAGE_COPY.updated));
    } else {
      await addAccount(formData);
      setSaveMessage(pickText(language, PAGE_COPY.added));
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
    if (window.confirm(pickText(language, PAGE_COPY.deleteConfirm))) {
      await deleteAccount(id);
      setSaveMessage(pickText(language, PAGE_COPY.deleted));
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
          <h1>{pickText(language, PAGE_COPY.title)}</h1>
          <p className="subtitle">{pickText(language, PAGE_COPY.subtitle)}</p>
        </div>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={() => {
              setShowForm((value) => !value);
              setEditingId(null);
              setFormData({ company_name: '', login_url: '', login_id: '', password: '' });
            }}
          >
            <Plus size={18} />
            <span>{pickText(language, PAGE_COPY.addAccount)}</span>
          </button>
        </div>
      </header>

      {saveMessage && <div className="success-banner">{saveMessage}</div>}

      {showForm && (
        <Card className="account-form-card" title={editingId ? pickText(language, PAGE_COPY.editAccount) : pickText(language, PAGE_COPY.newAccount)}>
          <form className="acc-form" onSubmit={handleSubmit}>
            <div className="acc-form-fields">
              <div className="acc-field">
                <label>{pickText(language, PAGE_COPY.companyLabel)}</label>
                <input
                  name="company_name"
                  placeholder={pickText(language, PAGE_COPY.companyPlaceholder)}
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="acc-field">
                <label>{pickText(language, PAGE_COPY.loginUrlLabel)}</label>
                <input name="login_url" placeholder="https://..." value={formData.login_url} onChange={handleChange} />
              </div>
              <div className="acc-field">
                <label>{pickText(language, PAGE_COPY.loginIdLabel)}</label>
                <input
                  name="login_id"
                  placeholder={pickText(language, PAGE_COPY.loginIdPlaceholder)}
                  value={formData.login_id}
                  onChange={handleChange}
                />
              </div>
              <div className="acc-field">
                <label>{pickText(language, PAGE_COPY.passwordLabel)}</label>
                <input
                  name="password"
                  type="text"
                  placeholder={pickText(language, PAGE_COPY.passwordPlaceholder)}
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="acc-form-actions">
              <button type="submit" className="btn-primary">
                {editingId ? pickText(language, PAGE_COPY.save) : pickText(language, PAGE_COPY.create)}
              </button>
              <button type="button" className="btn-secondary" onClick={cancelForm}>
                {pickText(language, PAGE_COPY.cancel)}
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="accounts-list-section">
        <div className="acc-search-wrap">
          <Search size={16} className="acc-search-icon" />
          <input
            className="acc-search-input"
            placeholder={pickText(language, PAGE_COPY.searchPlaceholder)}
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
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
          <span className="col-company">{pickText(language, PAGE_COPY.companyColumn)}</span>
          <span className="col-url">{pickText(language, PAGE_COPY.urlColumn)}</span>
          <span className="col-id">{pickText(language, PAGE_COPY.idColumn)}</span>
          <span className="col-pw">{pickText(language, PAGE_COPY.passwordColumn)}</span>
          <span className="col-actions">{pickText(language, PAGE_COPY.actionsColumn)}</span>
        </div>

        <div className="acc-list-body">
          {displayed.length === 0 ? (
            <div className="acc-empty">{pickText(language, PAGE_COPY.empty)}</div>
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
                <button className="acc-btn-edit" onClick={() => handleEdit(account)}><Edit2 size={13} /> {pickText(language, PAGE_COPY.edit)}</button>
                <button className="acc-btn-del" onClick={() => handleDelete(account.id)}><Trash2 size={13} /></button>
              </span>
            </div>
          ))}
        </div>

        {filtered.length > 10 && (
          <div className="acc-toggle-row">
            <button className="acc-toggle-btn" onClick={() => setIsExpanded((value) => !value)}>
              {isExpanded ? (
                <><ChevronUp size={15} /> {templateText(language, PAGE_COPY.showLess, { total: filtered.length })}</>
              ) : (
                <><ChevronDown size={15} /> {templateText(language, PAGE_COPY.showMore, { count: filtered.length - 10, total: filtered.length })}</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
