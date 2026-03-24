const NOTE_TYPE_COPY = {
  company_overview: { ja: '会社理解', en: 'Company Overview', zh: '企业理解' },
  event_note: { ja: 'イベント記録', en: 'Event Note', zh: '活动记录' },
  selection_prep: { ja: '選考準備', en: 'Selection Prep', zh: '选考准备' },
  decision_material: { ja: '判断材料', en: 'Decision Material', zh: '判断材料' },
  industry_research: { ja: '業界研究', en: 'Industry Research', zh: '行业研究' }
};

const SOURCE_TYPE_COPY = {
  verified: { ja: '確認済み', en: 'Verified', zh: '已确认' },
  ai_generated: { ja: 'AI生成 / 待確認', en: 'AI Generated / Pending Review', zh: 'AI生成 / 待确认' }
};

function pickLanguage(language = 'ja') {
  if (language === 'zh') return 'zh';
  if (language === 'en') return 'en';
  return 'ja';
}

function pickLabel(copy, value, language = 'ja', fallbackKey) {
  const lang = pickLanguage(language);
  const item = copy[value] || copy[fallbackKey];
  return item?.[lang] || item?.ja || '';
}

export function getNoteTypeOptions(language = 'ja') {
  return Object.keys(NOTE_TYPE_COPY).map((value) => ({
    value,
    label: getNoteTypeLabel(value, language)
  }));
}

export function getSourceTypeOptions(language = 'ja') {
  return Object.keys(SOURCE_TYPE_COPY).map((value) => ({
    value,
    label: getSourceTypeLabel(value, language)
  }));
}

export function getNoteTypeLabel(value, language = 'ja') {
  return pickLabel(NOTE_TYPE_COPY, value, language, 'company_overview');
}

export function getSourceTypeLabel(value, language = 'ja') {
  return pickLabel(SOURCE_TYPE_COPY, value, language, 'verified');
}

export function isAiGenerated(value) {
  return value === 'ai_generated';
}
