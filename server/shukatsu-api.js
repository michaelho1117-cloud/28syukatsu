/* global process */
import express from 'express'
import cors from 'cors'
import db, { APP_STATUS } from './shukatsu-db.js'
import { generateGeminiJson, getGeminiRuntimeInfo } from './gemini.js'

const app = express()
const PORT = process.env.SHUKATSU_API_PORT || 8789

const RESEARCH_NOTE_TYPES = [
  'company_overview',
  'event_note',
  'selection_prep',
  'decision_material',
  'industry_research'
]

const RESEARCH_SOURCE_TYPES = [
  'verified',
  'ai_generated'
]

app.use(cors())
app.use(express.json({ limit: '1mb' }))

const sql = {
  companyList: db.prepare(`
    SELECT * FROM Company
    WHERE (
      name LIKE @q
      OR IFNULL(canonical_name_en, '') LIKE @q
      OR IFNULL(aliases, '') LIKE @q
    )
      AND (@minEmployees <= 0 OR IFNULL(employees, 0) >= @minEmployees)
      AND (@targetOnly = 0 OR IFNULL(is_target, 1) = 1)
    ORDER BY name
  `),
  companyById: db.prepare('SELECT * FROM Company WHERE id = ?'),
  companyInsert: db.prepare(`
    INSERT INTO Company (
      name, industry, employees, website, openwork_score, webtest_type, case_style, notes,
      source_tags, ranking_note, openwork_url, gaishi_url, recruit_url, recruit_status, recruit_deadline, is_target
    )
    VALUES (
      @name, @industry, @employees, @website, @openwork_score, @webtest_type, @case_style, @notes,
      @source_tags, @ranking_note, @openwork_url, @gaishi_url, @recruit_url, @recruit_status, @recruit_deadline, @is_target
    )
  `),
  companyRecruitUpdate: db.prepare(`
    UPDATE Company
    SET recruit_url = @recruit_url,
        recruit_status = @recruit_status,
        recruit_deadline = @recruit_deadline,
        notes = @notes
    WHERE id = @id
  `),
  companyMetaUpdate: db.prepare(`
    UPDATE Company
    SET source_tags = @source_tags,
        ranking_note = @ranking_note,
        openwork_url = @openwork_url,
        gaishi_url = @gaishi_url,
        is_target = @is_target
    WHERE id = @id
  `),
  companyFullUpdate: db.prepare(`
    UPDATE Company
    SET name = @name,
        canonical_name_en = @canonical_name_en,
        aliases = @aliases,
        industry = @industry,
        category = @category,
        employees = @employees,
        website = @website,
        notes = @notes,
        recruit_url = @recruit_url,
        recruit_status = @recruit_status,
        recruit_deadline = @recruit_deadline,
        source_tags = @source_tags,
        ranking_note = @ranking_note,
        openwork_url = @openwork_url,
        gaishi_url = @gaishi_url,
        is_target = @is_target
    WHERE id = @id
  `),
  companyDelete: db.prepare('DELETE FROM Company WHERE id = ?'),
  companyExistsByName: db.prepare('SELECT id FROM Company WHERE name = ?'),
  companyUpsertCanonical: db.prepare(`
    INSERT INTO Company (
      name, canonical_name_en, aliases, origin_type, category, main_services, confidence,
      industry, employees, website, notes, source_tags, ranking_note, recruit_url, openwork_url, gaishi_url, is_target
    )
    VALUES (
      @name, @canonical_name_en, @aliases, @origin_type, @category, @main_services, @confidence,
      @industry, @employees, @website, @notes, @source_tags, @ranking_note, @recruit_url, @openwork_url, @gaishi_url, @is_target
    )
    ON CONFLICT(name) DO UPDATE SET
      canonical_name_en = excluded.canonical_name_en,
      aliases = excluded.aliases,
      origin_type = excluded.origin_type,
      category = excluded.category,
      main_services = excluded.main_services,
      confidence = excluded.confidence,
      industry = excluded.industry,
      employees = COALESCE(excluded.employees, Company.employees),
      website = COALESCE(NULLIF(excluded.website, ''), Company.website),
      notes = COALESCE(NULLIF(excluded.notes, ''), Company.notes),
      source_tags = COALESCE(NULLIF(excluded.source_tags, ''), Company.source_tags),
      ranking_note = COALESCE(NULLIF(excluded.ranking_note, ''), Company.ranking_note),
      recruit_url = COALESCE(NULLIF(excluded.recruit_url, ''), Company.recruit_url),
      openwork_url = COALESCE(NULLIF(excluded.openwork_url, ''), Company.openwork_url),
      gaishi_url = COALESCE(NULLIF(excluded.gaishi_url, ''), Company.gaishi_url),
      is_target = excluded.is_target
  `),
  companyOpenworkUpdate: db.prepare(`
    UPDATE Company
    SET openwork_url = @openwork_url,
        openwork_score = @openwork_score,
        openwork_avg_salary = @openwork_avg_salary,
        openwork_employee_count = @openwork_employee_count
    WHERE id = @id
  `),

  appList: db.prepare(`
    SELECT a.*, c.name AS company_name
    FROM Application a JOIN Company c ON c.id = a.company_id
    ORDER BY a.deadline IS NULL, a.deadline
  `),
  appInsert: db.prepare(`
    INSERT INTO Application (company_id, position, status, deadline, next_step, memo)
    VALUES (@company_id, @position, @status, @deadline, @next_step, @memo)
  `),
  appStatusUpdate: db.prepare('UPDATE Application SET status = ?, next_step = ? WHERE id = ?'),

  noteList: db.prepare(`
    SELECT n.*, c.name AS company_name
    FROM ResearchNote n JOIN Company c ON c.id = n.company_id
    ORDER BY n.created_at DESC
  `),
  noteInsert: db.prepare('INSERT INTO ResearchNote (company_id, title, content) VALUES (@company_id, @title, @content)'),
  researchAssetList: db.prepare(`
    SELECT *
    FROM CompanyResearchAsset
    WHERE company_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `),
  researchAssetLibraryList: db.prepare(`
    SELECT
      a.*,
      c.name AS company_name,
      IFNULL(c.canonical_name_en, '') AS company_name_en
    FROM CompanyResearchAsset a
    JOIN Company c ON c.id = a.company_id
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT 300
  `),
  researchAssetById: db.prepare(`
    SELECT
      a.*,
      c.name AS company_name,
      IFNULL(c.canonical_name_en, '') AS company_name_en
    FROM CompanyResearchAsset a
    JOIN Company c ON c.id = a.company_id
    WHERE a.id = ?
  `),
  researchAssetInsert: db.prepare(`
    INSERT INTO CompanyResearchAsset (company_id, note_type, source_type, source_url, title, content, tags, reliability)
    VALUES (@company_id, @note_type, @source_type, @source_url, @title, @content, @tags, @reliability)
  `),
  researchAssetUpdate: db.prepare(`
    UPDATE CompanyResearchAsset
    SET title = @title,
        content = @content,
        note_type = @note_type,
        source_type = @source_type
    WHERE id = @id
  `),
  researchAssetDelete: db.prepare(`
    DELETE FROM CompanyResearchAsset
    WHERE id = ?
  `),
  ruleOutputInsert: db.prepare(`
    INSERT INTO CompanyRuleOutput (company_id, output_type, content)
    VALUES (@company_id, @output_type, @content)
  `),
  ruleOutputList: db.prepare(`
    SELECT *
    FROM CompanyRuleOutput
    WHERE company_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `),
  researchOverview: db.prepare(`
    SELECT
      c.id,
      c.name,
      c.industry,
      c.is_target,
      IFNULL(c.recruit_status, '') AS recruit_status,
      COUNT(a.id) AS assets_count,
      MAX(a.created_at) AS last_asset_at,
      COUNT(r.id) AS rule_output_count,
      MAX(r.created_at) AS last_rule_at
    FROM Company c
    LEFT JOIN CompanyResearchAsset a ON a.company_id = c.id
    LEFT JOIN CompanyRuleOutput r ON r.company_id = c.id
    GROUP BY c.id
    ORDER BY assets_count ASC, c.name ASC
  `),

  taskList: db.prepare(`
    SELECT t.*, c.name AS company_name
    FROM Task t LEFT JOIN Company c ON c.id = t.company_id
    ORDER BY t.deadline IS NULL, t.deadline
  `),
  taskInsert: db.prepare('INSERT INTO Task (title, company_id, deadline, status, priority) VALUES (@title, @company_id, @deadline, @status, @priority)'),
  taskToggle: db.prepare("UPDATE Task SET status = CASE WHEN status = 'done' THEN 'todo' ELSE 'done' END WHERE id = ?"),

  caseList: db.prepare('SELECT * FROM CasePractice ORDER BY date DESC'),
  caseInsert: db.prepare(`
    INSERT INTO CasePractice (date, company, case_question, user_answer, ai_feedback, score, summary)
    VALUES (@date, @company, @case_question, @user_answer, @ai_feedback, @score, @summary)
  `),

  webList: db.prepare('SELECT * FROM WebTestPractice ORDER BY date DESC'),
  webInsert: db.prepare('INSERT INTO WebTestPractice (date, test_type, score, time_spent) VALUES (@date, @test_type, @score, @time_spent)'),

  dashTaskOpen: db.prepare("SELECT COUNT(*) AS c FROM Task WHERE status != 'done'"),
  dashDeadlines: db.prepare(`
    SELECT a.id, c.name AS company_name, a.position, a.deadline
    FROM Application a JOIN Company c ON c.id = a.company_id
    WHERE a.deadline IS NOT NULL
    ORDER BY a.deadline
    LIMIT 5
  `),
  dashAppProgress: db.prepare('SELECT status, COUNT(*) AS count FROM Application GROUP BY status'),
  dashRecentCase: db.prepare('SELECT date, company, score, summary FROM CasePractice ORDER BY date DESC LIMIT 5'),

  // Account management
  accountList: db.prepare('SELECT * FROM Account ORDER BY company_name'),
  accountInsert: db.prepare(`
    INSERT INTO Account (company_name, login_url, login_id, password)
    VALUES (@company_name, @login_url, @login_id, @password)
  `),
  accountUpdate: db.prepare(`
    UPDATE Account 
    SET company_name = @company_name, 
        login_url = @login_url, 
        login_id = @login_id, 
        password = @password 
    WHERE id = @id
  `),
  accountDelete: db.prepare('DELETE FROM Account WHERE id = ?'),
}

