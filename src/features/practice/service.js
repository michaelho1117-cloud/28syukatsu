import { deriveSeedFeedback, seedCaseQuestions, seedLearningContent, seedWebTestQuestions } from './seedData';
import { loadLocalAiFeedback, loadLocalPracticeRecords, saveLocalAiFeedback, saveLocalPracticeRecord } from './storage';

const CORE_API = '/api/core';

const PRACTICE_SKILLS = [
  'structuring',
  'prioritization',
  'quantitative_reasoning',
  'synthesis',
  'communication',
  'time_management',
];

function toPracticeRecord(raw, practiceType) {
  if (practiceType === 'case') {
    return {
      id: raw.id,
      user_id: 'local-user',
      practice_type: 'case',
      question_id: raw.question_id || `legacy-case-${raw.id}`,
      title: raw.case_question || raw.title || 'Untitled case practice',
      date: raw.date || '',
      duration_min: raw.duration_min ?? null,
      score: raw.score ?? null,
      summary: raw.summary || '',
      user_answer: raw.user_answer || '',
      ai_feedback_id: raw.ai_feedback_id || null,
      tags: ['case', raw.company].filter(Boolean),
      company: raw.company || '',
      source: 'legacy_api',
    };
  }

  return {
    id: raw.id,
    user_id: 'local-user',
    practice_type: 'web_test',
    question_id: raw.question_id || `legacy-web-${raw.id}`,
    title: raw.title || raw.test_type || 'Untitled web test practice',
    date: raw.date || '',
    duration_min: raw.time_spent ?? null,
    score: raw.score ?? null,
    summary: raw.summary || '',
    user_answer: raw.user_answer || '',
    ai_feedback_id: raw.ai_feedback_id || null,
    tags: ['web_test', raw.test_type].filter(Boolean),
    company: raw.company || '',
    test_type: raw.test_type || '',
    source: 'legacy_api',
  };
}

function safeDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfWeek(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);
  current.setHours(0, 0, 0, 0);
  return current;
}

function aggregateWeaknessSignals(feedback) {
  const board = PRACTICE_SKILLS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
  feedback.forEach((entry) => {
    (entry.weaknesses || []).forEach((weakness) => {
      const normalized = String(weakness || '').toLowerCase();
      const hit = PRACTICE_SKILLS.find((skill) => normalized.includes(skill));
      if (hit) board[hit] += 1;
    });
    if (entry.skill_breakdown) {
      PRACTICE_SKILLS.forEach((skill) => {
        const score = entry.skill_breakdown?.[skill];
        if (typeof score === 'number' && score < 70) board[skill] += 1;
      });
    }
  });
  return Object.entries(board)
    .sort((a, b) => b[1] - a[1])
    .map(([skill, count]) => ({ skill, count }))
    .filter((entry) => entry.count > 0);
}

function buildWeeklySummary(records) {
  const weekStart = startOfWeek();
  const thisWeek = records.filter((record) => {
    const recordDate = safeDate(record.date);
    return recordDate && recordDate >= weekStart;
  });
  const caseCount = thisWeek.filter((record) => record.practice_type === 'case').length;
  const webCount = thisWeek.filter((record) => record.practice_type === 'web_test').length;
  const scored = thisWeek.filter((record) => typeof record.score === 'number');
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length)
    : null;
  return {
    total: thisWeek.length,
    caseCount,
    webCount,
    avgScore,
    weekRecords: thisWeek,
  };
}

