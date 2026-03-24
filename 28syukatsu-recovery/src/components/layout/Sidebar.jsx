import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Mail,
  PenTool,
  User,
  Moon,
  Sun,
  Globe,
  Target,
  LibraryBig,
  NotebookPen,
  ListTodo,
  CalendarCheck2
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import './Sidebar.css';

const getNavItems = (t) => [
  { path: '/dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard },
  { path: '/events', label: 'Events', icon: CalendarCheck2 },
  { path: '/planner', label: t('sidebar.planner'), icon: ListTodo },
  { path: '/accounts', label: 'MyPage', icon: User },
  { path: '/companies', label: t('sidebar.companies'), icon: Building2 },
  { path: '/applications', label: t('sidebar.applications'), icon: Briefcase },
  { path: '/emails', label: t('sidebar.emails'), icon: Mail },
  { path: '/research-hub', label: t('sidebar.researchHub'), icon: LibraryBig },
  { path: '/journal', label: t('sidebar.journal'), icon: NotebookPen },
  { path: '/practice', label: t('sidebar.practice'), icon: PenTool },
  { path: '/profile', label: t('sidebar.profile'), icon: User }
];

function Sidebar() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const navItems = getNavItems(t);

  const toggleLanguage = () => {
    const nextLang = { ja: 'en', en: 'zh', zh: 'ja' };
    i18n.changeLanguage(nextLang[i18n.language] || 'ja');
  };

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header">
        <div className="logo-icon"><Target size={22} color="white" /></div>
        <h2 className="logo-text">28syukatsu</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" size={20} />
              <span className="nav-label">{item.label}</span>
              <div className="nav-indicator" />
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile" style={{ cursor: 'default' }}>
          <div className="avatar" style={{ background: 'var(--accent-primary)', color: 'white', border: 'none' }}>M</div>
          <div className="user-details">
            <span className="user-name" style={{ fontSize: '1rem' }}>{t('sidebar.greeting', { name: 'Michael' })}</span>
          </div>
        </div>
        <div className="sidebar-controls" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button className="control-btn" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="control-btn" onClick={toggleLanguage} title="Change Language">
            <Globe size={18} />
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', marginLeft: '4px' }}>
              {i18n.language === 'zh' ? 'ZH' : i18n.language === 'en' ? 'EN' : 'JP'}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