const companyUniverseSeed = [
  ['PwC Japan Group', 12000, 'top50,openwork,gaishi', 'Tier1/Tier2 frequent mention'],
  ['アクセンチュア', 2000, 'top50,openwork,gaishi', 'Large scale digital + strategy'],
  ['Deloitte Tohmatsu Consulting', 5000, 'top50,openwork,gaishi', 'Deloitte group key unit'],
  ['Deloitte Tohmatsu Financial Advisory', 1800, 'top50,gaishi', 'FA-focused track'],
  ['KPMG Consulting', 6000, 'top50,openwork,gaishi', 'Risk/GRC strong'],
  ['EY Strategy and Consulting', 7000, 'top50,openwork,gaishi', 'SC + strategy blend'],
  ['A.T. Kearney Japan', 800, 'top50,openwork,gaishi', 'Strategy boutique'],
  ['Roland Berger Japan', 400, 'top50,openwork,gaishi', 'European strategy house'],
  ['ベイン・アンド・カンパニー', 1200, 'top50,gaishi', 'Case-heavy selective hiring'],
  ['ボストン コンサルティング グループ', 2000, 'top50,gaishi', 'Top strategy focus'],
  ['McKinsey Tokyo', 1200, 'top50,gaishi', 'Top strategy focus'],
  ['Arthur D. Little Japan', 250, 'top50,openwork', 'Tech/industry strategy'],
  ['ZS Associates Japan', 300, 'top50,openwork', 'Analytics/healthcare'],
  ['NRI', 16000, 'top50,openwork,gaishi', 'Japan major consulting/IT'],
  ['Nomura Research Institute Consulting', 2500, 'top50,openwork', 'Domestic strategy + DX'],
  ['SIGMAXYZ', 900, 'top50,openwork', 'Digital consulting'],
  ['BayCurrent Consulting', 3500, 'top50,openwork,gaishi', 'High growth domestic'],
  ['ABeam Consulting', 8300, 'top50,openwork,gaishi', 'SAP/operations strong'],
  ['Dirbato', 1100, 'top50,openwork', 'Rapid growth IT consulting'],
  ['QUNIE', 1000, 'top50,openwork', 'NTT data group consulting'],
  ['Future Architect', 2600, 'top50,openwork', 'IT strategy + engineering'],
  ['IBM Consulting Japan', 15000, 'top50,openwork,gaishi', 'Enterprise transformation'],
  ['Capgemini Japan', 1200, 'top50,openwork,gaishi', 'Global SI + consulting'],
  ['Slalom Japan', 220, 'top50,openwork', 'Cloud transformation'],
  ['BearingPoint Japan', 500, 'top50,openwork', 'Europe-origin consulting'],
  ['Mitsubishi UFJ Research and Consulting', 3200, 'top50,openwork', 'Think tank + consulting'],
  ['Mizuho Research and Technologies', 4500, 'top50,openwork', 'Finance + IT consulting'],
  ['NOMURA Securities IB/Advisory', 3000, 'top50,gaishi', 'IB advisory track'],
  ['SMBC Nikko Securities IB', 1400, 'top50,gaishi', 'IB advisory track'],
  ['Daiwa Securities IB', 1200, 'top50,gaishi', 'IB advisory track'],
]

