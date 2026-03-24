import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = path.join(__dirname, '..', 'data', 'shukatsu.db')

export const APP_STATUS = [
  'Interested',
  'Applied',
  'Web Test',
  '1st Interview',
  '2nd Interview',
  'Final',
  'Offer',
  'Rejected',
]

function ensureDataDir() {
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

ensureDataDir()

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all()
  const exists = columns.some((c) => c.name === columnName)
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`)
  }
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS Company (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      canonical_name_en TEXT,
      aliases TEXT,
      origin_type TEXT,
      category TEXT,
      main_services TEXT,
      confidence TEXT,
      industry TEXT,
      employees INTEGER,
      website TEXT,
      openwork_score REAL,
      openwork_avg_salary REAL,
      openwork_employee_count INTEGER,
      webtest_type TEXT,
      case_style TEXT,
      notes TEXT,
      source_tags TEXT,
      ranking_note TEXT,
      openwork_url TEXT,
      gaishi_url TEXT,
      recruit_url TEXT,
      recruit_status TEXT,
      recruit_deadline TEXT,
      is_target INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Application (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      position TEXT,
      status TEXT NOT NULL DEFAULT 'Interested',
      deadline TEXT,
      next_step TEXT,
      memo TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(company_id) REFERENCES Company(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ResearchNote (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(company_id) REFERENCES Company(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS CompanyResearchAsset (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'manual',
      source_url TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT,
      reliability INTEGER NOT NULL DEFAULT 3,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(company_id) REFERENCES Company(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS CompanyRuleOutput (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      output_type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(company_id) REFERENCES Company(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Task (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      company_id INTEGER,
      deadline TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(company_id) REFERENCES Company(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS CasePractice (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      company TEXT,
      case_question TEXT NOT NULL,
      user_answer TEXT,
      ai_feedback TEXT,
      score INTEGER,
      summary TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS WebTestPractice (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      test_type TEXT NOT NULL,
      score REAL,
      time_spent INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS EmailInbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid INTEGER UNIQUE,
      subject TEXT,
      sender TEXT,
      date TEXT,
      body_preview TEXT,
      is_job_hunt INTEGER DEFAULT 0,
      matched_company_id INTEGER,
      detected_event_date TEXT,
      status TEXT DEFAULT 'unread',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(matched_company_id) REFERENCES Company(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS Account (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      login_url TEXT,
      login_id TEXT,
      password TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  ensureColumn('Company', 'source_tags', 'TEXT')
  ensureColumn('Company', 'ranking_note', 'TEXT')
  ensureColumn('Company', 'openwork_url', 'TEXT')
  ensureColumn('Company', 'openwork_avg_salary', 'REAL')
  ensureColumn('Company', 'openwork_employee_count', 'INTEGER')
  ensureColumn('Company', 'canonical_name_en', 'TEXT')
  ensureColumn('Company', 'aliases', 'TEXT')
  ensureColumn('Company', 'origin_type', 'TEXT')
  ensureColumn('Company', 'category', 'TEXT')
  ensureColumn('Company', 'main_services', 'TEXT')
  ensureColumn('Company', 'confidence', 'TEXT')
  ensureColumn('Company', 'gaishi_url', 'TEXT')
  ensureColumn('Company', 'recruit_url', 'TEXT')
  ensureColumn('Company', 'recruit_status', 'TEXT')
  ensureColumn('Company', 'recruit_deadline', 'TEXT')
  ensureColumn('Company', 'is_target', 'INTEGER NOT NULL DEFAULT 1')
  
  // Ensure Account table migrations for existing DBs
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Account'").get()
  if (!tables) {
     db.exec(`
       CREATE TABLE Account (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         company_name TEXT NOT NULL,
         login_url TEXT,
         login_id TEXT,
         password TEXT,
         created_at TEXT NOT NULL DEFAULT (datetime('now'))
       )
     `)
  }
}

function seed() {
  const c = db.prepare('SELECT COUNT(*) AS n FROM Company').get().n
  if (c === 0) {
    const companies = [
      ['PwC Japan Group', 'Consulting', 12000, 'https://www.pwc.com/jp/ja.html', 3.8, 'TG-Web', 'strategy_case', 'Strong in digital and risk.'],
      ['Accenture Japan', 'Consulting', 25000, 'https://www.accenture.com/jp-ja', 3.9, 'SPI', 'business_case', 'Large implementation projects.'],
      ['Deloitte Tohmatsu', 'Consulting', 19000, 'https://www2.deloitte.com/jp/ja.html', 3.7, '玉手箱', 'operation_case', 'Multiple legal entities.'],
      ['KPMG Consulting', 'Consulting', 6000, 'https://kpmg.com/jp/ja/home.html', 3.6, 'TG-Web', 'business_case', 'Governance and risk focus.'],
      ['EY Strategy and Consulting', 'Consulting', 7000, 'https://www.ey.com/ja_jp', 3.8, 'SPI', 'strategy_case', 'Global projects.'],
      ['A.T. Kearney Japan', 'Consulting', 800, 'https://www.kearney.com/', 4.0, 'TG-Web', 'strategy_case', 'High bar strategy cases.'],
      ['Bain & Company Tokyo', 'Consulting', 300, 'https://www.bain.com/', 4.2, 'SPI', 'strategy_case', 'PE-heavy cases.'],
      ['BCG Tokyo', 'Consulting', 900, 'https://www.bcg.com/ja-jp', 4.1, 'TG-Web', 'strategy_case', 'Classic case interviews.']
    ]

    const insCompany = db.prepare(`
      INSERT INTO Company (name, industry, employees, website, openwork_score, webtest_type, case_style, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const tx = db.transaction(() => {
      for (const row of companies) insCompany.run(...row)

      const pwc = db.prepare('SELECT id FROM Company WHERE name = ?').get('PwC Japan Group')?.id
      const acc = db.prepare('SELECT id FROM Company WHERE name = ?').get('Accenture Japan')?.id
      const del = db.prepare('SELECT id FROM Company WHERE name = ?').get('Deloitte Tohmatsu')?.id

      if (pwc) {
        db.prepare(`
          INSERT INTO Application (company_id, position, status, deadline, next_step, memo)
          VALUES (?, 'Digital Consultant', 'Applied', '2026-03-25', 'Web test', 'Check MyPage updates')
        `).run(pwc)
        db.prepare(`
          INSERT INTO Task (title, company_id, deadline, status, priority)
          VALUES ('Finish PwC ES draft', ?, '2026-03-20', 'todo', 'high')
        `).run(pwc)
      }

      if (acc) {
        db.prepare(`
          INSERT INTO Application (company_id, position, status, deadline, next_step, memo)
          VALUES (?, 'Strategy Analyst', 'Interested', '2026-04-05', 'Attend info session', '')
        `).run(acc)
      }

      if (del) {
        db.prepare(`
          INSERT INTO Application (company_id, position, status, deadline, next_step, memo)
          VALUES (?, 'Risk Advisory', 'Web Test', '2026-03-18', 'Interview prep', 'Map Deloitte entities')
        `).run(del)
      }

      db.prepare(`
        INSERT INTO CasePractice (date, company, case_question, user_answer, ai_feedback, score, summary)
        VALUES
        ('2026-03-07', 'BCG', 'How to increase convenience store profit by 20%?', 'Segment customer and basket size...', 'Good structure, improve quant.', 72, 'Strong structure; improve quant rigor.'),
        ('2026-03-08', 'Bain', 'EV battery recycling market entry case', 'Start with market size and regulation...', 'Good hypothesis, add risk map.', 78, 'Good hypothesis; add risk prioritization.')
      `).run()

      db.prepare(`
        INSERT INTO WebTestPractice (date, test_type, score, time_spent)
        VALUES
        ('2026-03-05', 'SPI', 78, 45),
        ('2026-03-07', 'TG-Web', 71, 52),
        ('2026-03-08', '玉手箱', 75, 48)
      `).run()
    })
    tx()
  }

  // Seed Accounts from CSV if empty (Independent of Company check)
  const accCount = db.prepare('SELECT COUNT(*) AS n FROM Account').get().n
  const csvPath = path.join(__dirname, '..', 'public', 'companies.csv')
  if (accCount === 0 && fs.existsSync(csvPath)) {
    try {
      const content = fs.readFileSync(csvPath, 'utf-8')
      const lines = content.split('\n').filter(l => l.trim() !== '')
      
      const insAcc = db.prepare(`
        INSERT INTO Account (company_name, login_url, login_id, password)
        VALUES (?, ?, ?, ?)
      `)
      
      const txAcc = db.transaction(() => {
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',')
          if (cols.length >= 4) {
            insAcc.run(cols[0], cols[1], cols[2], cols[3])
          }
        }
      })
      txAcc()
      console.log(`Seeded ${lines.length - 1} accounts from CSV.`)
    } catch (err) {
      console.error('Failed to seed accounts from CSV:', err)
    }
  }
}

