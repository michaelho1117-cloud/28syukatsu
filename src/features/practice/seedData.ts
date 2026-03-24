import {
  AIFeedbackResult,
  CaseQuestion,
  CaseQuestionType,
  CompanyStyle,
  Difficulty,
  LearningContent,
  PracticeRecord,
  TargetSkill,
  WebTestCategory,
  WebTestQuestion,
} from './types';

const caseTypeConfig: Array<{
  type: CaseQuestionType;
  titles: string[];
  basePrompt: string;
  structure: string[];
  followUps: string[];
  goodPoints: string[];
  mistakes: string[];
  companyStyle: CompanyStyle;
  skills: TargetSkill[];
}> = [
  {
    type: 'profitability',
    titles: [
      'Airport retail profitability recovery',
      'Regional cinema margin decline',
      'Subscription meal-kit profitability',
      'Luxury hotel occupancy slump',
      'EV charging network unit economics',
    ],
    basePrompt: 'Your client has seen profitability decline over the past 12 months. Diagnose the issue and recommend the highest-priority intervention.',
    structure: ['Clarify revenue vs cost driver', 'Segment customer / product / channel', 'Prioritize the biggest profit lever'],
    followUps: ['What data would you request first?', 'How would you test whether the issue is structural or temporary?'],
    goodPoints: ['Separates revenue and cost cleanly', 'Prioritizes biggest driver before brainstorming', 'Quantifies impact of recommendation'],
    mistakes: ['Listing causes without prioritization', 'Ignoring fixed vs variable cost split', 'Jumping to solution too early'],
    companyStyle: 'strategy_firm',
    skills: ['structuring', 'hypothesis_driven_thinking', 'quantitative_reasoning', 'prioritization'],
  },
  {
    type: 'market_entry',
    titles: [
      'Japanese skincare brand entering Indonesia',
      'Cloud accounting tool entering SME market',
      'Cold-chain logistics entry in Vietnam',
      'Premium pet food launch in Korea',
      'EV battery recycler entering Europe',
    ],
    basePrompt: 'Assess whether the client should enter the target market, and if so, define the most sensible entry approach.',
    structure: ['Market attractiveness', 'Right to win / capabilities', 'Entry mode and economics'],
    followUps: ['What would make you say no to this market?', 'How would the recommendation change for a phased launch?'],
    goodPoints: ['Evaluates both market and client fit', 'Names a concrete entry mode', 'Considers implementation risk'],
    mistakes: ['Only describing market size', 'Ignoring competitive intensity', 'No clear go / no-go criteria'],
    companyStyle: 'strategy_firm',
    skills: ['structuring', 'market_sizing', 'prioritization', 'synthesis'],
  },
  {
    type: 'growth_strategy',
    titles: [
      'Growth plan for a mature convenience chain',
      'B2B SaaS growth in Japanese mid-market',
      'International growth for specialty tea brand',
      'Cross-sell growth for private bank',
      'New customer growth for online education platform',
    ],
    basePrompt: 'The client wants to accelerate growth over the next three years. Identify the most promising growth paths and recommend where to focus.',
    structure: ['Define growth sources', 'Assess attractiveness and feasibility', 'Prioritize one to two core bets'],
    followUps: ['What KPIs would you track in year one?', 'How would you sequence near-term vs long-term growth bets?'],
    goodPoints: ['Separates core expansion from adjacency bets', 'Uses prioritization criteria explicitly', 'Ends with a focused growth thesis'],
    mistakes: ['Giving too many parallel bets', 'No view on sequencing', 'Ignoring operational readiness'],
    companyStyle: 'general',
    skills: ['structuring', 'prioritization', 'synthesis', 'communication'],
  },
  {
    type: 'pricing',
    titles: [
      'Pricing strategy for premium coffee chain',
      'B2B software annual contract repricing',
      'Airline ancillary pricing redesign',
      'Dynamic pricing for ticketing platform',
      'Medical device premium service pricing',
    ],
    basePrompt: 'The client believes pricing is leaving money on the table. Diagnose the opportunity and recommend a pricing approach.',
    structure: ['Current pricing logic', 'Customer willingness to pay / elasticity', 'Recommended pricing move and guardrails'],
    followUps: ['How would you test customer reaction?', 'Where is the biggest implementation risk?'],
    goodPoints: ['Links pricing to customer segments', 'Considers elasticity and competitive response', 'Defines pilot or rollout logic'],
    mistakes: ['Assuming price increase is always good', 'Ignoring segmentation', 'No implementation path'],
    companyStyle: 'general',
    skills: ['structuring', 'quantitative_reasoning', 'prioritization', 'communication'],
  },
  {
    type: 'operations',
    titles: [
      'Warehouse throughput bottleneck case',
      'Hospital outpatient waiting-time reduction',
      'Factory scrap-rate improvement case',
      'Call center service-level redesign',
      'Restaurant labor productivity improvement',
    ],
    basePrompt: 'The client wants to improve operational performance. Diagnose the bottleneck and recommend the highest-impact intervention.',
    structure: ['Map the process', 'Find the bottleneck', 'Estimate impact of operational levers'],
    followUps: ['What trade-offs could appear?', 'How would you monitor whether the fix works?'],
    goodPoints: ['Maps workflow before recommending', 'Focuses on bottleneck not symptoms', 'Balances service and cost impact'],
    mistakes: ['Too generic improvement ideas', 'No process logic', 'No operational metric to track'],
    companyStyle: 'operations',
    skills: ['structuring', 'prioritization', 'quantitative_reasoning', 'synthesis'],
  },
  {
    type: 'general',
    titles: [
      'Consumer app churn case',
      'Should a retailer build an in-house logistics unit?',
      'University continuing education monetization',
      'Financial services branch redesign',
      'D2C brand omnichannel strategy',
    ],
    basePrompt: 'Break down the client problem, define the key decision criteria, and recommend the next step with supporting logic.',
    structure: ['Clarify objective', 'Break issue into decision buckets', 'Recommend next step with rationale'],
    followUps: ['What assumptions matter most?', 'What is the first analysis you would run next?'],
    goodPoints: ['Clarifies objective crisply', 'Builds a MECE issue tree', 'Ends with a decisive recommendation'],
    mistakes: ['Staying too high-level', 'No clear issue tree', 'Recommendation not tied to evidence'],
    companyStyle: 'unknown',
    skills: ['structuring', 'synthesis', 'communication', 'hypothesis_driven_thinking'],
  },
];