function toShortBullets(text = '', max = 3) {
  if (!text) return []
  return String(text)
    .split(/\r?\n|。|\.|;|；/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max)
}

function normalizeCompanyText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '')
    .replace(/[()（）・／/,&，、\-.]/g, '')
}

function buildCompanyResolverRows() {
  return db
    .prepare('SELECT id, name, IFNULL(canonical_name_en, \'\') AS canonical_name_en, IFNULL(aliases, \'\') AS aliases FROM Company ORDER BY name')
    .all()
}

function resolveCompanyFromText(input = '', companies = []) {
  const haystack = normalizeCompanyText(input)
  if (!haystack) return { company_id: null, company_name_raw: '' }

  for (const company of companies) {
    const candidates = [
      company.name,
      company.canonical_name_en,
      ...String(company.aliases || '').split('|'),
    ]
      .map((item) => String(item || '').trim())
      .filter(Boolean)

    for (const candidate of candidates) {
      const normalized = normalizeCompanyText(candidate)
      if (normalized && haystack.includes(normalized)) {
        return {
          company_id: company.id || null,
          company_name_raw: company.name || candidate,
        }
      }
    }
  }

  return { company_id: null, company_name_raw: '' }
}

function parseIsoDate(value = '') {
  const text = String(value || '').trim()
  if (!text) return ''
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function generateRulePack(company, assets = []) {
  const topAssets = assets.slice(0, 5)
  const themes = []
  const snippets = []
  for (const a of topAssets) {
    themes.push(...toShortBullets(a.title, 1))
    snippets.push(...toShortBullets(a.content, 2))
  }
  const uniqueThemes = [...new Set(themes)].slice(0, 4)
  const uniqueSnippets = [...new Set(snippets)].slice(0, 6)

  const esOutline = [
    `1) 志望動機: ${company.name} を志望する理由（事業特性・自分の経験の接点）`,
    `2) 会社理解: ${company.industry || 'Consulting'} 領域での関心テーマ`,
    `3) 強み訴求: 再現性のある強み（構造化/実行力/巻き込み）`,
    `4) 入社後: 3年で担いたい役割と貢献イメージ`,
    uniqueThemes.length ? `5) 重点論点: ${uniqueThemes.join(' / ')}` : '5) 重点論点: 最新の募集・業務理解を反映'
  ]

  const interviewQuestions = [
    `なぜ ${company.name} なのか（同業他社との違いも含めて）`,
    '学生時代に最も成果を出した経験を、課題→行動→結果で説明してください',
    'チームで意見が割れた時にどう意思決定したか',
    company.webtest_type ? `${company.webtest_type} 対策の進捗と改善計画` : 'Web Test 対策の進捗と改善計画',
    company.case_style ? `${company.case_style} に近いケースでの思考プロセス` : 'ケース面接での思考プロセス',
  ]

  const followUps = [
    'その判断の根拠データは何か',
    '別解は何か、なぜ今回は選ばなかったか',
    '明日から何を1つ変えるか'
  ]

  return {
    esOutline,
    interviewPack: {
      questions: interviewQuestions,
      followUps,
      sourceHighlights: uniqueSnippets
    }
  }
}

function parseCsvRows(csvText = '') {
  const text = String(csvText || '').replace(/\r\n/g, '\n').trim()
  if (!text) return []
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    const next = text[i + 1]
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      row.push(cell)
      cell = ''
      continue
    }
    if (ch === '\n' && !inQuotes) {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }
    cell += ch
  }
  row.push(cell)
  rows.push(row)
  return rows
}

function employeeBandToCount(band = '') {
  const b = String(band || '').trim()
  if (b === '1-99') return 99
  if (b === '100-499') return 300
  if (b === '500-1999') return 1200
  if (b === '2000+') return 2000
  return null
}

function extractOpenworkUrl(sourceUrls = '') {
  const urls = String(sourceUrls || '').split('|').map((x) => x.trim()).filter(Boolean)
  const hit = urls.find((u) => /openwork\.jp/i.test(u))
  return hit || ''
}

function extractGaishiUrl(sourceUrls = '') {
  const urls = String(sourceUrls || '').split('|').map((x) => x.trim()).filter(Boolean)
  const hit = urls.find((u) => /gaishishukatsu|外資就活/i.test(u))
  return hit || ''
}

function parseOpenworkMetrics(html = '') {
  const scoreMatch = html.match(/totalEvaluation_item fs-17[^>]*>\s*<span class="fw-b">([\d.]+)<\/span>/)
  const salaryMatch = html.match(/回答者の平均年収：<\/th>\s*<td[^>]*>\s*<span[^>]*>([\d,]+)<\/span>/)
  const employeeMatch = html.match(/年収データ（<span[^>]*>正社員<\/span>\s*([\d,]+)人）/)
  const fallbackRespondents = html.match(/回答者：<span>([\d,]+)<\/span>人/)
  return {
    openwork_score: scoreMatch ? Number(scoreMatch[1]) : null,
    openwork_avg_salary: salaryMatch ? Number(String(salaryMatch[1]).replace(/,/g, '')) : null,
    openwork_employee_count: employeeMatch
      ? Number(String(employeeMatch[1]).replace(/,/g, ''))
      : (fallbackRespondents ? Number(String(fallbackRespondents[1]).replace(/,/g, '')) : null),
  }
}

async function findOpenworkUrlByName(name = '') {
  const url = `https://www.openwork.jp/company_list?field=&pref=&src_str=${encodeURIComponent(name)}&sort=1`
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!r.ok) return ''
  const html = await r.text()
  const m = html.match(/\/company\.php\?m_id=[A-Za-z0-9]+/)
  if (!m) return ''
  return `https://www.openwork.jp${m[0]}`
}

app.get('/api/core/health', (_req, res) => {
  res.json({ ok: true, service: 'shukatsu-core-api' })
})

app.get('/api/core/dashboard', (_req, res) => {
  res.json({
    today_tasks_open: sql.dashTaskOpen.get().c,
    upcoming_deadlines: sql.dashDeadlines.all(),
    application_progress: sql.dashAppProgress.all(),
    recent_practice: sql.dashRecentCase.all(),
    ai_suggestions: [
      'Prioritize deadlines within 7 days.',
      'Review summaries of the last 3 case practices.',
      'Move stagnant applications to next actionable step.'
    ],
  })
})