function seedDeloitteResearch() {
  const company = db.prepare(`
    SELECT id, name
    FROM Company
    WHERE name = 'デロイト トーマツ'
       OR canonical_name_en = 'Deloitte Tohmatsu'
    LIMIT 1
  `).get()

  if (!company?.id) return

  const assets = [
    {
      source_type: 'structured_note',
      title: 'Deloitte Group Internal Comparison',
      tags: 'deloitte,group-comparison,internal-map,decision-support',
      reliability: 5,
      content: `デロイト トーマツ主体下のFA系・周辺法人比較メモ。

DTVS:
新規事業・イノベーション・スタートアップ支援色が強く、最も「コンサルっぽい」。
相談志向・戦略adjacent志向・多言語/越境背景との相性が高い。
ただしインターン参加後は一部グループ会社本選考に排他制限あり。

DTFA:
M&A・FA・再編・バリュエーションなどの大手FAプラットフォーム。
規模感・主線感・ブランドは強いが、一般的な総合/戦略コンサルとはやや異なりdeal色が強い。

DTEA:
企業価値向上、投資家対応、アクティビスト対応など資本市場寄り。
かなりnicheで新しめ、小規模感がある。

DTSS:
宇宙・安全保障特化。
業界関心が明確でない限り優先度は高くない。

DTTWC:
BPO・オペレーション支援寄りで、コンサル主線感は弱い。

UnsungHeroes:
CRM・Salesforce・低コード等のIT導入/実装寄り。
純コンサル主線というよりソリューション寄り。

現時点の総評:
「最も本人に合いそうで、コンサル感が強い」のはDTVS。
「最も大平台・主線感がある」のはDTFA。`
    },
    {
      source_type: 'decision_summary',
      title: 'Deloitte Decision Summary',
      tags: 'deloitte,decision-summary,fit',
      reliability: 5,
      content: 'Deloitte系で1社だけ重視するなら、本人の志向とストーリー適合度ではDTVSが第一候補。大平台・安定感・主線感を優先するならDTFAが対抗候補。'
    },
    {
      source_type: 'internship_rule',
      title: 'DTVS Internship Rule Note',
      tags: 'deloitte,dtvs,internship,rule',
      reliability: 5,
      content: 'DTVSサマーインターンは通常イベントではなく、ES/SPI＋当日GDを含む優待付き選考ルート。文面上は「当日インターンシップへ参加」した場合に限り、グループ内一部会社の本選考エントリー制限が発生する。したがって、現段階では応募自体の機会費用は比較的低く、本当の意思決定ポイントは「通過後に実際参加するか」。'
    }
  ]

  const insertAsset = db.prepare(`
    INSERT INTO CompanyResearchAsset (company_id, source_type, source_url, title, content, tags, reliability)
    VALUES (@company_id, @source_type, @source_url, @title, @content, @tags, @reliability)
  `)
  const assetExists = db.prepare(`
    SELECT id FROM CompanyResearchAsset
    WHERE company_id = @company_id AND title = @title
    LIMIT 1
  `)

  const metadataOutputType = 'research_metadata_json'
  const metadataPayload = {
    topic: 'deloitte_group_internal_comparison',
    company_anchor: 'デロイト トーマツ',
    user_decision_bias: {
      best_fit_choice: 'DTVS',
      safer_mainstream_choice: 'DTFA'
    },
    subentity_snapshots: [
      {
        name: 'デロイト トーマツ ベンチャーサポート',
        short_code: 'DTVS',
        positioning: 'イノベーション・新規事業・スタートアップ支援',
        consulting_likeness: 'high',
        scale_signal: 'mid_to_large_platform',
        fit_for_user: 'high',
        decision_weight: 'primary'
      },
      {
        name: '合同会社デロイト トーマツ／ファイナンシャルアドバイザリー',
        short_code: 'DTFA',
        positioning: 'M&A・再編・FA・バリュエーション・フォレンジック',
        consulting_likeness: 'medium',
        scale_signal: 'large_platform',
        fit_for_user: 'medium_to_high',
        decision_weight: 'secondary'
      },
      {
        name: 'デロイト トーマツ エクイティアドバイザリー',
        short_code: 'DTEA',
        positioning: '企業価値向上・投資家対応・アクティビスト対応',
        consulting_likeness: 'medium',
        scale_signal: 'small_niche_new',
        fit_for_user: 'low_to_medium'
      },
      {
        name: 'デロイト トーマツ スペース アンド セキュリティ',
        short_code: 'DTSS',
        positioning: '宇宙・安全保障特化',
        consulting_likeness: 'medium',
        scale_signal: 'small_niche_new',
        fit_for_user: 'low_to_medium'
      },
      {
        name: 'デロイト トーマツ テレワークセンター',
        short_code: 'DTTWC',
        positioning: 'BPO・業務効率化・オペレーション支援',
        consulting_likeness: 'low',
        scale_signal: 'small_to_mid',
        fit_for_user: 'low'
      },
      {
        name: 'デロイト トーマツ アンサングヒーローズ',
        short_code: 'UnsungHeroes',
        positioning: 'CRM・Salesforce・低コード・IT導入支援',
        consulting_likeness: 'low_to_medium',
        scale_signal: 'small_niche',
        fit_for_user: 'low_to_medium'
      }
    ],
    internship_rule: {
      program: 'DTVS summer internship',
      type: 'preferred_selection_route',
      restriction_trigger: 'actual_participation_in_the_internship_day',
      practical_interpretation: 'applying_or_failing_the_selection_probably_does_not_trigger_group_entry_restriction'
    }
  }

  const outputExists = db.prepare(`
    SELECT id FROM CompanyRuleOutput
    WHERE company_id = ? AND output_type = ?
    LIMIT 1
  `)
  const insertOutput = db.prepare(`
    INSERT INTO CompanyRuleOutput (company_id, output_type, content)
    VALUES (?, ?, ?)
  `)

  const tx = db.transaction(() => {
    for (const asset of assets) {
      const exists = assetExists.get({ company_id: company.id, title: asset.title })
      if (!exists) {
        insertAsset.run({
          company_id: company.id,
          source_type: asset.source_type,
          source_url: '',
          title: asset.title,
          content: asset.content,
          tags: asset.tags,
          reliability: asset.reliability
        })
      }
    }

    const existingOutput = outputExists.get(company.id, metadataOutputType)
    if (!existingOutput) {
      insertOutput.run(company.id, metadataOutputType, JSON.stringify(metadataPayload))
    }
  })

  tx()
}

migrate()
seed()
seedDeloitteResearch()

export default db
