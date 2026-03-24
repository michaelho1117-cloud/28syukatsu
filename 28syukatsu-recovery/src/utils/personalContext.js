const STORAGE_KEY = 'shukatsu_personal_context_v1';

export const DEFAULT_PERSONAL_CONTEXT = {
  basicProfile: {
    name: 'Michael',
    nationality: 'Chinese',
    university: 'Tohoku University Graduate School of Economics and Management',
    currentProgram: 'Master Program (2026.4-2028.3)',
    major: 'Economics and Management',
    graduationYear: '2028',
    email: 'michaelho1117@gmail.com',
    languages: 'Chinese (native), Japanese (business), English (business)',
    certifications: 'JLPT N1 136/180 (2022), TOEIC L&R 945 (2020)'
  },
  motivationLayer: {
    whyConsulting: 'Strong exposure to consulting and business problem-solving through strategy, ESG, and HR-related internships. Wants to work on messy business issues in Japanese and international contexts.',
    preferredDomains: 'Strategy / General Consulting / IT Consulting / FAS-M&A / People & Organization',
    values: 'Structured thinking, international perspective, fast learning, and practical impact.',
    workStyle: 'Comfortable with bilingual environments, cross-border collaboration, and fast-moving project teams.'
  },
  experienceBank: [
    {
      id: 'exp-tohoku-master',
      title: 'Tohoku University Graduate School',
      category: 'academic',
      background: 'Master student in Economics and Management at Tohoku University (2026.4-2028.3) after language school transition in Japan.',
      action: 'Build academic grounding in business/economics while preparing for Japanese consulting recruitment.',
      result: 'Established a Japan-based career pivot with graduate-level academic context.',
      learning: 'Can bridge international background and local Japanese recruiting expectations.'
    },
    {
      id: 'exp-occ',
      title: 'OC&C Strategy Consultants Shanghai Office Intern',
      category: 'internship',
      background: 'Part-time assistant intern at OC&C Strategy Consultants Shanghai Office (2024.4-2024.6).',
      action: 'Supported strategy consulting work in a boutique, strategy-focused environment.',
      result: 'Gained direct exposure to consulting problem-solving and project support workflow.',
      learning: 'Understood the pace, rigor, and expectation level of strategy consulting teams.'
    },
    {
      id: 'exp-evalueserve',
      title: 'Evalueserve ESG Analyst Intern',
      category: 'internship',
      background: 'Worked in the ESG team at Evalueserve Business Consulting (Shanghai) (2023.8-2024.3).',
      action: 'Supported analysis and business consulting work related to ESG themes.',
      result: 'Built analytical experience with research-heavy and structured deliverables.',
      learning: 'Improved ability to organize information and turn research into decision-support material.'
    },
    {
      id: 'exp-rgf',
      title: 'RGF Human Resource Consulting Intern',
      category: 'internship',
      background: 'Assistant intern at RGF Human Resource Consulting Shanghai, Kamome China Career + Asia Business Unit (2023.6-2023.8).',
      action: 'Supported HR / recruiting-related business operations in a Recruit group environment.',
      result: 'Learned how talent, matching, and business communication operate in a client-facing context.',
      learning: 'Gained exposure to people/organization themes and practical communication in business settings.'
    },
    {
      id: 'exp-language-school',
      title: 'Elite Japanese Language School',
      category: 'academic',
      background: 'Studied at Elite Japanese Language School in Japan (2024.10-2026.3) to transition into Japanese graduate study and recruiting.',
      action: 'Adapted to local academic and life environment while strengthening Japanese professional fluency.',
      result: 'Completed a difficult transition from China to Japan and secured progression into Tohoku University graduate school.',
      learning: 'Adaptability and persistence in a new environment are strong personal assets.'
    },
    {
      id: 'exp-donki',
      title: 'Don Quijote Shinjuku Kabukicho Part-time Job',
      category: 'part_time',
      background: 'Part-time job at Don Quijote Shinjuku Kabukicho Store (2025.4-2026.3).',
      action: 'Worked in a fast-paced frontline retail environment in Japanese.',
      result: 'Handled real-world customer-facing work in a high-intensity local setting.',
      learning: 'Improved resilience, communication, and execution stability under pressure.'
    },
    {
      id: 'exp-shanghai-maritime',
      title: 'Shanghai Maritime University Japanese Major',
      category: 'academic',
      background: 'B.A. in Japanese Language, Faculty of Foreign Languages, Shanghai Maritime University (2020.10-2024.6).',
      action: 'Built strong Japanese language foundation and professional bilingual capability.',
      result: 'Reached JLPT N1 and strong TOEIC score, enabling business-level bilingual work.',
      learning: 'Language ability can be turned into a cross-border business advantage, not just a credential.'
    }
  ],
  storyBank: [
    {
      id: 'story-cross-border-adaptation',
      title: 'Cross-border adaptation from China to Japan',
      tag: 'improvement',
      situation: 'Moved from Chinese university track to Japanese language school, then advanced into Tohoku University graduate school while preparing for Japanese recruiting.',
      strengthSignal: 'Adaptability, persistence, and ability to build momentum in a new environment.',
      reusableFor: 'motivation / interview / self-pr'
    },
    {
      id: 'story-multi-consulting-internships',
      title: 'Internship exposure across HR, ESG, and strategy consulting',
      tag: 'gakuchika',
      situation: 'Experienced RGF, Evalueserve ESG, and OC&C strategy settings across different consulting-adjacent or consulting functions.',
      strengthSignal: 'Curiosity, structured learning, and ability to compare business models and work styles across firms.',
      reusableFor: 'es / motivation / interview'
    },
    {
      id: 'story-bilingual-business',
      title: 'Bilingual business communication as a working asset',
      tag: 'self-pr',
      situation: 'Reached business-level Japanese and English, then used Japanese in study, internships, and frontline work in Japan.',
      strengthSignal: 'Communication, international perspective, and ability to work across language/cultural boundaries.',
      reusableFor: 'self-pr / interview / people-organization'
    },
    {
      id: 'story-frontline-execution',
      title: 'Execution stability in a high-pressure frontline environment',
      tag: 'multitask',
      situation: 'Worked part-time at Don Quijote Shinjuku Kabukicho, a fast-paced and demanding retail environment.',
      strengthSignal: 'Execution, resilience, multitasking, and calm communication under pressure.',
      reusableFor: 'interview / self-pr / teamwork'
    }
  ],
  writingAssets: {
    motivationDraft: '',
    selfPrDraft: '',
    interviewAnswer: ''
  }
};

function hasMeaningfulValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function mergeFilledObject(defaultObj, savedObj = {}) {
  const merged = { ...defaultObj };
  for (const key of Object.keys(savedObj || {})) {
    if (hasMeaningfulValue(savedObj[key])) {
      merged[key] = savedObj[key];
    }
  }
  return merged;
}

function normalizeList(list, fallback) {
  if (!Array.isArray(list) || !list.length) return fallback;
  const meaningful = list.some((item) =>
    Object.entries(item || {}).some(([key, value]) => key !== 'id' && hasMeaningfulValue(value))
  );
  if (!meaningful) return fallback;
  return list.map((item, index) => ({
    id: item.id || `${Date.now()}-${index}`,
    ...item
  }));
}

export function loadPersonalContext() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PERSONAL_CONTEXT;
    const parsed = JSON.parse(raw);
    return {
      basicProfile: mergeFilledObject(DEFAULT_PERSONAL_CONTEXT.basicProfile, parsed.basicProfile || {}),
      motivationLayer: mergeFilledObject(DEFAULT_PERSONAL_CONTEXT.motivationLayer, parsed.motivationLayer || {}),
      experienceBank: normalizeList(parsed.experienceBank, DEFAULT_PERSONAL_CONTEXT.experienceBank),
      storyBank: normalizeList(parsed.storyBank, DEFAULT_PERSONAL_CONTEXT.storyBank),
      writingAssets: mergeFilledObject(DEFAULT_PERSONAL_CONTEXT.writingAssets, parsed.writingAssets || {})
    };
  } catch {
    return DEFAULT_PERSONAL_CONTEXT;
  }
}

export function savePersonalContext(context) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
}

export function summarizePersonalContext(context) {
  if (!context) return '';
  const basic = context.basicProfile || {};
  const motivation = context.motivationLayer || {};
  const experiences = (context.experienceBank || [])
    .filter((item) => item.title || item.background || item.action || item.result)
    .slice(0, 5)
    .map((item, index) => {
      return [
        `Experience ${index + 1}: ${item.title || 'Untitled'}`,
        item.background ? `Background: ${item.background}` : '',
        item.action ? `Action: ${item.action}` : '',
        item.result ? `Result: ${item.result}` : '',
        item.learning ? `Learning: ${item.learning}` : ''
      ].filter(Boolean).join('\n');
    });

  const stories = (context.storyBank || [])
    .filter((item) => item.title || item.situation || item.strengthSignal)
    .slice(0, 5)
    .map((item, index) => {
      return [
        `Story ${index + 1}: ${item.title || 'Untitled'}`,
        item.tag ? `Tag: ${item.tag}` : '',
        item.situation ? `Situation: ${item.situation}` : '',
        item.strengthSignal ? `Strength signal: ${item.strengthSignal}` : '',
        item.reusableFor ? `Reusable for: ${item.reusableFor}` : ''
      ].filter(Boolean).join('\n');
    });

  const parts = [
    'Basic Profile',
    `Name: ${basic.name || ''}`,
    basic.nationality ? `Nationality: ${basic.nationality}` : '',
    `University: ${basic.university || ''}`,
    basic.currentProgram ? `Current Program: ${basic.currentProgram}` : '',
    `Major: ${basic.major || ''}`,
    `Graduation Year: ${basic.graduationYear || ''}`,
    basic.languages ? `Languages: ${basic.languages}` : '',
    basic.certifications ? `Certifications: ${basic.certifications}` : '',
    '',
    'Motivation Layer',
    motivation.whyConsulting ? `Why consulting: ${motivation.whyConsulting}` : '',
    motivation.preferredDomains ? `Preferred domains: ${motivation.preferredDomains}` : '',
    motivation.values ? `Values: ${motivation.values}` : '',
    motivation.workStyle ? `Work style: ${motivation.workStyle}` : '',
    '',
    ...experiences,
    '',
    ...stories,
    '',
    context.writingAssets?.motivationDraft ? `Motivation draft: ${context.writingAssets.motivationDraft}` : '',
    context.writingAssets?.selfPrDraft ? `Self PR: ${context.writingAssets.selfPrDraft}` : '',
    context.writingAssets?.interviewAnswer ? `Interview answer sample: ${context.writingAssets.interviewAnswer}` : ''
  ];

  return parts.filter(Boolean).join('\n').slice(0, 5000);
}