app.get('/api/core/companies', (req, res) => {
  const q = `%${String(req.query.q || '').trim()}%`
  const minEmployees = Number(req.query.min_employees || 0)
  const targetOnly = String(req.query.target_only || '0') === '1' ? 1 : 0
  res.json(sql.companyList.all({ q, minEmployees, targetOnly }))
})
app.get('/api/core/companies/:id', (req, res) => {
  res.json(sql.companyById.get(Number(req.params.id)) || null)
})
app.get('/api/core/research-overview', (_req, res) => {
  res.json(sql.researchOverview.all())
})
app.post('/api/core/companies', (req, res) => {
  const payload = {
    name: req.body.name,
    industry: req.body.industry || '',
    employees: req.body.employees || null,
    website: req.body.website || '',
    openwork_score: req.body.openwork_score || null,
    webtest_type: req.body.webtest_type || '',
    case_style: req.body.case_style || '',
    notes: req.body.notes || '',
    source_tags: req.body.source_tags || '',
    ranking_note: req.body.ranking_note || '',
    openwork_url: req.body.openwork_url || '',
    gaishi_url: req.body.gaishi_url || '',
    recruit_url: req.body.recruit_url || '',
    recruit_status: req.body.recruit_status || '',
    recruit_deadline: req.body.recruit_deadline || null,
    is_target: req.body.is_target === 0 ? 0 : 1,
  }
  if (!payload.name) return res.status(400).json({ ok: false, error: 'name is required' })
  const info = sql.companyInsert.run(payload)
  res.json({ ok: true, id: info.lastInsertRowid })
})

app.patch('/api/core/companies/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ ok: false, error: 'invalid company id' })

  const current = sql.companyById.get(id)
  if (!current) return res.status(404).json({ ok: false, error: 'company not found' })

  const nextName = String(req.body.name || '').trim()
  if (!nextName) return res.status(400).json({ ok: false, error: 'name is required' })

  const duplicated = sql.companyExistsByName.get(nextName)
  if (duplicated && Number(duplicated.id) !== id) {
    return res.status(400).json({ ok: false, error: 'company name already exists' })
  }

  try {
    sql.companyFullUpdate.run({
      id,
      name: nextName,
      canonical_name_en: req.body.canonical_name_en || '',
      aliases: req.body.aliases || '',
      industry: req.body.industry || '',
      category: req.body.category || '',
      employees: req.body.employees ? Number(req.body.employees) : null,
      website: req.body.website || '',
      notes: req.body.notes || '',
      recruit_url: req.body.recruit_url || '',
      recruit_status: req.body.recruit_status || '',
      recruit_deadline: req.body.recruit_deadline || null,
      source_tags: req.body.source_tags || '',
      ranking_note: req.body.ranking_note || '',
      openwork_url: req.body.openwork_url || '',
      gaishi_url: req.body.gaishi_url || '',
      is_target: req.body.is_target === 0 ? 0 : 1,
    })
    res.json({ ok: true })
  } catch (updateError) {
    res.status(500).json({ ok: false, error: updateError.message || 'failed to update company' })
  }
})

app.delete('/api/core/companies/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ ok: false, error: 'invalid company id' })
  sql.companyDelete.run(id)
  res.json({ ok: true })
})

app.post('/api/core/companies/import-canonical-csv', (req, res) => {
  const csvText = String(req.body.csv_text || '')
  if (!csvText.trim()) return res.status(400).json({ ok: false, error: 'csv_text is required' })
  const rows = parseCsvRows(csvText)
  if (rows.length < 2) return res.status(400).json({ ok: false, error: 'csv has no data rows' })
  const headers = rows[0].map((h) => String(h || '').trim())
  const col = (name) => headers.indexOf(name)
  const idx = {
    canonical_name_ja: col('canonical_name_ja'),
    canonical_name_en: col('canonical_name_en'),
    aliases: col('aliases'),
    origin_type: col('origin_type'),
    category: col('category'),
    main_services: col('main_services'),
    japan_website: col('japan_website'),
    recruit_url: col('recruit_url'),
    employee_band: col('employee_band'),
    source_urls: col('source_urls'),
    confidence: col('confidence'),
    notes: col('notes'),
  }

  const tx = db.transaction(() => {
    let insertedOrUpdated = 0
    let skipped = 0
    const errors = []
    for (let i = 1; i < rows.length; i += 1) {
      const r = rows[i]
      const name = String(r[idx.canonical_name_ja] || '').trim()
      if (!name) {
        skipped += 1
        continue
      }
      try {
        const originType = String(r[idx.origin_type] || '').trim()
        const category = String(r[idx.category] || '').trim()
        const confidence = String(r[idx.confidence] || '').trim()
        const sourceUrls = String(r[idx.source_urls] || '').trim()
        sql.companyUpsertCanonical.run({
          name,
          canonical_name_en: String(r[idx.canonical_name_en] || '').trim(),
          aliases: String(r[idx.aliases] || '').trim(),
          origin_type: originType,
          category,
          main_services: String(r[idx.main_services] || '').trim(),
          confidence,
          industry: category || 'Consulting',
          employees: employeeBandToCount(String(r[idx.employee_band] || '')),
          website: String(r[idx.japan_website] || '').trim(),
          notes: String(r[idx.notes] || '').trim(),
          source_tags: [originType, category, confidence].filter(Boolean).join(','),
          ranking_note: '',
          recruit_url: String(r[idx.recruit_url] || '').trim(),
          openwork_url: extractOpenworkUrl(sourceUrls),
          gaishi_url: extractGaishiUrl(sourceUrls),
          is_target: employeeBandToCount(String(r[idx.employee_band] || '')) >= 100 ? 1 : 0,
        })
        insertedOrUpdated += 1
      } catch (e) {
        errors.push({ row: i + 1, error: e.message })
      }
    }
    return { insertedOrUpdated, skipped, errors }
  })

  const out = tx()
  res.json({
    ok: true,
    totalRows: rows.length - 1,
    inserted_or_updated: out.insertedOrUpdated,
    skipped: out.skipped,
    errors: out.errors.slice(0, 10),
  })
})

app.post('/api/core/companies/enrich-openwork', async (req, res) => {
  const limit = Math.max(1, Math.min(200, Number(req.body.limit || 100)))
  const companyIds = Array.isArray(req.body.company_ids) ? req.body.company_ids.map((x) => Number(x)).filter(Boolean) : null
  const baseRows = companyIds?.length
    ? db.prepare(`SELECT id, name, openwork_url FROM Company WHERE id IN (${companyIds.map(() => '?').join(',')})`).all(...companyIds)
    : db.prepare('SELECT id, name, openwork_url FROM Company ORDER BY id LIMIT ?').all(limit)

  const results = []
  for (const row of baseRows) {
    try {
      const openworkUrl = row.openwork_url || await findOpenworkUrlByName(row.name)
      if (!openworkUrl) {
        results.push({ id: row.id, name: row.name, status: 'no_openwork_url' })
        continue
      }
      const r = await fetch(openworkUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!r.ok) {
        results.push({ id: row.id, name: row.name, status: `fetch_failed_${r.status}`, openwork_url: openworkUrl })
        continue
      }
      const html = await r.text()
      const metrics = parseOpenworkMetrics(html)
      sql.companyOpenworkUpdate.run({
        id: row.id,
        openwork_url: openworkUrl,
        openwork_score: metrics.openwork_score,
        openwork_avg_salary: metrics.openwork_avg_salary,
        openwork_employee_count: metrics.openwork_employee_count,
      })
      results.push({
        id: row.id,
        name: row.name,
        status: 'ok',
        openwork_url: openworkUrl,
        ...metrics
      })
    } catch (e) {
      results.push({ id: row.id, name: row.name, status: 'error', error: e.message })
    }
  }

  res.json({
    ok: true,
    total: results.length,
    success: results.filter((x) => x.status === 'ok').length,
    results,
  })
})