const caseDifficulties: Difficulty[] = [
  ...Array(10).fill('easy'),
  ...Array(10).fill('medium'),
  ...Array(10).fill('hard'),
];

export const seedCaseQuestions: CaseQuestion[] = caseTypeConfig.flatMap((config, configIndex) =>
  config.titles.map((title, titleIndex) => {
    const difficulty = caseDifficulties[configIndex * 5 + titleIndex];
    return {
      id: `case-${config.type}-${titleIndex + 1}`,
      title,
      type: config.type,
      difficulty,
      language: 'en',
      company_style: config.companyStyle,
      target_skills: config.skills,
      prompt: `${config.basePrompt}\n\nCase context: ${title}. Assume the client expects a concise, hypothesis-driven discussion.`,
      expected_structure: config.structure,
      follow_up_questions: config.followUps,
      sample_good_points: config.goodPoints,
      common_mistakes: config.mistakes,
      source_type: 'generated',
    };
  })
);

const webCategoryConfig: Array<{
  category: WebTestCategory;
  count: number;
  subtype: string[];
  stem: string;
  answerPattern: string[];
  traps: string[];
}> = [
  {
    category: 'numerical',
    count: 15,
    subtype: ['percentage', 'ratio', 'break-even'],
    stem: 'A consulting team compares monthly revenue and cost trends across three business units. Which option best fits the calculation?',
    answerPattern: ['A', 'B', 'C', 'D'],
    traps: ['Using the wrong base for percentages', 'Ignoring unit conversions'],
  },
  {
    category: 'logical',
    count: 15,
    subtype: ['sequence', 'syllogism', 'conditional logic'],
    stem: 'Choose the option that must be true based on the logical statements provided.',
    answerPattern: ['A', 'B', 'C', 'D'],
    traps: ['Confusing sufficient and necessary conditions', 'Ignoring “only if” wording'],
  },
  {
    category: 'verbal',
    count: 10,
    subtype: ['reading comprehension', 'paragraph logic'],
    stem: 'Read the short passage and identify the statement most consistent with the author’s argument.',
    answerPattern: ['A', 'B', 'C', 'D'],
    traps: ['Picking a broadly true statement that is not supported by the passage'],
  },
  {
    category: 'table_reading',
    count: 10,
    subtype: ['table comparison', 'chart reading'],
    stem: 'Using the table and chart, determine which statement is numerically correct.',
    answerPattern: ['A', 'B', 'C', 'D'],
    traps: ['Mixing cumulative and period values', 'Ignoring row / column labels'],
  },
  {
    category: 'spi',
    count: 10,
    subtype: ['mixed SPI / TG-WEB'],
    stem: 'Solve this timed aptitude question using fast elimination and pattern recognition.',
    answerPattern: ['A', 'B', 'C', 'D'],
    traps: ['Over-calculating instead of estimating', 'Not managing time per question'],
  },
];

