import Database from 'better-sqlite3';
const db = new Database('./28syukatsu-recovery/data/shukatsu.db');
const c = db.prepare('SELECT id FROM Company WHERE name = ?').get('KPMGコンサルティング');
if (c) {
    const content = `
# KPMGコンサルティング 说明会转录整理笔记
... (完整笔记内容) ...
`;
    const info = db.prepare('INSERT INTO CompanyResearchAsset (company_id, source_type, title, content, reliability) VALUES (?, ?, ?, ?, ?)').run(c.id, 'manual', 'KPMG说明会纪要', content, 5);
    console.log('Asset Inserted:', info);
} else {
    console.log('Company not found');
}