function buildRecommendations(records, feedback, weaknessSignals) {
  const latestCase = records.find((record) => record.practice_type === 'case');
  const latestWeb = records.find((record) => record.practice_type === 'web_test');
  const topWeakness = weaknessSignals[0]?.skill || '';

  const mappedReason = {
    prioritization: 'Run one profitability prioritization drill and force a top-down answer in 30 seconds.',
    structuring: 'Start with an easy case and focus only on building a clean issue tree.',
    quantitative_reasoning: 'Do one timed numerical set and narrate the math out loud.',
    synthesis: 'Practice a 30-second recommendation close after each attempt.',
    communication: 'Record one mock answer and tighten transitions between points.',
    time_management: 'Use one short timed drill to rehearse pacing under pressure.',
  };

  return [
    topWeakness && {
      id: 'weakness-focus',
      track: 'Coaching',
      title: `${topWeakness} drill`,
      reason: mappedReason[topWeakness] || 'Review the weakest skill with one focused drill.',
      difficulty: topWeakness === 'time_management' ? 'easy' : 'medium',
    },
    latestCase && {
      id: 'latest-case-refresh',
      track: 'Case',
      title: latestCase.title,
      reason: 'Replay the latest case once more with a sharper top-down recommendation.',
      difficulty: 'medium',
    },
    latestWeb && {
      id: 'latest-web-refresh',
      track: 'Web Test',
      title: latestWeb.test_type || latestWeb.title,
      reason:
        latestWeb.duration_min && latestWeb.duration_min > 35
          ? 'Run a shorter timed set to improve pace.'
          : 'Keep momentum with one additional mixed web-test set.',
      difficulty: 'easy',
    },
    {
      id: 'learn-refresh',
      track: 'Learn',
      title: seedLearningContent[0].title,
      reason: 'Refresh fundamentals before your next full practice.',
      difficulty: 'easy',
    },
  ].filter(Boolean).slice(0, 4);
}

function buildMistakeReview(records, feedback, weaknessSignals) {
  return weaknessSignals.slice(0, 4).map(({ skill, count }) => ({
    label: skill,
    count,
    relatedRecords: records
      .filter((record) => {
        const linked = feedback.find((entry) => entry.practice_record_id === record.id);
        return linked && (
          (linked.weaknesses || []).some((weakness) => String(weakness).toLowerCase().includes(skill)) ||
          (typeof linked.skill_breakdown?.[skill] === 'number' && linked.skill_breakdown[skill] < 70)
        );
      })
      .slice(0, 2),
  }));
}

function buildWebFeedbackResult(question, checked) {
  const timeLimit = Number(question?.time_recommendation_sec || 60);
  const timeSpentSec = Number(checked?.timeSpentSec || 0);
  const timeRatio = timeLimit > 0 ? timeSpentSec / timeLimit : 1;
  const accurate = Boolean(checked?.correct);

  const skill_breakdown = {
    structuring: accurate ? 76 : 58,
    prioritization: accurate ? 74 : 60,
    quantitative_reasoning:
      question?.category === 'numerical' || question?.category === 'table_reading'
        ? accurate
          ? 82
          : 56
        : accurate
          ? 70
          : 62,
    synthesis: accurate ? 72 : 60,
    communication: 72,
    time_management:
      timeRatio <= 0.8 ? 84 : timeRatio <= 1 ? 74 : timeRatio <= 1.2 ? 64 : 54,
  };

  const strengths = [];
  const weaknesses = [];
  const missed_points = [];
  const next_focus = [];

  if (accurate) {
    strengths.push('Strong answer accuracy under timed conditions');
    if (skill_breakdown.time_management >= 74) {
      strengths.push('Kept a healthy solving pace');
    }
    if (question?.category === 'numerical' || question?.category === 'table_reading') {
      strengths.push('Handled quantitative reasoning cleanly');
    } else {
      strengths.push('Filtered options with solid logic');
    }
  } else {
    weaknesses.push('Accuracy dropped on this attempt');
    missed_points.push(`Recheck the core logic behind this ${question?.subtype || question?.category || 'question'}`);
    if (question?.category === 'numerical' || question?.category === 'table_reading') {
      weaknesses.push('Quantitative reasoning needs another timed rep');
      next_focus.push('Run one short numerical drill and talk through the calculation steps');
    } else {
      weaknesses.push('Option elimination and reasoning discipline need tightening');
      next_focus.push('Practice one more timed logic set with deliberate elimination notes');
    }
  }

  if (skill_breakdown.time_management < 70) {
    weaknesses.push('Time management slipped under pressure');
    missed_points.push('Your pace drifted too close to or beyond the recommended time window');
    next_focus.push('Do one 5-minute pace drill before the next full set');
  } else if (!accurate) {
    strengths.push('Pace was still controlled even after a miss');
  }

  const overall_score = accurate
    ? Math.min(96, Math.round((skill_breakdown.quantitative_reasoning + skill_breakdown.time_management + 80) / 3))
    : Math.max(42, Math.round((skill_breakdown.quantitative_reasoning + skill_breakdown.time_management + 40) / 3));

  return {
    id: `feedback-web-${Date.now()}`,
    practice_record_id: '',
    overall_score,
    strengths,
    weaknesses,
    missed_points,
    coach_comment: accurate
      ? 'Good timed execution. Keep the same discipline and aim to make your elimination logic even more explicit.'
      : 'Treat this miss as signal, not failure. Rebuild the reasoning steps, then repeat one shorter drill while protecting your pace.',
    next_focus:
      next_focus.length > 0
        ? next_focus
        : ['Keep one additional timed web-test set this week to stabilize accuracy and pace.'],
    skill_breakdown,
    generated_at: new Date().toISOString(),
  };
}

