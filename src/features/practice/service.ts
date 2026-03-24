import {
  AIFeedbackResult,
  CaseQuestion,
  LearningContent,
  PracticeCatalog,
  PracticeEvaluationInput,
  PracticeGenerationInput,
  PracticePolishInput,
  PracticeRecord,
  WebTestQuestion,
} from './types';
import { deriveSeedFeedback, seedCaseQuestions, seedLearningContent, seedWebTestQuestions } from './seedData';

const CORE_API_BASE = '/api/core';

export function getPracticeCatalog(): PracticeCatalog {
  return {
    caseQuestions: seedCaseQuestions,
    webTestQuestions: seedWebTestQuestions,
    learningContent: seedLearningContent,
  };
}

export function mapCasePracticeRecord(item: any): PracticeRecord {
  return {
    id: item.id,
    user_id: 'local-user',
    practice_type: 'case',
    question_id: item.case_question ? `legacy-case-${item.id}` : '',
    title: item.case_question || 'Case Practice',
    date: item.date,
    duration_min: null,
    score: item.score ?? null,
    summary: item.summary || '',
    user_answer: item.user_answer || '',
    ai_feedback_id: item.ai_feedback ? `legacy-feedback-${item.id}` : null,
    tags: [item.company, 'case'].filter(Boolean),
  };
}

export function mapWebPracticeRecord(item: any): PracticeRecord {
  return {
    id: item.id,
    user_id: 'local-user',
    practice_type: 'web_test',
    question_id: item.test_type ? `legacy-web-${item.id}` : '',
    title: item.test_type || 'Web Test Practice',
    date: item.date,
    duration_min: item.time_spent ?? null,
    score: item.score ?? null,
    summary: item.test_type ? `${item.test_type} practice record` : '',
    user_answer: '',
    ai_feedback_id: null,
    tags: [item.test_type, 'web_test'].filter(Boolean),
  };
}

export function buildFeedbackHighlights(records: PracticeRecord[]): AIFeedbackResult[] {
  return deriveSeedFeedback(records);
}

export function buildRecommendedNextPractice(
  caseQuestions: CaseQuestion[],
  webQuestions: WebTestQuestion[],
  feedback: AIFeedbackResult[]
) {
  const weaknessPool = feedback.flatMap((item) => item.weaknesses).join(' ').toLowerCase();

  const recommendedCase = weaknessPool.includes('prioritization')
    ? caseQuestions.find((item) => item.type === 'profitability' && item.difficulty === 'medium')
    : caseQuestions.find((item) => item.difficulty === 'easy');

  const recommendedWeb = weaknessPool.includes('table')
    ? webQuestions.find((item) => item.category === 'table_reading' && item.difficulty === 'medium')
    : webQuestions.find((item) => item.category === 'numerical' && item.difficulty === 'easy');

  return {
    caseRecommendation: recommendedCase || caseQuestions[0],
    webRecommendation: recommendedWeb || webQuestions[0],
  };
}

export async function generateCasePractice(_input: PracticeGenerationInput): Promise<CaseQuestion> {
  throw new Error('Dynamic case generation is not connected yet. Use seed catalog or plug in an API later.');
}

export async function generateWebTestPractice(_input: PracticeGenerationInput): Promise<WebTestQuestion> {
  throw new Error('Dynamic web test generation is not connected yet. Use seed catalog or plug in an API later.');
}

export async function evaluatePracticeWithAI(_input: PracticeEvaluationInput): Promise<AIFeedbackResult> {
  throw new Error('AI evaluation endpoint is not connected yet. Plug a provider into this service.');
}

export async function polishPracticeAnswer(_input: PracticePolishInput): Promise<{ polishedText: string }> {
  throw new Error('Answer polishing endpoint is not connected yet. Plug a provider into this service.');
}

export async function fetchCasePractice(): Promise<any[]> {
  const res = await fetch(`${CORE_API_BASE}/case-practice`);
  if (!res.ok) throw new Error('Failed to fetch case practice');
  return res.json();
}

export async function fetchWebTestPractice(): Promise<any[]> {
  const res = await fetch(`${CORE_API_BASE}/webtest-practice`);
  if (!res.ok) throw new Error('Failed to fetch web test practice');
  return res.json();
}

export async function createCasePractice(payload: Record<string, unknown>) {
  const res = await fetch(`${CORE_API_BASE}/case-practice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save case practice');
  return res.json();
}

export async function createWebTestPractice(payload: Record<string, unknown>) {
  const res = await fetch(`${CORE_API_BASE}/webtest-practice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save web test practice');
  return res.json();
}

export function getLearningPreview(limit = 4): LearningContent[] {
  return seedLearningContent.slice(0, limit);
}
