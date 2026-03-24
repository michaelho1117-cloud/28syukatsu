import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, Clock3, RotateCcw, Sparkles } from 'lucide-react';
import { Card, Badge } from '../components/ui/Card';
import {
  evaluateCaseAnswer,
  generateCaseQuestion,
  polishPracticeAnswer,
  submitCasePracticeAttempt,
} from '../features/practice/service';
import './PracticeSession.css';

const COPY = {
  ja: {
    back: '対策・練習に戻る',
    title: 'Case Practice',
    clientContext: 'Client context',
    problemStatement: 'Problem statement',
    expectedStructure: 'Expected structure',
    followUps: 'Follow-up questions',
    timer: 'Timer',
    structure: 'Structure',
    hypotheses: 'Hypotheses',
    nextAnalysis: 'Next analysis',
    submit: '提出して評価',
    polishing: 'AIで整え中...',
    polish: 'AIで整える',
    applyPolish: 'この版を反映',
    dismissPolish: '元の回答を続ける',
    score: 'Score',
    strengths: 'Strengths',
    weaknesses: 'Weaknesses',
    nextFocus: 'Next focus',
    retry: '別の問題で続ける',
    complete: '今回の練習を保存しました。',
    loading: 'ケース問題を準備しています...',
    submitError: '回答の評価に失敗しました。',
    timeUp: '時間が来たので、結論を短くまとめて提出してください。',
  },
  zh: {
    back: '返回 Practice',
    title: 'Case Practice',
    clientContext: 'Client context',
    problemStatement: 'Problem statement',
    expectedStructure: 'Expected structure',
    followUps: 'Follow-up questions',
    timer: '计时器',
    structure: 'Structure',
    hypotheses: 'Hypotheses',
    nextAnalysis: 'Next analysis',
    submit: '提交并评估',
    polishing: 'AI 润色中...',
    polish: 'AI 润色答案',
    applyPolish: '采用这版',
    dismissPolish: '保留原文',
    score: '得分',
    strengths: '优点',
    weaknesses: '薄弱点',
    nextFocus: '下一步重点',
    retry: '换一题继续',
    complete: '本次练习已保存。',
    loading: '正在准备 Case 题目...',
    submitError: '提交评估失败。',
    timeUp: '时间到了，建议先收束结论再提交。',
  },
  en: {
    back: 'Back to Practice',
    title: 'Case Practice',
    clientContext: 'Client context',
    problemStatement: 'Problem statement',
    expectedStructure: 'Expected structure',
    followUps: 'Follow-up questions',
    timer: 'Timer',
    structure: 'Structure',
    hypotheses: 'Hypotheses',
    nextAnalysis: 'Next analysis',
    submit: 'Submit for feedback',
    polishing: 'Polishing with AI...',
    polish: 'Polish with AI',
    applyPolish: 'Use polished version',
    dismissPolish: 'Keep original',
    score: 'Score',
    strengths: 'Strengths',
    weaknesses: 'Weaknesses',
    nextFocus: 'Next focus',
    retry: 'Try another case',
    complete: 'This attempt has been saved.',
    loading: 'Preparing your case prompt...',
    submitError: 'Failed to evaluate your answer.',
    timeUp: 'Time is up. Wrap your recommendation and submit.',
  },
};

const getLanguage = () =>
  document.documentElement.lang?.startsWith('zh')
    ? 'zh'
    : document.documentElement.lang?.startsWith('en')
      ? 'en'
      : 'ja';

const useQuery = () => new URLSearchParams(useLocation().search);
const formatTimer = (totalSeconds) =>
  `${String(Math.floor(Math.max(totalSeconds, 0) / 60)).padStart(2, '0')}:${String(
    Math.max(totalSeconds, 0) % 60
  ).padStart(2, '0')}`;

const buildAnswerText = (answer) =>
  [`Structure\n${answer.structure || ''}`, `Hypotheses\n${answer.hypotheses || ''}`, `Next analysis\n${answer.next_analysis || ''}`]
    .join('\n\n')
    .trim();