app.post('/api/core/companies/import-universe', (_req, res) => {
  const tx = db.transaction(() => {
    let inserted = 0
    let skipped = 0
    for (const row of companyUniverseSeed) {
      const [name, employees, sourceTags, rankingNote] = row
      const exists = sql.companyExistsByName.get(name)
      if (exists) {
        skipped += 1
        continue
      }
      sql.companyInsert.run({
        name,
        industry: 'Consulting/Finance',
        employees,
        website: '',
        openwork_score: null,
        webtest_type: '',
        case_style: '',
        notes: '',
        source_tags: sourceTags,
        ranking_note: rankingNote,
        openwork_url: '',
        gaishi_url: '',
        recruit_url: '',
        recruit_status: '未確認',
        recruit_deadline: null,
        is_target: employees >= 100 ? 1 : 0,
      })
      inserted += 1
    }
    return { inserted, skipped }
  })

  const out = tx()
  res.json({ ok: true, ...out, totalSeed: companyUniverseSeed.length })
})

app.patch('/api/core/companies/:id/recruitment', (req, res) => {
  const id = Number(req.params.id)
  sql.companyRecruitUpdate.run({
    id,
    recruit_url: req.body.recruit_url || '',
    recruit_status: req.body.recruit_status || '',
    recruit_deadline: req.body.recruit_deadline || null,
    notes: req.body.notes || '',
  })
  res.json({ ok: true })
})

app.patch('/api/core/companies/:id/meta', (req, res) => {
  const id = Number(req.params.id)
  sql.companyMetaUpdate.run({
    id,
    source_tags: req.body.source_tags || '',
    ranking_note: req.body.ranking_note || '',
    openwork_url: req.body.openwork_url || '',
    gaishi_url: req.body.gaishi_url || '',
    is_target: req.body.is_target === 0 ? 0 : 1,
  })
  res.json({ ok: true })
})

app.get('/api/core/applications', (_req, res) => {
  res.json({ statuses: APP_STATUS, items: sql.appList.all() })
})
app.post('/api/core/applications', (req, res) => {
  const payload = {
    company_id: Number(req.body.company_id),
    position: req.body.position || '',
    status: APP_STATUS.includes(req.body.status) ? req.body.status : 'Interested',
    deadline: req.body.deadline || null,
    next_step: req.body.next_step || '',
    memo: req.body.memo || '',
  }
  if (!payload.company_id) return res.status(400).json({ ok: false, error: 'company_id is required' })
  const info = sql.appInsert.run(payload)
  res.json({ ok: true, id: info.lastInsertRowid })
})
app.patch('/api/core/applications/:id/status', (req, res) => {
  const status = APP_STATUS.includes(req.body.status) ? req.body.status : 'Interested'
  sql.appStatusUpdate.run(status, req.body.next_step || '', Number(req.params.id))
  res.json({ ok: true })
})

app.get('/api/core/research-notes', (_req, res) => res.json(sql.noteList.all()))
app.post('/api/core/research-notes', (req, res) => {
  const payload = {
    company_id: Number(req.body.company_id),
    title: req.body.title || 'Untitled',
    content: req.body.content || '',
  }
  if (!payload.company_id) return res.status(400).json({ ok: false, error: 'company_id is required' })
  const info = sql.noteInsert.run(payload)
  res.json({ ok: true, id: info.lastInsertRowid })
})

app.get('/api/core/companies/:id/research-assets', (req, res) => {
  const companyId = Number(req.params.id)
  if (!companyId) return res.status(400).json({ ok: false, error: 'invalid company id' })
  res.json(sql.researchAssetList.all(companyId))
})

app.get('/api/core/research-assets', (_req, res) => {
  res.json(sql.researchAssetLibraryList.all())
})

app.get('/api/core/research-assets/:assetId', (req, res) => {
  const assetId = Number(req.params.assetId)
  if (!assetId) return res.status(400).json({ ok: false, error: 'invalid asset id' })
  const asset = sql.researchAssetById.get(assetId)
  if (!asset) return res.status(404).json({ ok: false, error: 'asset not found' })
  res.json(asset)
})

app.post('/api/core/companies/:id/research-assets', (req, res) => {
  const companyId = Number(req.params.id)
  if (!companyId) return res.status(400).json({ ok: false, error: 'invalid company id' })
  if (!req.body.title || !req.body.content) {
    return res.status(400).json({ ok: false, error: 'title and content are required' })
  }
  const noteType = RESEARCH_NOTE_TYPES.includes(String(req.body.note_type || '').trim())
    ? String(req.body.note_type).trim()
    : 'company_overview'
  const sourceType = RESEARCH_SOURCE_TYPES.includes(String(req.body.source_type || '').trim())
    ? String(req.body.source_type).trim()
    : 'verified'
  const payload = {
    company_id: companyId,
    note_type: noteType,
    source_type: sourceType,
    source_url: req.body.source_url || '',
    title: req.body.title,
    content: req.body.content,
    tags: req.body.tags || '',
    reliability: Math.max(1, Math.min(5, Number(req.body.reliability || 3))),
  }
  const info = sql.researchAssetInsert.run(payload)
  res.json({ ok: true, id: info.lastInsertRowid })
})

app.patch('/api/core/companies/:id/research-assets/:assetId', (req, res) => {
  const companyId = Number(req.params.id)
  const assetId = Number(req.params.assetId)
  if (!companyId || !assetId) return res.status(400).json({ ok: false, error: 'invalid id' })
  const current = sql.researchAssetById.get(assetId)
  if (!current || Number(current.company_id) !== companyId) {
    return res.status(404).json({ ok: false, error: 'asset not found' })
  }
  sql.researchAssetUpdate.run({
    id: assetId,
    title: typeof req.body.title === 'string' ? req.body.title : current.title,
    content: typeof req.body.content === 'string' ? req.body.content : current.content,
    note_type: RESEARCH_NOTE_TYPES.includes(String(req.body.note_type || '').trim())
      ? String(req.body.note_type).trim()
      : current.note_type,
    source_type: RESEARCH_SOURCE_TYPES.includes(String(req.body.source_type || '').trim())
      ? String(req.body.source_type).trim()
      : current.source_type
  })
  res.json({ ok: true })
})

