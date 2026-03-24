import Database from 'better-sqlite3';
const db = new Database('./28syukatsu-recovery/data/shukatsu.db');
try {
  const info = db.prepare('INSERT INTO Company (name, industry, employees, website, openwork_score, webtest_type, case_style, notes, source_tags, ranking_note, openwork_url, gaishi_url, recruit_url, recruit_status, recruit_deadline, is_target) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('KPMGコンサルティング', 'Consulting', 2365, 'https://kpmg.com/jp/ja/home.html', 3.6, 'TG-Web', 'business_case', '説明会参加済み', 'Big4, Consulting', '精干型组织，强调协作', '', '', '', '未確認', null, 1);
  console.log(info);
} catch (e) {
  console.error(e);
}