function randomPick(items = []) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function filterCaseQuestions(input) {
  return seedCaseQuestions.filter((item) => {
    if (input.caseType && input.caseType !== 'mixed' && item.type !== input.caseType) return false;
    if (input.difficulty && item.difficulty !== input.difficulty) return false;
    if (input.language && item.language !== input.language) return false;
    if (input.companyStyle && input.companyStyle !== 'general' && item.company_style !== input.companyStyle) return false;
    return true;
  });
}

function filterWebQuestions(input) {
  return seedWebTestQuestions.filter((item) => {
    if (input.webCategory && input.webCategory !== 'mixed' && item.category !== input.webCategory) return false;
    if (input.difficulty && item.difficulty !== input.difficulty) return false;
    if (input.language && item.language !== input.language) return false;
    return true;
  });
}

export async function generateCaseQuestion(input) {
  const matches = filterCaseQuestions(input);
  return {
    mode: 'seed_fallback',
    input,
    question: randomPick(matches) || seedCaseQuestions[0],
  };
}

export async function generateWebTestQuestion(input) {
  const matches = filterWebQuestions(input);
  return {
    mode: 'seed_fallback',
    input,
    question: randomPick(matches) || seedWebTestQuestions[0],
  };
}

export async function evaluateCaseAnswer(input) {
  const response = await fetch(`${CORE_API}/ai/evaluate-case-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error('Failed to evaluate case answer.');
  }
  return response.json();
}

export async function polishPracticeAnswer(input) {
  const response = await fetch(`${CORE_API}/ai/polish-practice-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error('Failed to polish practice answer.');
  }
  return response.json();
}

export function checkWebTestAnswer({ question, selectedChoice, timeSpentSec = 0 }) {
  const correct = String(selectedChoice || '').trim() === String(question?.correct_answer || '').trim();
  return {
    correct,
    correctAnswer: question?.correct_answer || '',
    solution: question?.solution || '',
    timeSpentSec,
    score: correct ? 100 : 0,
    commonTraps: question?.common_traps || [],
  };
}

export async function submitCasePracticeAttempt(payload) {
  const timestamp = new Date().toISOString();
  const record = {
    id: `case-${Date.now()}`,
    user_id: 'local-user',
    practice_type: 'case',
    question_id: payload.question.id,
    title: payload.question.title,
    date: timestamp,
    duration_min: payload.durationMin,
    score: payload.feedback?.overall_score ?? null,
    summary: payload.summary,
    user_answer: payload.answerFields,
    ai_feedback_id: payload.feedback?.id || null,
    tags: [payload.question.type, payload.question.difficulty, payload.question.company_style].filter(Boolean),
    company: payload.company || '',
    source: 'practice_engine',
  };
  saveLocalPracticeRecord(record);
  if (payload.feedback) {
    saveLocalAiFeedback({
      ...payload.feedback,
      practice_record_id: record.id,
      generated_at: payload.feedback.generated_at || timestamp,
    });
  }
  return record;
}

