import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge } from '../components/ui/Card';
import { ArrowLeft, Save, Edit2, X } from 'lucide-react';

const CORE_API = 'http://127.0.0.1:8789/api/core';

export function ResearchDetailView() {
  const { companyId, assetId } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetch(`${CORE_API}/companies/${companyId}/research-assets`)
      .then(res => res.json())
      .then(data => {
        const found = data.find(a => String(a.id) === assetId);
        if (found) {
          setAsset(found);
          setContent(found.content);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [companyId, assetId]);

  const handleSave = async () => {
    try {
      const res = await fetch(`${CORE_API}/companies/${companyId}/research-assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        setAsset({ ...asset, content });
        setIsEditing(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="page-container">Loading...</div>;
  if (!asset) return <div className="page-container">资料不存在</div>;

  return (
    <div className="page-container">
      <header className="page-header" style={{ marginBottom: '20px' }}>
        <button className="btn-secondary" onClick={() => navigate(-1)}><ArrowLeft size={16} /> 返回</button>
        <h1>{asset.title}</h1>
      </header>

      <Card className="glass-panel" style={{ padding: '20px' }}>
        {isEditing ? (
          <div>
            <textarea
              className="ui-textarea"
              style={{ width: '100%', minHeight: '500px', fontSize: '16px', lineHeight: '1.6' }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
              <button className="btn-primary" onClick={handleSave}><Save size={16} /> 保存</button>
              <button className="btn-secondary" onClick={() => setIsEditing(false)}><X size={16} /> 取消</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '16px', lineHeight: '1.8', marginBottom: '20px' }}>
              {asset.content}
            </div>
            <button className="btn-primary" onClick={() => setIsEditing(true)}><Edit2 size={16} /> 编辑全文</button>
          </div>
        )}
      </Card>
    </div>
  );
}
