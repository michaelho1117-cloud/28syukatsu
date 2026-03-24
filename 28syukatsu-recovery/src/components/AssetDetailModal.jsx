import React, { useState } from 'react';

export function AssetDetailModal({ asset, onClose, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(asset.content);

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div className="modal-content glass-panel" style={{ width: '80%', height: '80%', display: 'flex', flexDirection: 'column', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3>{asset.title}</h3>
          <button className="btn-secondary" onClick={onClose}>关闭</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px', border: '1px solid #eee', marginBottom: '10px' }}>
          {isEditing ? (
            <textarea
              className="ui-textarea"
              style={{ width: '100%', height: '100%', minHeight: '300px' }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          ) : (
            <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
          )}
        </div>
        <div className="modal-actions" style={{ display: 'flex', gap: '10px' }}>
          {isEditing ? (
            <>
              <button className="btn-secondary" onClick={() => setIsEditing(false)}>取消</button>
              <button className="btn-primary" onClick={() => { onSave(asset.id, content); setIsEditing(false); }}>保存</button>
            </>
          ) : (
            <button className="btn-primary" onClick={() => setIsEditing(true)}>编辑</button>
          )}
        </div>
      </div>
    </div>
  );
}