const webDifficulties: Difficulty[] = [
  ...Array(20).fill('easy'),
  ...Array(20).fill('medium'),
  ...Array(20).fill('hard'),
];

export const seedWebTestQuestions: WebTestQuestion[] = webCategoryConfig.flatMap((config, configIndex) =>
  Array.from({ length: config.count }, (_, index) => {
    const difficulty = webDifficulties[
      webCategoryConfig.slice(0, configIndex).reduce((sum, item) => sum + item.count, 0) + index
    ];
    const subtype = config.subtype[index % config.subtype.length];
    const question = `${config.stem}\n\nQuestion ${index + 1}: Focus on ${subtype} reasoning under time pressure.`;
    return {
      id: `web-${config.category}-${index + 1}`,
      category: config.category,
      subtype,
      difficulty,
      language: 'ja',
      question,
      choices: config.answerPattern.map((choice, choiceIndex) => `${choice}. Candidate option ${choiceIndex + 1}`),
      correct_answer: config.answerPattern[index % config.answerPattern.length],
      solution: `Start by identifying the quickest elimination rule for ${subtype}. Then verify the winning option with one concise calculation or logical check.`,
      time_recommendation_sec: difficulty === 'easy' ? 45 : difficulty === 'medium' ? 60 : 80,
      common_traps: config.traps,
      source_type: 'generated',
    };
  })
);