app.patch('/api/core/research-assets/:assetId', (req, res) => {
  const assetId = Number(req.params.assetId)
  if (!assetId) return res.status(400).json({ ok: false, error: 'invalid asset id' })
  const current = sql.researchAssetById.get(assetId)
  if (!current) return res.status(404).json({ ok: false, error: 'asset not found' })
  sql.researchAssetUpdate.run({
    id: assetId,
    title: typeof req.body.title === 'string' ? req.body.title : current.title,
    content: typeof req.body.content === 'string' ? req.body.content : current.content,
    note_type: RESEARCH_NOTE_TYPES.includes(String(req.body.note_type || '').trim())
      ? String(req.body.note_type).trim()
      : current.note_type,
    source_type: RESEARCH_SOURCE_TYPES.includes(String(req.body.source_type || '').trim())
      ? String(req.body.source_type).trim()
      : current.source_type
  })
  res.json({ ok: true })
})

app.delete('/api/core/research-assets/:assetId', (req, res) => {
  const assetId = Number(req.params.assetId)
  if (!assetId) return res.status(400).json({ ok: false, error: 'invalid asset id' })
  sql.researchAssetDelete.run(assetId)
  res.json({ ok: true })
})

app.get('/api/core/companies/:id/rule-pack', (req, res) => {
  const companyId = Number(req.params.id)
  if (!companyId) return res.status(400).json({ ok: false, error: 'invalid company id' })
  const company = sql.companyById.get(companyId)
  if (!company) return res.status(404).json({ ok: false, error: 'company not found' })
  const assets = sql.researchAssetList.all(companyId)
  const output = generateRulePack(company, assets)
  sql.ruleOutputInsert.run({
    company_id: companyId,
    output_type: 'rule_pack',
    content: JSON.stringify(output),
  })
  res.json({
    ok: true,
    company: { id: company.id, name: company.name },
    assets_count: assets.length,
    ...output
  })
})

app.get('/api/core/companies/:id/rule-output-history', (req, res) => {
  const companyId = Number(req.params.id)
  if (!companyId) return res.status(400).json({ ok: false, error: 'invalid company id' })
  const rows = sql.ruleOutputList.all(companyId).map((x) => {
    try {
      return { ...x, parsed: JSON.parse(x.content) }
    } catch {
      return { ...x, parsed: null }
    }
  })
  res.json(rows)
})

app.get('/api/core/tasks', (_req, res) => res.json(sql.taskList.all()))
app.post('/api/core/tasks', (req, res) => {
  const payload = {
    title: req.body.title || '',
    company_id: req.body.company_id ? Number(req.body.company_id) : null,
    deadline: req.body.deadline || null,
    status: req.body.status || 'todo',
    priority: req.body.priority || 'medium',
  }
  if (!payload.title) return res.status(400).json({ ok: false, error: 'title is required' })
  const info = sql.taskInsert.run(payload)
  res.json({ ok: true, id: info.lastInsertRowid })
})
app.patch('/api/core/tasks/:id/toggle', (req, res) => {
  sql.taskToggle.run(Number(req.params.id))
  res.json({ ok: true })
})

app.get('/api/core/case-practice', (_req, res) => res.json(sql.caseList.all()))
app.post('/api/core/case-practice', (req, res) => {
  const payload = {
    date: req.body.date || new Date().toISOString().slice(0, 10),
    company: req.body.company || '',
    case_question: req.body.case_question || '',
    user_answer: req.body.user_answer || '',
    ai_feedback: req.body.ai_feedback || '',
    score: req.body.score ?? null,
    summary: req.body.summary || '',
  }
  if (!payload.case_question) return res.status(400).json({ ok: false, error: 'case_question is required' })
  const info = sql.caseInsert.run(payload)
  res.json({ ok: true, id: info.lastInsertRowid })
})

app.get('/api/core/webtest-practice', (_req, res) => res.json(sql.webList.all()))
app.post('/api/core/webtest-practice', (req, res) => {
  const payload = {
    date: req.body.date || new Date().toISOString().slice(0, 10),
    test_type: req.body.test_type || '',
    score: req.body.score ?? null,
    time_spent: req.body.time_spent ?? null,
  }
  if (!payload.test_type) return res.status(400).json({ ok: false, error: 'test_type is required' })
  const info = sql.webInsert.run(payload)
  res.json({ ok: true, id: info.lastInsertRowid })
})

app.post('/api/core/ai/preview-prompt', (req, res) => {
  const summaries = db
    .prepare('SELECT summary FROM CasePractice WHERE summary IS NOT NULL AND summary != "" ORDER BY date DESC LIMIT 5')
    .all()
    .map((x) => x.summary)

  const prompt = [
    'You are a job-hunting coach.',
    `Task: ${req.body.task || 'General support'}`,
    'Recent case summaries:',
    ...summaries.map((s, i) => `${i + 1}. ${s}`),
  ].join('\n')

  res.json({
    prompt,
    note: 'This endpoint only builds context prompt. OpenAI call will be integrated in Phase 6.',
  })
})

app.get('/api/core/ai/runtime', (_req, res) => {
  res.json({ ok: true, ...getGeminiRuntimeInfo() })
})

