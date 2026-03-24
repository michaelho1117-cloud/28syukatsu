import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, BrainCircuit, ChevronRight, FileSearch, Target } from 'lucide-react';
import { Card, Badge } from '../components/ui/Card';
import { loadPracticeHubData } from '../features/practice/service';
import { getLessonReflection, saveLessonReflection } from '../features/practice/storage';
import './Practice.css';

const COPY = {
  ja: {
    title: '対策・練習',
    subtitle: 'Learn・Practice・AI Coaching・Library を一つにつないだ、ケース面接と Web テストの訓練ハブです。',
    hub: 'Training Hub',
    layers: ['Learn', 'Practice', 'AI Coaching', 'Library / History'],
    startCase: 'Case 練習を始める',
    startWeb: 'Web テスト練習を始める',
    learn: '基礎を学ぶ',
    mistakes: '弱点を振り返る',
    quickCase: 'Quick Case',
    customCase: 'Custom Case',
    quickWeb: 'Quick Web',
    customWeb: 'Custom Web',
    type: 'ケースタイプ',
    difficulty: '難易度',
    language: '言語',
    firm: 'ファーム傾向',
    category: 'カテゴリ',
    preview: 'プレビュー',
    week: 'This Week Practice Summary',
    feedback: 'Recent AI Feedback Highlights',
    next: 'Recommended Next Practice',
    recentCase: 'Recent Case Practice',
    recentWeb: 'Recent Web Test Practice',
    library: 'Learning Library',
    attempts: '今週の試行数',
    avg: '平均スコア',
    noData: 'まだ練習記録がありません。',
    noFeedback: 'まだ AI フィードバックがありません。',
    noMistakes: '継続的な弱点はまだ検出されていません。',
    noLesson: 'まだ教材がありません。',
    weak: 'Tracked Weaknesses',
    nextFocus: '次の重点',
    read: 'Read lesson',
    exercise: 'Mini exercise',
    reflection: 'Reflection',
    lessonSummary: 'Lesson summary',
    exerciseIntro: 'Mini exercise',
    reflectionIntro: 'Reflection',
    reflectionPlaceholder: 'この教材から、次回の練習前に見返したい気づきを残してください。',
    saveReflection: 'Reflection を保存',
    saved: 'Reflection を保存しました。',
    generated: 'seed catalog',
    open: '教材を見る',
    loading: 'トレーニングハブを読み込んでいます...',
    case: 'Case',
    web: 'Web Test',
    beginner: '基礎固めに向いています。',
    gotoLearn: 'Learn へ',
    gotoMistakes: '弱点を見る',
    reflectionTone: '次回の練習前にこの Reflection を読み返してください。',
  },
  zh: {
    title: '对策・练习',
    subtitle: '把 Learn、Practice、AI Coaching、Library 串成一条训练链，用来系统准备 Case 面试和 Web Test。',
    hub: 'Training Hub',
    layers: ['Learn', 'Practice', 'AI Coaching', 'Library / History'],
    startCase: '开始 Case 练习',
    startWeb: '开始 Web Test 练习',
    learn: '学习基础',
    mistakes: '复盘弱点',
    quickCase: 'Quick Case',
    customCase: 'Custom Case',
    quickWeb: 'Quick Web',
    customWeb: 'Custom Web',
    type: '类型',
    difficulty: '难度',
    language: '语言',
    firm: '公司风格',
    category: '类别',
    preview: '题目预览',
    week: '本周训练概览',
    feedback: '近期 AI 反馈亮点',
    next: '推荐下一步练习',
    recentCase: '近期 Case 练习',
    recentWeb: '近期 Web Test 练习',
    library: '学习资料库',
    attempts: '本周尝试数',
    avg: '平均分',
    noData: '还没有练习记录。',
    noFeedback: '还没有 AI 反馈。',
    noMistakes: '暂时还没有检测到持续弱点。',
    noLesson: '还没有可用教材。',
    weak: '已追踪的弱点',
    nextFocus: '下一步重点',
    read: '阅读 lesson',
    exercise: 'Mini exercise',
    reflection: 'Reflection',
    lessonSummary: 'Lesson 摘要',
    exerciseIntro: '迷你练习',
    reflectionIntro: '反思',
    reflectionPlaceholder: '写下这份教材里最值得你下次练习前回看的一个提醒。',
    saveReflection: '保存 Reflection',
    saved: 'Reflection 已保存。',
    generated: 'seed catalog',
    open: '查看教材',
    loading: '正在加载训练中枢...',
    case: 'Case',
    web: 'Web Test',
    beginner: '适合先打基础。',
    gotoLearn: '前往 Learn',
    gotoMistakes: '查看弱点',
    reflectionTone: '下次练习前先看一眼这条 Reflection。',
  },
  en: {
    title: 'Practice',
    subtitle: 'A training hub that connects Learn, Practice, AI Coaching, and Library for case interviews and web tests.',
    hub: 'Training Hub',
    layers: ['Learn', 'Practice', 'AI Coaching', 'Library / History'],
    startCase: 'Start Case Practice',
    startWeb: 'Start Web Test Practice',
    learn: 'Learn Fundamentals',
    mistakes: 'Review Mistakes',
    quickCase: 'Quick Case',
    customCase: 'Custom Case',
    quickWeb: 'Quick Web',
    customWeb: 'Custom Web',
    type: 'Type',
    difficulty: 'Difficulty',
    language: 'Language',
    firm: 'Firm style',
    category: 'Category',
    preview: 'Preview',
    week: 'This Week Practice Summary',
    feedback: 'Recent AI Feedback Highlights',
    next: 'Recommended Next Practice',
    recentCase: 'Recent Case Practice',
    recentWeb: 'Recent Web Test Practice',
    library: 'Learning Library',
    attempts: 'Weekly attempts',
    avg: 'Average score',
    noData: 'No practice history yet.',
    noFeedback: 'No AI feedback yet.',
    noMistakes: 'No recurring weakness detected yet.',
    noLesson: 'No lesson found.',
    weak: 'Tracked Weaknesses',
    nextFocus: 'Next focus',
    read: 'Read lesson',
    exercise: 'Mini exercise',
    reflection: 'Reflection',
    lessonSummary: 'Lesson summary',
    exerciseIntro: 'Mini exercise',
    reflectionIntro: 'Reflection',
    reflectionPlaceholder: 'Write one practical takeaway for your next drill.',
    saveReflection: 'Save reflection',
    saved: 'Reflection saved.',
    generated: 'seed catalog',
    open: 'Open library',
    loading: 'Loading training hub...',
    case: 'Case',
    web: 'Web Test',
    beginner: 'Recommended for building foundations.',
    gotoLearn: 'Go to Learn',
    gotoMistakes: 'Review mistakes',
    reflectionTone: 'Revisit this reflection before your next attempt.',
  },
};