export async function submitWebTestAttempt(payload) {
  const timestamp = new Date().toISOString();
  const feedback = buildWebFeedbackResult(payload.question, {
    correct: payload.correct,
    timeSpentSec: payload.timeSpentSec,
  });
  const record = {
    id: `web-${Date.now()}`,
    user_id: 'local-user',
    practice_type: 'web_test',
    question_id: payload.question.id,
    title: payload.question.subtype || payload.question.category,
    date: timestamp,
    duration_min: Math.max(1, Math.round((payload.timeSpentSec || 0) / 60)),
    score: payload.correct ? 100 : 0,
    summary: payload.correct ? 'Answered correctly.' : 'Missed the correct answer.',
    user_answer: payload.selectedChoice,
    ai_feedback_id: feedback.id,
    tags: [payload.question.category, payload.question.difficulty].filter(Boolean),
    test_type: payload.question.category,
    source: 'practice_engine',
  };
  saveLocalPracticeRecord(record);
  saveLocalAiFeedback({
    ...feedback,
    practice_record_id: record.id,
  });
  return { record, feedback: { ...feedback, practice_record_id: record.id } };
}

export async function loadPracticeHubData() {
  const [caseResponse, webResponse] = await Promise.all([
    fetch(`${CORE_API}/case-practice`),
    fetch(`${CORE_API}/webtest-practice`),
  ]);

  const [caseRows, webRows] = await Promise.all([caseResponse.json(), webResponse.json()]);
  const legacyCaseRecords = caseRows.map((item) => toPracticeRecord(item, 'case'));
  const legacyWebRecords = webRows.map((item) => toPracticeRecord(item, 'web_test'));
  const localRecords = loadLocalPracticeRecords();
  const localFeedback = loadLocalAiFeedback();
  const allRecords = [...localRecords, ...legacyCaseRecords, ...legacyWebRecords].sort((a, b) => {
    const aTime = safeDate(a.date)?.getTime() || 0;
    const bTime = safeDate(b.date)?.getTime() || 0;
    return bTime - aTime;
  });

  const derivedLegacyFeedback = deriveSeedFeedback(
    [...legacyCaseRecords, ...legacyWebRecords].filter((record) => !record.ai_feedback_id),
  );

  const aiFeedback = [...localFeedback, ...derivedLegacyFeedback]
    .sort((a, b) => {
      const aTime = safeDate(a.generated_at)?.getTime() || 0;
      const bTime = safeDate(b.generated_at)?.getTime() || 0;
      return bTime - aTime;
    });

  const weaknessSignals = aggregateWeaknessSignals(aiFeedback);

  return {
    catalog: {
      caseQuestions: seedCaseQuestions,
      webTestQuestions: seedWebTestQuestions,
      learningContent: seedLearningContent,
    },
    caseRecords: allRecords.filter((record) => record.practice_type === 'case'),
    webRecords: allRecords.filter((record) => record.practice_type === 'web_test'),
    practiceRecords: allRecords,
    aiFeedback,
    weaknessSignals,
    weeklySummary: buildWeeklySummary(allRecords),
    mistakeReview: buildMistakeReview(allRecords, aiFeedback, weaknessSignals),
    recommendations: buildRecommendations(allRecords, aiFeedback, weaknessSignals),
    apiActions: {
      generateCaseQuestion,
      generateWebTestQuestion,
      evaluateCaseAnswer,
      polishPracticeAnswer,
      checkWebTestAnswer,
    },
  };
}
