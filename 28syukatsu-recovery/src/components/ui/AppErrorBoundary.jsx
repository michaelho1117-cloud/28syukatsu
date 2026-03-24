import React from 'react';

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unknown error' };
  }

  componentDidCatch(error, errorInfo) {
    // Keep console logging for local debugging.
    console.error('UI crashed:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', maxWidth: 720, margin: '8vh auto' }}>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>页面异常，已自动保护</h2>
            <p style={{ opacity: 0.8, marginBottom: '1rem' }}>
              出错信息: {this.state.message}
            </p>
            <button className="btn-primary" onClick={this.handleReload}>
              重新加载页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