const getLanguage = () =>
  document.documentElement.lang?.startsWith('zh')
    ? 'zh'
    : document.documentElement.lang?.startsWith('en')
      ? 'en'
      : 'ja';

const formatDate = (value, language) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '--';
  return date.toLocaleDateString(
    language === 'zh' ? 'zh-CN' : language === 'en' ? 'en-US' : 'ja-JP',
    { year: 'numeric', month: '2-digit', day: '2-digit' }
  );
};

const humanizeType = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const buildCaseUrl = (setup) =>
  `/practice/case?${new URLSearchParams({
    mode: 'custom',
    type: setup.caseType,
    difficulty: setup.difficulty,
    language: setup.language,
    companyStyle: setup.companyStyle,
  })}`;

const buildWebUrl = (setup) =>
  `/practice/web-test?${new URLSearchParams({
    mode: 'custom',
    category: setup.webCategory,
    difficulty: setup.difficulty,
    language: setup.language,
  })}`;

export default function Practice() {
  const language = getLanguage();
  const copy = COPY[language];
  const navigate = useNavigate();
  const learnRef = useRef(null);
  const coachingRef = useRef(null);
  const [hub, setHub] = useState(null);
  const [lessonId, setLessonId] = useState('');
  const [learnMode, setLearnMode] = useState('read');
  const [reflectionDraft, setReflectionDraft] = useState('');
  const [reflectionSaved, setReflectionSaved] = useState('');
  const [caseSetup, setCaseSetup] = useState({
    caseType: 'general',
    difficulty: 'medium',
    language: 'en',
    companyStyle: 'general',
  });
  const [webSetup, setWebSetup] = useState({
    webCategory: 'spi',
    difficulty: 'medium',
    language: 'ja',
  });
  const [casePreview, setCasePreview] = useState(null);
  const [webPreview, setWebPreview] = useState(null);

  useEffect(() => {
    loadPracticeHubData().then(setHub).catch(() => setHub(null));
  }, []);

  useEffect(() => {
    if (!hub) return;
    hub.apiActions
      .generateCaseQuestion({
        practiceType: 'case',
        caseType: caseSetup.caseType,
        difficulty: caseSetup.difficulty,
        language: caseSetup.language,
        companyStyle: caseSetup.companyStyle,
      })
      .then((result) => setCasePreview(result.question));
  }, [hub, caseSetup]);

  useEffect(() => {
    if (!hub) return;
    hub.apiActions
      .generateWebTestQuestion({
        practiceType: 'web_test',
        webCategory: webSetup.webCategory,
        difficulty: webSetup.difficulty,
        language: webSetup.language,
      })
      .then((result) => setWebPreview(result.question));
  }, [hub, webSetup]);

  const lesson = useMemo(
    () => hub?.catalog.learningContent.find((item) => item.id === lessonId) || hub?.catalog.learningContent[0] || null,
    [hub, lessonId]
  );

  useEffect(() => {
    if (!lesson?.id) {
      setReflectionDraft('');
      return;
    }
    setReflectionDraft(getLessonReflection(lesson.id));
    setReflectionSaved('');
  }, [lesson?.id]);

  const lessonExercise = useMemo(
    () => (lesson ? lesson.key_takeaways.slice(0, 3).map((item, index) => `${index + 1}. ${item}`) : []),
    [lesson]
  );

  if (!hub) {
    return (
      <div className="page-container practice-page">
        <header className="page-header">
          <div>
            <h1>{copy.title}</h1>
            <p className="subtitle">{copy.subtitle}</p>
          </div>
        </header>
        <Card className="practice-loading-card">
          <p className="text-muted">{copy.loading}</p>
        </Card>
      </div>
    );
  }

  const weeklyTone =
    hub.weeklySummary.total >= 4 ? copy.layers[1] : hub.weeklySummary.total >= 2 ? copy.beginner : copy.noData;

  const handleSaveReflection = () => {
    if (!lesson?.id) return;
    saveLessonReflection(lesson.id, reflectionDraft);
    setReflectionSaved(copy.saved);
    window.setTimeout(() => setReflectionSaved(''), 1400);
  };

  return (
    <div className="page-container practice-page">
      <header className="page-header">
        <div>
          <h1>{copy.title}</h1>
          <p className="subtitle">{copy.subtitle}</p>
        </div>
      </header>

      <section className="practice-hub-top">
        <div className="practice-section-head">
          <div>
            <span className="practice-kicker">{copy.hub}</span>
            <h3>{copy.startCase}</h3>
          </div>
        </div>
        <div className="practice-layer-strip">
          {copy.layers.map((label, index) => (
            <Badge key={label} variant={index === 1 ? 'accent' : index === 2 ? 'secondary' : 'default'}>
              {label}
            </Badge>
          ))}
        </div>

        <div className="practice-actions-grid">
          <Card className="practice-action-shell">
            <div className="practice-action-intro">
              <div className="practice-action-icon">
                <BrainCircuit size={18} />
              </div>
              <div>
                <strong>{copy.startCase}</strong>
                <p>{copy.quickCase}</p>
              </div>
            </div>
            <div className="practice-launch-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  navigate('/practice/case?mode=quick&type=general&difficulty=medium&language=en&companyStyle=general')
                }
              >
                {copy.quickCase}
              </button>
              <button type="button" className="btn-secondary" onClick={() => navigate(buildCaseUrl(caseSetup))}>
                {copy.customCase}
              </button>
            </div>
            <div className="practice-generator-grid">
              <label>
                <span>{copy.type}</span>
                <select
                  className="ui-input"
                  value={caseSetup.caseType}
                  onChange={(e) => setCaseSetup((current) => ({ ...current, caseType: e.target.value }))}
                >
                  <option value="general">General</option>
                  <option value="profitability">Profitability</option>
                  <option value="market_entry">Market Entry</option>
                  <option value="growth_strategy">Growth Strategy</option>
                  <option value="pricing">Pricing</option>
                  <option value="operations">Operations</option>
                  <option value="mna">M&amp;A</option>
                  <option value="new_business">New Business</option>
                </select>
              </label>
              <label>
                <span>{copy.difficulty}</span>
                <select
                  className="ui-input"
                  value={caseSetup.difficulty}
                  onChange={(e) => setCaseSetup((current) => ({ ...current, difficulty: e.target.value }))}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <label>
                <span>{copy.language}</span>
                <select
                  className="ui-input"
                  value={caseSetup.language}
                  onChange={(e) => setCaseSetup((current) => ({ ...current, language: e.target.value }))}
                >
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="zh">中文</option>
                </select>
              </label>
              <label>
                <span>{copy.firm}</span>
                <select
                  className="ui-input"
                  value={caseSetup.companyStyle}
                  onChange={(e) => setCaseSetup((current) => ({ ...current, companyStyle: e.target.value }))}
                >
                  <option value="general">General</option>
                  <option value="strategy_firm">Strategy Firm</option>
                  <option value="big4">Big 4</option>
                  <option value="operations">Operations</option>
                  <option value="fas">FAS</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
            </div>
            {casePreview ? (
              <div className="practice-preview">
                <span className="practice-preview-label">{copy.preview}</span>
                <strong>{casePreview.title}</strong>
                <p>{casePreview.prompt}</p>
                <div className="practice-chip-list">
                  {casePreview.target_skills.slice(0, 4).map((skill) => (
                    <span key={skill} className="practice-chip">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          <Card className="practice-action-shell">
            <div className="practice-action-intro">
              <div className="practice-action-icon">
                <Target size={18} />
              </div>
              <div>
                <strong>{copy.startWeb}</strong>
                <p>{copy.quickWeb}</p>
              </div>
            </div>
            <div className="practice-launch-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/practice/web-test?mode=quick&category=spi&difficulty=medium&language=ja')}
              >
                {copy.quickWeb}
              </button>
              <button type="button" className="btn-secondary" onClick={() => navigate(buildWebUrl(webSetup))}>
                {copy.customWeb}
              </button>
            </div>
            <div className="practice-generator-grid">
              <label>
                <span>{copy.category}</span>
                <select
                  className="ui-input"
                  value={webSetup.webCategory}
                  onChange={(e) => setWebSetup((current) => ({ ...current, webCategory: e.target.value }))}
                >
                  <option value="spi">SPI</option>
                  <option value="numerical">Numerical</option>
                  <option value="logical">Logical</option>
                  <option value="verbal">Verbal</option>
                  <option value="table_reading">Table Reading</option>
                  <option value="tg_web">TG-WEB</option>
                  <option value="general">General</option>
                </select>
              </label>
              <label>
                <span>{copy.difficulty}</span>
                <select
                  className="ui-input"
                  value={webSetup.difficulty}
                  onChange={(e) => setWebSetup((current) => ({ ...current, difficulty: e.target.value }))}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <label>
                <span>{copy.language}</span>
                <select
                  className="ui-input"
                  value={webSetup.language}
                  onChange={(e) => setWebSetup((current) => ({ ...current, language: e.target.value }))}
                >
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                </select>
              </label>
            </div>
            {webPreview ? (
              <div className="practice-preview">
                <span className="practice-preview-label">{copy.preview}</span>
                <strong>{humanizeType(webPreview.subtype)}</strong>
                <p>{webPreview.question}</p>
              </div>
            ) : null}
          </Card>

          <Card className="practice-action-shell compact">
            <div className="practice-action-intro">
              <div className="practice-action-icon">
                <BookOpen size={18} />
              </div>
              <div>
                <strong>{copy.learn}</strong>
                <p>{lesson?.summary || copy.noLesson}</p>
              </div>
            </div>
            <div className="practice-launch-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => learnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                {copy.gotoLearn}
              </button>
            </div>
            <div className="practice-chip-list">
              {(hub.catalog.learningContent || []).slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`practice-chip ${lesson?.id === item.id ? 'active' : ''}`}
                  onClick={() => setLessonId(item.id)}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </Card>

          <Card className="practice-action-shell compact">
            <div className="practice-action-intro">
              <div className="practice-action-icon">
                <FileSearch size={18} />
              </div>
              <div>
                <strong>{copy.mistakes}</strong>
                <p>{hub.mistakeReview.length ? copy.weak : copy.noMistakes}</p>
              </div>
            </div>
            <div className="practice-launch-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => coachingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                {copy.gotoMistakes}
              </button>
            </div>
            <div className="practice-mistake-list">
              {hub.mistakeReview.length ? (
                hub.mistakeReview.slice(0, 4).map((item) => (
                  <div key={item.label} className="practice-mistake-item">
                    <strong>{humanizeType(item.label)}</strong>
                    <span>{item.count}x</span>
                  </div>
                ))
              ) : (
                <p className="text-muted">{copy.noMistakes}</p>
              )}
            </div>
          </Card>
        </div>
      </section>

      <section className="practice-hub-middle" ref={coachingRef}>
        <Card className="practice-summary-card" title={copy.week}>
          <div className="practice-week-metrics">
            <div className="practice-metric-block">
              <span>{copy.attempts}</span>
              <strong>{hub.weeklySummary.total}</strong>
            </div>
            <div className="practice-metric-block">
              <span>{copy.avg}</span>
              <strong>{hub.weeklySummary.avgScore ?? '--'}</strong>
            </div>
            <div className="practice-metric-split">
              <span>
                {copy.case}: {hub.weeklySummary.caseCount}
              </span>
              <span>
                {copy.web}: {hub.weeklySummary.webCount}
              </span>
            </div>
          </div>
          <p className="practice-summary-tone">{weeklyTone}</p>
        </Card>

        <Card className="practice-feedback-card" title={copy.feedback}>
          <div className="practice-feedback-stack">
            {hub.aiFeedback.slice(0, 3).length ? (
              hub.aiFeedback.slice(0, 3).map((item) => (
                <div key={item.id} className="practice-feedback-item">
                  <div className="practice-feedback-top">
                    <strong>{item.overall_score}</strong>
                    <span>{formatDate(item.generated_at, language)}</span>
                  </div>
                  <p>{item.coach_comment}</p>
                  <div className="practice-feedback-tags">
                    {(item.next_focus || []).slice(0, 3).map((focus) => (
                      <span key={focus} className="practice-chip">
                        {focus}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted">{copy.noFeedback}</p>
            )}
          </div>
        </Card>

        <Card className="practice-next-card" title={copy.next}>
          <div className="practice-recommendation-list">
            {hub.recommendations.map((item) => (
              <div key={item.id} className="practice-recommendation-item">
                <div className="practice-recommendation-head">
                  <Badge variant="accent">{item.track}</Badge>
                  <span>{item.difficulty}</span>
                </div>
                <strong>{item.title}</strong>
                <p>{item.reason}</p>
                <div className="practice-recommendation-footer">
                  <span>{copy.nextFocus}</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="practice-hub-lower" ref={learnRef}>
        <div className="practice-history-grid">
          <Card className="practice-section-card" title={copy.recentCase}>
            <div className="practice-history-list">
              {hub.caseRecords.slice(0, 4).length ? (
                hub.caseRecords.slice(0, 4).map((item) => (
                  <div key={item.id} className="practice-history-item">
                    <div className="practice-history-top">
                      <Badge variant="accent">{copy.case}</Badge>
                      <span>{formatDate(item.date, language)}</span>
                    </div>
                    <strong>{item.title}</strong>
                    {item.summary ? <p>{item.summary}</p> : null}
                    <div className="practice-history-bottom">
                      <span>{item.company || '--'}</span>
                      <span>{typeof item.score === 'number' ? item.score : '--'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted">{copy.noData}</p>
              )}
            </div>
          </Card>

          <Card className="practice-section-card" title={copy.recentWeb}>
            <div className="practice-history-list">
              {hub.webRecords.slice(0, 4).length ? (
                hub.webRecords.slice(0, 4).map((item) => (
                  <div key={item.id} className="practice-history-item">
                    <div className="practice-history-top">
                      <Badge variant="secondary">{copy.web}</Badge>
                      <span>{formatDate(item.date, language)}</span>
                    </div>
                    <strong>{item.title}</strong>
                    {item.summary ? <p>{item.summary}</p> : null}
                    <div className="practice-history-bottom">
                      <span>{item.test_type || '--'}</span>
                      <span>{typeof item.score === 'number' ? item.score : '--'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted">{copy.noData}</p>
              )}
            </div>
          </Card>
        </div>

        <div className="practice-library-surface">
          <Card className="practice-library-card" title={copy.library}>
            <div className="practice-learning-grid">
              {hub.catalog.learningContent.slice(0, 6).map((item) => (
                <article key={item.id} className={`practice-learning-item ${lesson?.id === item.id ? 'selected' : ''}`}>
                  <div className="practice-learning-top">
                    <Badge variant="default">{humanizeType(item.category)}</Badge>
                    <span>{copy.generated}</span>
                  </div>
                  <strong>{item.title}</strong>
                  <p>{item.summary}</p>
                  <div className="practice-learning-bottom">
                    {item.related_skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="practice-chip">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="practice-launch-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setLessonId(item.id);
                        setLearnMode('read');
                      }}
                    >
                      {copy.open}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </Card>

          <Card className="practice-library-card lesson-detail" title={lesson?.title || copy.noLesson}>
            {lesson ? (
              <div className="practice-lesson-detail">
                <div className="practice-launch-actions">
                  <button
                    type="button"
                    className={`btn-secondary ${learnMode === 'read' ? 'selected' : ''}`}
                    onClick={() => setLearnMode('read')}
                  >
                    {copy.read}
                  </button>
                  <button
                    type="button"
                    className={`btn-secondary ${learnMode === 'exercise' ? 'selected' : ''}`}
                    onClick={() => setLearnMode('exercise')}
                  >
                    {copy.exercise}
                  </button>
                  <button
                    type="button"
                    className={`btn-secondary ${learnMode === 'reflection' ? 'selected' : ''}`}
                    onClick={() => setLearnMode('reflection')}
                  >
                    {copy.reflection}
                  </button>
                </div>

                {learnMode === 'read' ? (
                  <div className="practice-preview">
                    <span className="practice-preview-label">{copy.lessonSummary}</span>
                    <p>{lesson.content}</p>
                  </div>
                ) : null}

                {learnMode === 'exercise' ? (
                  <div className="practice-preview">
                    <span className="practice-preview-label">{copy.exerciseIntro}</span>
                    <strong>{lesson.title}</strong>
                    <ul className="practice-lesson-list">
                      {lessonExercise.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {learnMode === 'reflection' ? (
                  <div className="practice-preview">
                    <span className="practice-preview-label">{copy.reflectionIntro}</span>
                    <textarea
                      className="ui-textarea practice-reflection-textarea"
                      value={reflectionDraft}
                      onChange={(e) => setReflectionDraft(e.target.value)}
                      placeholder={copy.reflectionPlaceholder}
                    />
                    <div className="practice-session-actions">
                      <button type="button" className="btn-primary" onClick={handleSaveReflection}>
                        {copy.saveReflection}
                      </button>
                    </div>
                    {reflectionSaved ? <p className="practice-session-message">{reflectionSaved}</p> : null}
                    <p className="practice-summary-tone">{copy.reflectionTone}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-muted">{copy.noLesson}</p>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
