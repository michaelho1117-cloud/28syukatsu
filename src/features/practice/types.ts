export type PracticeLanguage = 'ja' | 'en' | 'zh';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type SourceType = 'generated' | 'curated' | 'user_added';

export type CaseQuestionType =
  | 'profitability'
  | 'market_entry'
  | 'growth_strategy'
  | 'pricing'
  | 'operations'
  | 'mna'
  | 'new_business'
  | 'general';

export type CompanyStyle =
  | 'general'
  | 'strategy_firm'
  | 'big4'
  | 'operations'
  | 'fas'
  | 'unknown';

export type TargetSkill =
  | 'structuring'
  | 'hypothesis_driven_thinking'
  | 'prioritization'
  | 'market_sizing'
  | 'quantitative_reasoning'
  | 'synthesis'
  | 'communication'
  | 'time_management';

export interface CaseQuestion {
  id: string;
  title: string;
  type: CaseQuestionType;
  difficulty: Difficulty;
  language: PracticeLanguage;
  company_style: CompanyStyle;
  target_skills: TargetSkill[];
  prompt: string;
  expected_structure: string[];
  follow_up_questions: string[];
  sample_good_points: string[];
  common_mistakes: string[];
  source_type: SourceType;
}

export type WebTestCategory =
  | 'verbal'
  | 'non_verbal'
  | 'logical'
  | 'numerical'
  | 'table_reading'
  | 'spi'
  | 'tg_web'
  | 'tamatebako'
  | 'general';

export interface WebTestQuestion {
  id: string;
  category: WebTestCategory;
  subtype: string;
  difficulty: Difficulty;
  language: PracticeLanguage;
  question: string;
  choices: string[];
  correct_answer: string;
  solution: string;
  time_recommendation_sec: number;
  common_traps: string[];
  source_type: SourceType;
}

export type LearningCategory = 'case' | 'web_test' | 'interview' | 'fundamentals';
export type RecommendedLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LearningContent {
  id: string;
  title: string;
  category: LearningCategory;
  subcategory: string;
  language: PracticeLanguage;
  summary: string;
  content: string;
  key_takeaways: string[];
  related_skills: TargetSkill[];
  recommended_for: RecommendedLevel[];
  source_type: Exclude<SourceType, 'user_added'>;
}

export type PracticeType = 'case' | 'web_test';

export interface PracticeRecord {
  id: string | number;
  user_id: string;
  practice_type: PracticeType;
  question_id: string;
  title: string;
  date: string;
  duration_min: number | null;
  score: number | null;
  summary: string;
  user_answer: string | Record<string, unknown>;
  ai_feedback_id: string | null;
  tags: string[];
}

export interface SkillBreakdown {
  structuring: number;
  prioritization: number;
  quantitative_reasoning: number;
  synthesis: number;
  communication: number;
  time_management: number;
}

export interface AIFeedbackResult {
  id: string;
  practice_record_id: string | number;
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  missed_points: string[];
  coach_comment: string;
  next_focus: string[];
  skill_breakdown: SkillBreakdown;
  generated_at: string;
}

export interface PracticeCatalog {
  caseQuestions: CaseQuestion[];
  webTestQuestions: WebTestQuestion[];
  learningContent: LearningContent[];
}

export interface PracticeGenerationInput {
  practiceType: PracticeType;
  difficulty: Difficulty;
  language: PracticeLanguage;
  caseType?: CaseQuestionType;
  companyStyle?: CompanyStyle;
  webCategory?: WebTestCategory;
}

export interface PracticeEvaluationInput {
  practiceType: PracticeType;
  questionMeta: CaseQuestion | WebTestQuestion;
  userAnswer: string;
}

export interface PracticePolishInput {
  userAnswer: string;
  targetStyle: 'concise' | 'structured' | 'interviewer_ready';
}