export const seedLearningContent: LearningContent[] = [
  {
    id: 'learn-case-1',
    title: 'Case fundamentals: what interviewers are actually testing',
    category: 'case',
    subcategory: 'fundamentals',
    language: 'en',
    summary: 'A concise breakdown of what case interviews measure beyond “getting the answer right.”',
    content: 'Interviewers are primarily checking whether you can structure ambiguity, prioritize the right drivers, and communicate in a calm, business-like way. Treat the case as a collaborative problem-solving discussion rather than a puzzle contest.',
    key_takeaways: ['Structure before detail', 'State hypotheses early', 'Keep the interviewer with you'],
    related_skills: ['structuring', 'communication', 'synthesis'],
    recommended_for: ['beginner'],
    source_type: 'generated',
  },
  {
    id: 'learn-case-2',
    title: 'Frameworks without framework dumping',
    category: 'case',
    subcategory: 'frameworks',
    language: 'en',
    summary: 'How to use frameworks as thinking buckets instead of memorized slogans.',
    content: 'Frameworks help you avoid blind spots, but interviewers dislike generic recitation. Translate a framework into issue-specific buckets and explain why each bucket matters for the client decision.',
    key_takeaways: ['Customize the issue tree', 'Explain why a branch matters', 'Avoid memorized jargon'],
    related_skills: ['structuring', 'prioritization', 'communication'],
    recommended_for: ['beginner', 'intermediate'],
    source_type: 'generated',
  },
  {
    id: 'learn-case-3',
    title: 'Common case mistakes Japanese candidates make under pressure',
    category: 'case',
    subcategory: 'mistakes',
    language: 'en',
    summary: 'Typical failure patterns seen in fast-paced case interviews.',
    content: 'Common mistakes include over-explaining the setup, not prioritizing the issue tree, failing to quantify impact, and giving a recommendation that does not answer the client’s objective directly.',
    key_takeaways: ['Answer the client question directly', 'Quantify impact when possible', 'Prioritize instead of listing everything'],
    related_skills: ['prioritization', 'synthesis', 'communication'],
    recommended_for: ['intermediate'],
    source_type: 'generated',
  },
  {
    id: 'learn-case-4',
    title: 'Market sizing under time pressure',
    category: 'case',
    subcategory: 'market_sizing',
    language: 'en',
    summary: 'A practical approach for fast, interview-safe market sizing.',
    content: 'Start with a top-down anchor, state assumptions clearly, and refine only the branches that materially change the answer. Precision matters less than structure and sensible arithmetic.',
    key_takeaways: ['Anchor first', 'State assumptions explicitly', 'Refine only high-impact branches'],
    related_skills: ['market_sizing', 'quantitative_reasoning', 'communication'],
    recommended_for: ['beginner', 'intermediate'],
    source_type: 'generated',
  },
  {
    id: 'learn-web-1',
    title: 'SPI numerical strategy: speed before perfection',
    category: 'web_test',
    subcategory: 'spi_numerical',
    language: 'ja',
    summary: 'SPI 数的を短時間で解くための優先順位づけ。',
    content: 'SPI 数的は「全問正解」より「解ける問題を確実に取る」ことが重要です。時間を食う問題は早めに見切り、取りやすい比率・割合・損益を優先しましょう。',
    key_takeaways: ['取りやすい問題から処理', '見切りの基準を持つ', '暗算の型を増やす'],
    related_skills: ['quantitative_reasoning', 'prioritization'],
    recommended_for: ['beginner'],
    source_type: 'generated',
  },
  {
    id: 'learn-web-2',
    title: 'TG-WEB verbal: reading less, discriminating faster',
    category: 'web_test',
    subcategory: 'tg_web_verbal',
    language: 'en',
    summary: 'How to handle long passages without getting trapped in rereading.',
    content: 'TG-WEB verbal rewards fast discrimination. Read for claim structure first, then return to supporting detail only when an option hinges on it. Avoid treating every sentence as equally important.',
    key_takeaways: ['Track argument structure', 'Check claim vs evidence', 'Avoid full rereads'],
    related_skills: ['synthesis', 'prioritization'],
    recommended_for: ['intermediate'],
    source_type: 'generated',
  },
  {
    id: 'learn-web-3',
    title: 'Table reading: reduce the chance of careless errors',
    category: 'web_test',
    subcategory: 'table_reading',
    language: 'en',
    summary: 'A repeatable routine for chart and table questions.',
    content: 'Before solving, label the unit, period, and denominator in your head. Most table-reading misses come from mixing cumulative and point-in-time numbers or misreading the row/column relationship.',
    key_takeaways: ['Check units first', 'Separate cumulative from period values', 'Scan headers before calculating'],
    related_skills: ['quantitative_reasoning', 'structuring'],
    recommended_for: ['beginner', 'intermediate'],
    source_type: 'generated',
  },
  {
    id: 'learn-web-4',
    title: 'Tamatebako pacing strategy',
    category: 'web_test',
    subcategory: 'tamatebako_pacing',
    language: 'ja',
    summary: '玉手箱で時間切れを防ぐためのペース配分。',
    content: '玉手箱では難問を粘るより、形式ごとの処理スピードを先に作ることが重要です。1問ごとの目安時間を持ち、一定時間で次へ進む癖をつけましょう。',
    key_takeaways: ['形式ごとの処理速度を作る', '時間で切る基準を持つ', '模試で再現練習する'],
    related_skills: ['prioritization', 'quantitative_reasoning'],
    recommended_for: ['beginner', 'intermediate'],
    source_type: 'generated',
  },
  {
    id: 'learn-fund-1',
    title: 'Structuring under ambiguity',
    category: 'fundamentals',
    subcategory: 'structuring',
    language: 'en',
    summary: 'A reusable way to bring order to messy business questions.',
    content: 'When the problem is ambiguous, start with the decision to be made, then ask which buckets would change that decision. This produces a more useful issue tree than generic MECE recitation.',
    key_takeaways: ['Start from the decision', 'Build only relevant buckets', 'Prioritize before deep-diving'],
    related_skills: ['structuring', 'prioritization'],
    recommended_for: ['beginner', 'intermediate'],
    source_type: 'generated',
  },
  {
    id: 'learn-fund-2',
    title: 'Prioritization: deciding what not to analyze',
    category: 'fundamentals',
    subcategory: 'prioritization',
    language: 'en',
    summary: 'How to make narrower, stronger recommendations.',
    content: 'Strong candidates explicitly choose what not to analyze yet. In practice, prioritization means naming the one or two branches most likely to shift the client decision and testing them first.',
    key_takeaways: ['Name your priority criteria', 'Cut low-value branches early', 'Make sequencing explicit'],
    related_skills: ['prioritization', 'hypothesis_driven_thinking'],
    recommended_for: ['intermediate'],
    source_type: 'generated',
  },
  {
    id: 'learn-interview-1',
    title: 'Practice review: how to write useful reflections',
    category: 'interview',
    subcategory: 'review',
    language: 'en',
    summary: 'Reflection should produce a better next practice, not just self-criticism.',
    content: 'A useful review captures one strength to preserve, one weakness to target, and one next practice condition. Avoid vague notes like “need more confidence.” Replace them with concrete habits to practice next time.',
    key_takeaways: ['Name one strength', 'Name one weakness', 'Define the next drill concretely'],
    related_skills: ['communication', 'synthesis'],
    recommended_for: ['beginner', 'intermediate', 'advanced'],
    source_type: 'generated',
  },
  {
    id: 'learn-interview-2',
    title: 'Turning feedback into the next training loop',
    category: 'interview',
    subcategory: 'coaching_loop',
    language: 'en',
    summary: 'How to convert AI or human feedback into a deliberate practice cycle.',
    content: 'Every feedback point should be translated into a repeatable drill. For example, “your synthesis is weak” becomes “summarize the client decision, rationale, and risk in under 30 seconds after each case.”',
    key_takeaways: ['Translate feedback into drills', 'Keep next focus narrow', 'Measure improvement explicitly'],
    related_skills: ['synthesis', 'communication', 'prioritization'],
    recommended_for: ['intermediate', 'advanced'],
    source_type: 'generated',
  },
];