export default function PracticeCaseSession() {
  const language = getLanguage();
  const copy = COPY[language];
  const navigate = useNavigate();
  const query = useQuery();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [message, setMessage] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const [feedback, setFeedback] = useState(null);
  const [polishedText, setPolishedText] = useState('');
  const [sessionKey, setSessionKey] = useState(0);
  const [answer, setAnswer] = useState({ structure: '', hypotheses: '', next_analysis: '' });

  const setup = useMemo(
    () => ({
      practiceType: 'case',
      caseType: query.get('type') || 'general',
      difficulty: query.get('difficulty') || 'medium',
      language: query.get('language') || 'en',
      companyStyle: query.get('companyStyle') || 'general',
    }),
    [query]
  );

  const loadQuestion = async () => {
    setLoading(true);
    const result = await generateCaseQuestion(setup);
    setQuestion(result.question);
    setSecondsLeft(20 * 60);
    setFeedback(null);
    setPolishedText('');
    setAnswer({ structure: '', hypotheses: '', next_analysis: '' });
    setMessage('');
    setLoading(false);
  };

  useEffect(() => {
    loadQuestion().catch(() => setLoading(false));
  }, [setup.caseType, setup.companyStyle, setup.difficulty, setup.language, sessionKey]);

  useEffect(() => {
    if (!question || feedback) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setMessage(copy.timeUp);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [question, feedback, copy.timeUp]);

  const answerText = useMemo(() => buildAnswerText(answer), [answer]);

  const handleSubmit = async () => {
    if (!question || !answerText.replace(/[\s\n]/g, '')) return;
    try {
      setSubmitting(true);
      const result = await evaluateCaseAnswer({ question_meta: question, user_answer: answer });
      const savedRecord = await submitCasePracticeAttempt({
        question,
        durationMin: Math.max(1, Math.round((20 * 60 - secondsLeft) / 60)),
        answerFields: answer,
        summary: `Completed ${question.title}`,
        feedback: result.feedback,
      });
      setFeedback({ ...result.feedback, practice_record_id: savedRecord.id });
      setMessage(copy.complete);
    } catch {
      setMessage(copy.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePolish = async () => {
    if (!question || !answerText.replace(/[\s\n]/g, '')) return;
    try {
      setPolishing(true);
      const result = await polishPracticeAnswer({
        practice_type: 'case',
        question_meta: question,
        user_answer: answerText,
        target_style: 'structured',
      });
      setPolishedText(result.polished_text || '');
    } finally {
      setPolishing(false);
    }
  };

  const handleApplyPolish = () => {
    if (!polishedText.trim()) return;
    const sections = polishedText.split(/\n\s*\n/);
    setAnswer({
      structure: sections[0] || polishedText,
      hypotheses: sections[1] || '',
      next_analysis: sections[2] || '',
    });
    setPolishedText('');
  };

  if (loading || !question) {
    return (
      <div className="page-container practice-session-page">
        <header className="page-header">
          <button
            type="button"
            className="btn-secondary practice-session-back"
            onClick={() => navigate('/practice')}
          >
            <ArrowLeft size={16} />
            <span>{copy.back}</span>
          </button>
          <div>
            <h1>{copy.title}</h1>
            <p className="subtitle">{copy.loading}</p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="page-container practice-session-page">
      <header className="page-header">
        <button
          type="button"
          className="btn-secondary practice-session-back"
          onClick={() => navigate('/practice')}
        >
          <ArrowLeft size={16} />
          <span>{copy.back}</span>
        </button>
        <div>
          <h1>{copy.title}</h1>
          <p className="subtitle">{question.title}</p>
        </div>
      </header>

      <section className="practice-session-grid">
        <Card className="practice-prompt-card">
          <div className="practice-prompt-head">
            <div>
              <span className="practice-session-kicker">{copy.clientContext}</span>
              <h3>{question.title}</h3>
            </div>
            <div className="practice-timer-chip">
              <Clock3 size={16} />
              <strong>{formatTimer(secondsLeft)}</strong>
            </div>
          </div>
          <div className="practice-prompt-block">
            <span>{copy.problemStatement}</span>
            <p>{question.prompt}</p>
          </div>
          <div className="practice-prompt-columns">
            <div className="practice-prompt-block">
              <span>{copy.expectedStructure}</span>
              <ul>{(question.expected_structure || []).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="practice-prompt-block">
              <span>{copy.followUps}</span>
              <ul>{(question.follow_up_questions || []).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </Card>

        <Card className="practice-answer-card">
          <div className="practice-answer-head">
            <div>
              <span className="practice-session-kicker">{copy.timer}</span>
              <strong>{question.company_style}</strong>
            </div>
            <Badge variant="accent">
              <BrainCircuit size={14} />
              {question.difficulty}
            </Badge>
          </div>
          <div className="practice-answer-fields">
            <label>
              <span>{copy.structure}</span>
              <textarea
                className="ui-textarea practice-answer-textarea"
                value={answer.structure}
                onChange={(e) => setAnswer((current) => ({ ...current, structure: e.target.value }))}
              />
            </label>
            <label>
              <span>{copy.hypotheses}</span>
              <textarea
                className="ui-textarea practice-answer-textarea"
                value={answer.hypotheses}
                onChange={(e) => setAnswer((current) => ({ ...current, hypotheses: e.target.value }))}
              />
            </label>
            <label>
              <span>{copy.nextAnalysis}</span>
              <textarea
                className="ui-textarea practice-answer-textarea"
                value={answer.next_analysis}
                onChange={(e) => setAnswer((current) => ({ ...current, next_analysis: e.target.value }))}
              />
            </label>
          </div>
          <div className="practice-session-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handlePolish}
              disabled={polishing || !answerText}
            >
              <Sparkles size={16} />
              <span>{polishing ? copy.polishing : copy.polish}</span>
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={submitting || !answerText}
            >
              <span>{copy.submit}</span>
            </button>
          </div>
          {polishedText ? (
            <div className="practice-polish-panel">
              <strong>{copy.polish}</strong>
              <pre>{polishedText}</pre>
              <div className="practice-session-actions">
                <button type="button" className="btn-primary" onClick={handleApplyPolish}>
                  {copy.applyPolish}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setPolishedText('')}>
                  {copy.dismissPolish}
                </button>
              </div>
            </div>
          ) : null}
          {message ? <p className="practice-session-message">{message}</p> : null}
        </Card>
      </section>

      {feedback ? (
        <Card className="practice-feedback-detail-card">
          <div className="practice-feedback-detail-head">
            <div>
              <span className="practice-session-kicker">{copy.score}</span>
              <strong>{feedback.overall_score}</strong>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setSessionKey((value) => value + 1)}>
              <RotateCcw size={16} />
              <span>{copy.retry}</span>
            </button>
          </div>
          <p className="practice-feedback-comment">{feedback.coach_comment}</p>
          <div className="practice-feedback-detail-grid">
            <div>
              <h4>{copy.strengths}</h4>
              <ul>{(feedback.strengths || []).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <h4>{copy.weaknesses}</h4>
              <ul>{(feedback.weaknesses || []).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <h4>{copy.nextFocus}</h4>
              <ul>{(feedback.next_focus || []).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
