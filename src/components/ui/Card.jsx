import React from 'react';
import './Card.css';

export function Card({ children, className = '', title, action }) {
  return (
    <div className={`ui-card glass-panel ${className}`}>
      {(title || action) && (
        <div className="ui-card-header">
          {title && <h3 className="ui-card-title">{title}</h3>}
          {action && <div className="ui-card-action">{action}</div>}
        </div>
      )}
      <div className="ui-card-content">
        {children}
      </div>
    </div>
  );
}

export function Badge({ children, variant = 'default' }) {
  return (
    <span className={`ui-badge badge-${variant}`}>
      {children}
    </span>
  );
}