export function deriveSeedFeedback(records: PracticeRecord[]): AIFeedbackResult[] {
  return records.slice(0, 6).map((record, index) => {
    const score = record.score ?? (record.practice_type === 'case' ? 76 : 72);
    return {
      id: `feedback-${record.id}-${index}`,
      practice_record_id: record.id,
      overall_score: score,
      strengths: record.practice_type === 'case'
        ? ['Clear opening structure', 'Good client-oriented synthesis']
        : ['Maintained pace on easier items', 'Good elimination discipline'],
      weaknesses: record.practice_type === 'case'
        ? ['Prioritization under time pressure', 'Quantifying recommendation impact']
        : ['Accuracy on medium-difficulty questions', 'Time allocation on table reading'],
      missed_points: record.practice_type === 'case'
        ? ['Did not test the top hypothesis with data', 'Skipped risk / implementation note']
        : ['Missed trap in denominator change', 'Re-read too much in verbal questions'],
      coach_comment: record.practice_type === 'case'
        ? 'Your structure is becoming more stable, but the recommendation still needs sharper prioritization and faster synthesis.'
        : 'Your base speed is improving. The next gain will come from reducing careless misses on medium-difficulty questions.',
      next_focus: record.practice_type === 'case'
        ? ['Run one profitability drill focused on prioritization', 'Practice 30-second final synthesis twice']
        : ['Do one timed numerical set', 'Review table-reading trap patterns'],
      skill_breakdown: {
        structuring: Math.min(score + 6, 92),
        prioritization: Math.max(score - 8, 55),
        quantitative_reasoning: record.practice_type === 'case' ? Math.max(score - 4, 58) : Math.min(score + 2, 88),
        synthesis: Math.max(score - 6, 54),
        communication: Math.min(score + 4, 90),
      },
      generated_at: new Date().toISOString(),
    };
  });
}
