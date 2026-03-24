import React, { useMemo, useState } from 'react';
import { Card, Badge } from '../components/ui/Card';
import { Copy, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_PERSONAL_CONTEXT,
  loadPersonalContext,
  savePersonalContext,
  summarizePersonalContext
} from '../utils/personalContext';
import './Profile.css';

const EXPERIENCE_CATEGORIES = [
  { value: 'project', label: 'Project' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'internship', label: 'Internship' },
  { value: 'academic', label: 'Academic' },
  { value: 'organization', label: 'Organization' }
];

const STORY_TAGS = ['gakuchika', 'self-pr', 'teamwork', 'improvement', 'leadership', 'problem-solving', 'multitask'];

function Profile() {
  const { t } = useTranslation();
  const [context, setContext] = useState(loadPersonalContext);
  const [saved, setSaved] = useState(false);

  const contextSummary = useMemo(() => summarizePersonalContext(context), [context]);

  const updateSection = (section, key, value) => {
    setContext((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value
      }
    }));
  };

  const updateListItem = (section, id, key, value) => {
    setContext((current) => ({
      ...current,
      [section]: current[section].map((item) => (item.id === id ? { ...item, [key]: value } : item))
    }));
  };

  const addExperience = () => {
    setContext((current) => ({
      ...current,
      experienceBank: [
        {
          id: `exp-${Date.now()}`,
          title: '',
          category: 'project',
          background: '',
          action: '',
          result: '',
          learning: ''
        },
        ...current.experienceBank
      ]
    }));
  };

  const addStory = () => {
    setContext((current) => ({
      ...current,
      storyBank: [
        {
          id: `story-${Date.now()}`,
          title: '',
          tag: 'gakuchika',
          situation: '',
          strengthSignal: '',
          reusableFor: ''
        },
        ...current.storyBank
      ]
    }));
  };

  const removeListItem = (section, id) => {
    setContext((current) => {
      const nextList = current[section].filter((item) => item.id !== id);
      if (nextList.length > 0) {
        return { ...current, [section]: nextList };
      }
      return {
        ...current,
        [section]: DEFAULT_PERSONAL_CONTEXT[section]
      };
    });
  };

  const handleSave = () => {
    savePersonalContext(context);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const copySummary = async () => {
    await navigator.clipboard.writeText(contextSummary);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1000);
  };

  return (
    <div className="page-container profile-page">
      <header className="page-header">
        <div>
          <h1>{t('profile.title')}</h1>
          <p className="subtitle">Personal Context Layer: for ES, interviews, matching, and AI coaching.</p>
        </div>
      </header>

      {saved ? <div className="success-banner">Personal Context saved.</div> : null}

      <div className="profile-grid">
        <Card title="Basic Profile" className="profile-card">
          <div className="form-grid">
            <div className="form-group">
              <label>{t('profile.full_name')}</label>
              <input className="ui-input" value={context.basicProfile.name} onChange={(e) => updateSection('basicProfile', 'name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Nationality</label>
              <input className="ui-input" value={context.basicProfile.nationality || ''} onChange={(e) => updateSection('basicProfile', 'nationality', e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('profile.university')}</label>
              <input className="ui-input" value={context.basicProfile.university} onChange={(e) => updateSection('basicProfile', 'university', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Current Program</label>
              <input className="ui-input" value={context.basicProfile.currentProgram || ''} onChange={(e) => updateSection('basicProfile', 'currentProgram', e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('profile.major')}</label>
              <input className="ui-input" value={context.basicProfile.major} onChange={(e) => updateSection('basicProfile', 'major', e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('profile.grad_year')}</label>
              <input className="ui-input" value={context.basicProfile.graduationYear} onChange={(e) => updateSection('basicProfile', 'graduationYear', e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('profile.email_addr')}</label>
              <input className="ui-input" value={context.basicProfile.email} onChange={(e) => updateSection('basicProfile', 'email', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Languages</label>
              <input className="ui-input" value={context.basicProfile.languages} onChange={(e) => updateSection('basicProfile', 'languages', e.target.value)} placeholder="JP / EN / CN" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Certifications</label>
              <input className="ui-input" value={context.basicProfile.certifications} onChange={(e) => updateSection('basicProfile', 'certifications', e.target.value)} placeholder="簿記, TOEIC, etc." />
            </div>
          </div>
        </Card>

        <Card title="Motivation Layer" className="profile-card materials-card">
          <div className="form-group">
            <label>Why Consulting</label>
            <textarea className="ui-textarea" rows={4} value={context.motivationLayer.whyConsulting} onChange={(e) => updateSection('motivationLayer', 'whyConsulting', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Preferred Domains</label>
            <textarea className="ui-textarea" rows={3} value={context.motivationLayer.preferredDomains} onChange={(e) => updateSection('motivationLayer', 'preferredDomains', e.target.value)} placeholder="Strategy / IT / FAS / People..." />
          </div>
          <div className="form-group">
            <label>Career Values</label>
            <textarea className="ui-textarea" rows={3} value={context.motivationLayer.values} onChange={(e) => updateSection('motivationLayer', 'values', e.target.value)} placeholder="What matters most to you?" />
          </div>
          <div className="form-group">
            <label>Preferred Work Style</label>
            <textarea className="ui-textarea" rows={3} value={context.motivationLayer.workStyle} onChange={(e) => updateSection('motivationLayer', 'workStyle', e.target.value)} placeholder="Team style, pace, environment..." />
          </div>
        </Card>
      </div>

      <div className="profile-grid" style={{ marginTop: '1rem' }}>
        <Card
          title="Experience Bank"
          className="profile-card"
          action={(
            <button className="btn-secondary" onClick={addExperience}>
              <Plus size={14} /> Add
            </button>
          )}
        >
          <div className="context-list">
            {context.experienceBank.map((experience) => (
              <div key={experience.id} className="context-item">
                <div className="context-item-head">
                  <strong>{experience.title || 'New experience'}</strong>
                  <button className="icon-btn" onClick={() => removeListItem('experienceBank', experience.id)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Title</label>
                    <input className="ui-input" value={experience.title} onChange={(e) => updateListItem('experienceBank', experience.id, 'title', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select className="ui-input" value={experience.category} onChange={(e) => updateListItem('experienceBank', experience.id, 'category', e.target.value)}>
                      {EXPERIENCE_CATEGORIES.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Background</label>
                    <textarea className="ui-textarea" rows={3} value={experience.background} onChange={(e) => updateListItem('experienceBank', experience.id, 'background', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Action</label>
                    <textarea className="ui-textarea" rows={3} value={experience.action} onChange={(e) => updateListItem('experienceBank', experience.id, 'action', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Result</label>
                    <textarea className="ui-textarea" rows={3} value={experience.result} onChange={(e) => updateListItem('experienceBank', experience.id, 'result', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Learning</label>
                    <textarea className="ui-textarea" rows={3} value={experience.learning} onChange={(e) => updateListItem('experienceBank', experience.id, 'learning', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Story Bank"
          className="profile-card"
          action={(
            <button className="btn-secondary" onClick={addStory}>
              <Plus size={14} /> Add
            </button>
          )}
        >
          <div className="context-list">
            {context.storyBank.map((story) => (
              <div key={story.id} className="context-item">
                <div className="context-item-head">
                  <strong>{story.title || 'New story'}</strong>
                  <button className="icon-btn" onClick={() => removeListItem('storyBank', story.id)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Title</label>
                    <input className="ui-input" value={story.title} onChange={(e) => updateListItem('storyBank', story.id, 'title', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Tag</label>
                    <select className="ui-input" value={story.tag} onChange={(e) => updateListItem('storyBank', story.id, 'tag', e.target.value)}>
                      {STORY_TAGS.map((tag) => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Situation / Episode</label>
                    <textarea className="ui-textarea" rows={3} value={story.situation} onChange={(e) => updateListItem('storyBank', story.id, 'situation', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Strength Signal</label>
                    <textarea className="ui-textarea" rows={3} value={story.strengthSignal} onChange={(e) => updateListItem('storyBank', story.id, 'strengthSignal', e.target.value)} placeholder="logic / ownership / teamwork..." />
                  </div>
                  <div className="form-group">
                    <label>Reusable For</label>
                    <textarea className="ui-textarea" rows={3} value={story.reusableFor} onChange={(e) => updateListItem('storyBank', story.id, 'reusableFor', e.target.value)} placeholder="ES / interview / self PR / motivation..." />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="profile-grid" style={{ marginTop: '1rem' }}>
        <Card title="Writing & Speaking Assets" className="profile-card">
          <div className="form-group">
            <label>{t('profile.motivation')}</label>
            <textarea className="ui-textarea" rows={4} value={context.writingAssets.motivationDraft} onChange={(e) => updateSection('writingAssets', 'motivationDraft', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Self PR</label>
            <textarea className="ui-textarea" rows={4} value={context.writingAssets.selfPrDraft} onChange={(e) => updateSection('writingAssets', 'selfPrDraft', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Interview Answer Sample</label>
            <textarea className="ui-textarea" rows={4} value={context.writingAssets.interviewAnswer} onChange={(e) => updateSection('writingAssets', 'interviewAnswer', e.target.value)} />
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave}>
              <Save size={14} /> {t('profile.save')}
            </button>
          </div>
        </Card>

        <Card
          title="Coach Context Preview"
          className="profile-card"
          action={<Badge variant="accent">AI Coach Input</Badge>}
        >
          <p className="text-muted" style={{ marginBottom: '0.75rem' }}>
            This summary is now passed into AI Coach and future matching / writing flows.
          </p>
          <textarea className="ui-textarea" rows={18} value={contextSummary} readOnly />
          <div className="form-actions">
            <button className="btn-secondary" onClick={copySummary}>
              <Copy size={14} /> Copy Summary
            </button>
            <button className="btn-secondary" onClick={handleSave}>
              <Sparkles size={14} /> Save & Use in Coach
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Profile;
