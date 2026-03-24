import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock3, RotateCcw, Target } from 'lucide-react';
import { Card, Badge } from '../components/ui/Card';
import { checkWebTestAnswer, generateWebTestQuestion, submitWebTestAttempt } from '../features/practice/service';
import './PracticeSession.css';

const COPY = {
  ja: {
    back: '対策・練習に戻る',
    title: 'Webテスト練習',
    prompt: '問題',
    timer: 'タイマー',
    submit: '解答を提出',
    nextQuestion: '次の問題へ',
    result: '結果',
    correct: '正解',
    incorrect: '不正解',
    solution: '解説',
    traps: 'よくある落とし穴',
    score: 'スコア',
    strengths: '良かった点',
    weaknesses: '弱かった点',
    nextFocus: '次に強化すること',
    loading: '問題を準備しています...',
  },
  zh: {
    back: '返回 Practice',
    title: 'Web Test 练习',
    prompt: '题目',
    timer: '计时器',
    submit: '提交答案',
    nextQuestion: '下一题',
    result: '结果',
    correct: '正确',
    incorrect: '错误',
    solution: '解析',
    traps: '常见陷阱',
    score: '得分',
    strengths: '优点',
    weaknesses: '薄弱点',
    nextFocus: '下一步重点',
    loading: '正在准备题目...',
  },
  en: {
    back: 'Back to Practice',
    title: 'Web Test Practice',
    prompt: 'Question',
    timer: 'Timer',
    submit: 'Submit answer',
    nextQuestion: 'Next question',
    result: 'Result',
    correct: 'Correct',
    incorrect: 'Incorrect',
    solution: 'Solution',
    traps: 'Common traps',
    score: 'Score',
    strengths: 'Strengths',
    weaknesses: 'Weaknesses',
    nextFocus: 'Next focus',
    loading: 'Preparing question...',
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

export default function PracticeWebTestSession() {
  const language = getLanguage();
  const copy = COPY[language];
  const navigate = useNavigate();
  const query = useQuery();
  const [question, setQuestion] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState('');
  const [timer, setTimer] = useState(60);
  const [result, setResult] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  const setup = useMemo(
    () => ({
      practiceType: 'web_test',
      webCategory: query.get('category') || 'spi',
      difficulty: query.get('difficulty') || 'medium',
      language: query.get('language') || 'ja',
    }),
    [query]
  );

  const loadQuestion = async () => {
    setLoading(true);
    const response = await generateWebTestQuestion(setup);
    setQuestion(response.question);
    setTimer(response.question?.time_recommendation_sec || 60);
    setSelectedChoice('');
    setResult(null);
    setFeedback(null);
    setLoading(false);
  };

  useEffect(() => {
    loadQuestion();
  }, [setup.difficulty, setup.language, setup.webCategory]);

  useEffect(() => {
    if (!question || result) return undefined;
    const interval = window.setInterval(() => {
      setTimer((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [question, result]);

  const handleSubmit = async () => {
    if (!question || !selectedChoice) return;
    const checked = checkWebTestAnswer({
      question,
      selectedChoice,
      timeSpentSec: (question.time_recommendation_sec || 60) - timer,
    });
    const saved = await submitWebTestAttempt({
      question,
      selectedChoice,
      correct: checked.correct,
      timeSpentSec: checked.timeSpentSec,
    });
    setResult(checked);
    setFeedback(saved.feedback || null);
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
          <p className="subtitle">{question.subtype}</p>
        </div>
      </header>

      <section className="practice-session-grid single">
        <Card className="practice-prompt-card">
          <div className="practice-prompt-head">
            <div>
              <span className="practice-session-kicker">{copy.prompt}</span>
              <h3>{question.question}</h3>
            </div>
            <div className="practice-timer-chip">
              <Clock3 size={16} />
              <strong>{formatTimer(timer)}</strong>
            </div>
          </div>

          <div className="practice-choice-list">
            {question.choices.map((choice) => {
              const choiceKey = choice.split('.')[0];
              return (
                <button
                  key={choice}
                  type="button"
                  className={`practice-choice ${selectedChoice === choiceKey ? 'selected' : ''}`}
                  onClick={() => setSelectedChoice(choiceKey)}
                  disabled={Boolean(result)}
                >
                  <span className="practice-choice-key">{choiceKey}</span>
                  <span>{choice}</span>
                </button>
              );
            })}
          </div>

          <div className="practice-session-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={!selectedChoice || Boolean(result)}
              onClick={handleSubmit}
            >
              <Target size={16} />
              <span>{copy.submit}</span>
            </button>
            {result ? (
              <button type="button" className="btn-secondary" onClick={loadQuestion}>
                <RotateCcw size={16} />
                <span>{copy.nextQuestion}</span>
              </button>
            ) : null}
          </div>
        </Card>

        {result ? (
          <Card className="practice-feedback-detail-card">
            <div className="practice-feedback-detail-head">
              <div>
                <span className="practice-session-kicker">{copy.result}</span>
                <strong>{result.correct ? copy.correct : copy.incorrect}</strong>
              </div>
              <Badge variant={result.correct ? 'success' : 'warning'}>
                <CheckCircle2 size={14} />
                {result.correctAnswer}
              </Badge>
            </div>

            <div className="practice-feedback-detail-grid single">
              <div>
                <h4>{copy.solution}</h4>
                <p>{result.solution}</p>
              </div>
              <div>
                <h4>{copy.traps}</h4>
                <ul>{(result.commonTraps || []).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>

            {feedback ? (
              <>
                <div className="practice-feedback-detail-head">
                  <div>
                    <span className="practice-session-kicker">{copy.score}</span>
                    <strong>{feedback.overall_score}</strong>
                  </div>
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
              </>
            ) : null}
          </Card>
        ) : null}
      </section>
    </div>
  );
}