app.post('/api/core/ai/coaching-snapshot', async (req, res) => {
  try {
    const tasks = sql.taskList.all().slice(0, 20)
    const applications = sql.appList.all().slice(0, 20)
    const deadlines = sql.dashDeadlines.all()
    const recentCase = sql.dashRecentCase.all().slice(0, 5)
    const upcomingEvents = Array.isArray(req.body?.upcoming_events) ? req.body.upcoming_events.slice(0, 5) : []
    const trainingReadiness = Array.isArray(req.body?.training_readiness) ? req.body.training_readiness.slice(0, 5) : []
    const weekPlan = Array.isArray(req.body?.week_plan) ? req.body.week_plan.filter(Boolean).slice(0, 5) : []
    const journalSummary = String(req.body?.journal_summary || '').slice(0, 800)
    const personalContext = String(req.body?.personal_context || '').slice(0, 4000)

    const fallback = {
      priorities: [
        '3日以内の締切を最優先で処理する',
        '高優先タスクを1件完了させる',
        '直近イベント前の準備を先に固める'
      ],
      deprioritize: [
        '締切が遠い会社の深掘り',
        '成果に結びつかない情報収集の広げ過ぎ'
      ],
      skill_focus: 'ES と面接の基礎準備を安定させる',
      company_focus: deadlines[0]?.company_name || upcomingEvents[0]?.company_name_raw || 'General',
      coach_note: '今週は入力された予定と締切から見ると、量より前進の粒度を整える方が効果的です。',
      watchouts: [
        '確認待ちイベントの時間と参加方法を放置しない',
        'Interested のまま止まっている応募を減らす'
      ]
    }

    const prompt = [
      'You are the AI coach for a consulting career operating system.',
      'Give calm, practical advice for a 2028 graduate targeting Japanese consulting firms.',
      'Do not diagnose personality. Do not exaggerate. Use observations and next actions.',
      'Return strict JSON with keys: priorities (array of 3 strings), deprioritize (array of 2 strings), skill_focus (string), company_focus (string), coach_note (string), watchouts (array of 2 strings).',
      'Write all output in Japanese.',
      '',
      'Current tasks:',
      JSON.stringify(tasks),
      '',
      'Current applications:',
      JSON.stringify(applications),
      '',
      'Upcoming deadlines:',
      JSON.stringify(deadlines),
      '',
      'Upcoming events:',
      JSON.stringify(upcomingEvents),
      '',
      'Recent case practice:',
      JSON.stringify(recentCase),
      '',
      'Training readiness signals:',
      JSON.stringify(trainingReadiness),
      '',
      'Personal context:',
      personalContext || 'No personal context provided.',
      '',
      'Week plan:',
      JSON.stringify(weekPlan),
      '',
      `Journal summary: ${journalSummary || 'No journal summary provided.'}`
    ].join('\n')

    const result = await generateGeminiJson(prompt, fallback)
    res.json({ ok: true, model: getGeminiRuntimeInfo().model, snapshot: result })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.post('/api/core/ai/event-draft', async (req, res) => {
  try {
    const sourceText = String(req.body?.source_text || '').trim()
    const sourceType = String(req.body?.source_type || 'manual').trim() || 'manual'

    if (!sourceText) {
      return res.status(400).json({ ok: false, error: 'source_text is required' })
    }

    const companies = buildCompanyResolverRows()
    const companyChoices = companies.slice(0, 180).map((company) => ({
      id: company.id,
      name: company.name,
      canonical_name_en: company.canonical_name_en,
      aliases: String(company.aliases || '')
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 6),
    }))

    const fallback = {
      drafts: [],
    }

    const prompt = [
      'You are assisting an event intake tool for a Japanese job-hunting operating system.',
      'Task: read the pasted source text and extract event drafts for the user.',
      'The user mental model is: discover information -> create event -> manage event.',
      'AI is only assisting parsing. Do not invent missing facts.',
      'Return strict JSON only with this shape:',
      '{ "drafts": [ { "title": string, "company_hint": string, "event_type": "general|seminar|interview|meeting|deadline|webtest", "start_at": string, "end_at": string, "location_type": "unknown|online|offline|hybrid", "location_value": string, "notes": string, "confidence": number } ] }',
      'Rules:',
      '- Usually output 1 draft unless the text clearly contains multiple distinct events.',
      '- Prefer one clean event object rather than many noisy fragments.',
      '- start_at/end_at must be ISO 8601 when confidently known, otherwise empty string.',
      '- company_hint should be the company or organizer name if inferable, otherwise empty string.',
      '- event_type should describe the event purpose, not the source.',
      '- location_value should contain Zoom/Teams URL or place if present.',
      '- notes should be short and only keep helpful hints.',
      '- confidence is a number between 0 and 1.',
      '- Output language for title/notes should follow the source text language.',
      '',
      `Source type: ${sourceType}`,
      'Known companies / aliases you may match against:',
      JSON.stringify(companyChoices),
      '',
      'Source text:',
      sourceText,
    ].join('\n')

    const aiResult = await generateGeminiJson(prompt, fallback)
    const drafts = Array.isArray(aiResult?.drafts) ? aiResult.drafts : []

    const normalized = drafts.slice(0, 5).map((draft, index) => {
      const companyMatch = resolveCompanyFromText(
        `${draft.company_hint || ''}\n${draft.title || ''}\n${sourceText}`,
        companies,
      )

      const startAt = parseIsoDate(draft.start_at)
      const endAt = parseIsoDate(draft.end_at)
      const confidence = Math.max(0, Math.min(1, Number(draft.confidence || 0)))

      return {
        id: `draft-ai-${Date.now()}-${index}`,
        company_id: companyMatch.company_id || null,
        company_name_raw: companyMatch.company_name_raw || String(draft.company_hint || '').trim(),
        title: String(draft.title || '').trim(),
        event_type: ['general', 'seminar', 'interview', 'meeting', 'deadline', 'webtest'].includes(draft.event_type)
          ? draft.event_type
          : 'general',
        start_at: startAt,
        end_at: endAt,
        location_type: ['unknown', 'online', 'offline', 'hybrid'].includes(draft.location_type)
          ? draft.location_type
          : 'unknown',
        location_value: String(draft.location_value || '').trim(),
        source_text: sourceText,
        source_type: sourceType,
        status: 'draft',
        notes: String(draft.notes || '').trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        confidence,
        needs_attention: !String(draft.title || '').trim() || !startAt || confidence < 0.6,
      }
    })

    res.json({
      ok: true,
      model: getGeminiRuntimeInfo().model,
      drafts: normalized,
      task: 'Extract event title, date/time, company, location, and event type from pasted source text.',
    })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.post('/api/core/ai/polish-event-summary', async (req, res) => {
  try {
    const summaryText = String(req.body?.summary_text || '').trim()
    const eventTitle = String(req.body?.event_title || '').trim()
    const companyName = String(req.body?.company_name || '').trim()

    if (!summaryText) {
      return res.status(400).json({ ok: false, error: 'summary_text is required' })
    }

    const fallback = {
      polished_text: summaryText,
    }

    const prompt = [
      'You are assisting a Japanese job-hunting operating system.',
      'Task: polish a user-written post-event summary without inventing facts.',
      'Return strict JSON only with this shape:',
      '{ "polished_text": string }',
      'Rules:',
      '- Preserve the original meaning and all factual details.',
      '- Improve readability, structure, and flow.',
      '- Keep the tone practical and suitable for later research reuse.',
      '- Do not add fictional conclusions, dates, or names.',
      '- Output language should follow the input text language.',
      companyName ? `Company: ${companyName}` : 'Company: unknown',
      eventTitle ? `Event title: ${eventTitle}` : 'Event title: unknown',
      '',
      'Original summary:',
      summaryText,
    ].join('\n')

    const aiResult = await generateGeminiJson(prompt, fallback)
    const polishedText = String(aiResult?.polished_text || '').trim() || summaryText

    res.json({
      ok: true,
      model: getGeminiRuntimeInfo().model,
      polished_text: polishedText,
      task: 'Polish the post-event summary while preserving meaning and facts.',
    })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

function buildCaseFeedbackFallback(questionMeta = {}, userAnswer = {}) {
  const structure = String(userAnswer.structure || '')
  const hypotheses = String(userAnswer.hypotheses || '')
  const nextAnalysis = String(userAnswer.next_analysis || '')
  const combined = [structure, hypotheses, nextAnalysis].join('\n').trim()

  const strengths = []
  const weaknesses = []
  const nextFocus = []
  const missedPoints = []

  const structureLength = structure.length
  const hypothesisLength = hypotheses.length
  const analysisLength = nextAnalysis.length
  const totalLength = combined.length

  const skillBreakdown = {
    structuring: Math.min(95, 50 + Math.round(structureLength / 6)),
    prioritization: structureLength > 80 ? 76 : 62,
    quantitative_reasoning: /\d/.test(combined) ? 74 : 58,
    synthesis: analysisLength > 90 ? 78 : 60,
    communication: totalLength > 220 ? 80 : 66,
  }

  if (skillBreakdown.structuring >= 72) strengths.push('clear structuring')
  else weaknesses.push('structuring')

  if (hypothesisLength >= 60) strengths.push('strong hypothesis framing')
  else weaknesses.push('hypothesis-driven thinking')

  if (skillBreakdown.quantitative_reasoning >= 70) strengths.push('use of quantitative support')
  else {
    weaknesses.push('quantitative_reasoning')
    missedPoints.push('Add one simple numerical estimate or order-of-magnitude anchor.')
  }

  if (skillBreakdown.prioritization < 70) {
    weaknesses.push('prioritization')
    nextFocus.push('profitability prioritization drill')
  }

  if (skillBreakdown.synthesis < 70) {
    weaknesses.push('synthesis')
    nextFocus.push('30 second synthesis')
  }

  if (combined.split(/\s+/).length < 70) {
    weaknesses.push('communication')
    nextFocus.push('add one recommendation close with rationale')
  }

  const overallScore = Math.round(
    (skillBreakdown.structuring +
      skillBreakdown.prioritization +
      skillBreakdown.quantitative_reasoning +
      skillBreakdown.synthesis +
      skillBreakdown.communication) / 5
  )

  return {
    id: `ai-feedback-${Date.now()}`,
    practice_record_id: '',
    overall_score: overallScore,
    strengths: [...new Set(strengths)].slice(0, 3),
    weaknesses: [...new Set(weaknesses)].slice(0, 3),
    missed_points: [...new Set(missedPoints)].slice(0, 3),
    coach_comment: `Your answer to "${questionMeta.title || 'this case'}" shows a workable consulting baseline. Tighten prioritization and make the recommendation more explicit so the interviewer can follow your logic faster.`,
    next_focus: [...new Set(nextFocus)].slice(0, 3),
    skill_breakdown: skillBreakdown,
    generated_at: new Date().toISOString(),
  }
}

app.post('/api/core/ai/evaluate-case-answer', async (req, res) => {
  try {
    const questionMeta = req.body?.question_meta || {}
    const userAnswer = req.body?.user_answer || {}
    const answerText = [
      `Structure:\n${String(userAnswer.structure || '').trim()}`,
      `Hypotheses:\n${String(userAnswer.hypotheses || '').trim()}`,
      `Next analysis:\n${String(userAnswer.next_analysis || '').trim()}`,
    ].join('\n\n').trim()

    if (!answerText.replace(/[\s\n]/g, '')) {
      return res.status(400).json({ ok: false, error: 'user_answer is required' })
    }

    const fallback = buildCaseFeedbackFallback(questionMeta, userAnswer)
    const prompt = [
      'You are evaluating a consulting case interview answer.',
      'Return strict JSON only with this shape:',
      '{',
      '  "id": string,',
      '  "practice_record_id": string,',
      '  "overall_score": number,',
      '  "strengths": string[],',
      '  "weaknesses": string[],',
      '  "missed_points": string[],',
      '  "coach_comment": string,',
      '  "next_focus": string[],',
      '  "skill_breakdown": {',
      '    "structuring": number,',
      '    "prioritization": number,',
      '    "quantitative_reasoning": number,',
      '    "synthesis": number,',
      '    "communication": number',
      '  },',
      '  "generated_at": string',
      '}',
      'Rules:',
      '- score from 0 to 100.',
      '- strengths/weaknesses/missed_points/next_focus should each be short bullet phrases.',
      '- coach_comment should be concise, practical, and non-dramatic.',
      '- Do not invent facts beyond the answer text.',
      '- Output language should follow the answer language.',
      '',
      'Question metadata:',
      JSON.stringify(questionMeta),
      '',
      'User answer:',
      answerText,
    ].join('\n')

    const result = await generateGeminiJson(prompt, fallback)
    res.json({
      ok: true,
      model: getGeminiRuntimeInfo().model,
      feedback: {
        ...fallback,
        ...result,
        id: result?.id || fallback.id,
        practice_record_id: '',
        generated_at: result?.generated_at || fallback.generated_at,
      },
    })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.post('/api/core/ai/polish-practice-answer', async (req, res) => {
  try {
    const practiceType = String(req.body?.practice_type || 'case')
    const questionMeta = req.body?.question_meta || {}
    const targetStyle = String(req.body?.target_style || 'structured')
    const rawAnswer = String(req.body?.user_answer || '').trim()

    if (!rawAnswer) {
      return res.status(400).json({ ok: false, error: 'user_answer is required' })
    }

    const fallback = rawAnswer
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => (index === 0 ? line : `- ${line.replace(/^-+\s*/, '')}`))
      .join('\n')

    const prompt = [
      `You are polishing a ${practiceType} practice answer.`,
      'Return strict JSON only with this shape:',
      '{',
      '  "polished_text": string',
      '}',
      'Rules:',
      '- Keep the original meaning.',
      '- Improve clarity, structure, and flow.',
      '- Do not add facts that are not in the original answer.',
      '- Keep the output concise and interview-ready.',
      `- Target style: ${targetStyle}.`,
      '',
      'Question metadata:',
      JSON.stringify(questionMeta),
      '',
      'User answer:',
      rawAnswer,
    ].join('\n')

    const result = await generateGeminiJson(prompt, { polished_text: fallback })
    res.json({
      ok: true,
      model: getGeminiRuntimeInfo().model,
      polished_text: String(result?.polished_text || fallback).trim(),
    })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Account Endpoints
app.get('/api/core/accounts', (_req, res) => {
  res.json(sql.accountList.all())
})

app.post('/api/core/accounts', (req, res) => {
  const { company_name, login_url, login_id, password } = req.body
  if (!company_name) return res.status(400).json({ ok: false, error: 'company_name is required' })
  const info = sql.accountInsert.run({ company_name, login_url, login_id, password })
  res.json({ ok: true, id: info.lastInsertRowid })
})

app.patch('/api/core/accounts/:id', (req, res) => {
  const id = Number(req.params.id)
  const { company_name, login_url, login_id, password } = req.body
  sql.accountUpdate.run({ id, company_name, login_url, login_id, password })
  res.json({ ok: true })
})

app.delete('/api/core/accounts/:id', (req, res) => {
  sql.accountDelete.run(Number(req.params.id))
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Shukatsu Core API running at http://localhost:${PORT}`)
})
