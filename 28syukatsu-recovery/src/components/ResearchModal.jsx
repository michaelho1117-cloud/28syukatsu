import React, { useState } from 'react';

export function ResearchModal({ asset, onClose, onSave }) {
  const [content, setContent] = useState(asset.content);

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ width: '80%', maxHeight: '80vh', overflowY: 'auto' }}>
        <h3>编辑资料: {asset.title}</h3>
        <textarea
          className="ui-textarea"
          rows={15}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={() => onSave(asset.id, content)}>保存</button>
        </div>
      </div>
    </div>
  );
}
