import React, { useState } from 'react';
import { Card } from '../components/ui/Card';

export function AssetDetailView({ asset, onClose, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(asset.content);

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ width: '80%', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{asset.title}</h3>
          <div>
            <button className="btn-secondary" onClick={onClose}>关闭</button>
          </div>
        </div>
        <hr />
        {isEditing ? (
          <div>
            <textarea
              className="ui-textarea"
              rows={15}
              style={{ width: '100%', marginBottom: '10px' }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsEditing(false)}>取消</button>
              <button className="btn-primary" onClick={() => { onSave(asset.id, content); setIsEditing(false); }}>保存</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ whiteSpace: 'pre-wrap', marginBottom: '20px' }}>{content}</div>
            <button className="btn-primary" onClick={() => setIsEditing(true)}>编辑内容</button>
          </div>
        )}
      </div>
    </div>
  );
}
