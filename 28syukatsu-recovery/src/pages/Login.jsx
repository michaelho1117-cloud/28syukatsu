import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { isAuthenticated, login } from '../auth';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const usernameRef = useRef(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setError('请输入用户名和密码。');
      return;
    }

    setError('');
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 350));

    const ok = login(trimmedUsername, password);
    if (!ok) {
      setError('用户名或密码错误。');
      setLoading(false);
      return;
    }

    const nextPath = location.state?.from?.pathname || '/dashboard';
    navigate(nextPath, { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-bg-layer" />
      <div className="login-card">
        <div className="login-brand">Career OS</div>
        <h1 className="login-title">Consulting Career Hub</h1>
        <p className="login-subtitle">聚焦咨询求职流程，保持清晰与高效。</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-label" htmlFor="username">
            Username
          </label>
          <input
            ref={usernameRef}
            id="username"
            className="login-input"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
            disabled={loading}
          />

          <label className="login-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="login-input"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            disabled={loading}
          />

          {error ? <div className="login-error">{error}</div> : <div className="login-error-placeholder" />}

          <button
            type="submit"
            className="login-submit"
            disabled={loading || !username.trim() || !password}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
