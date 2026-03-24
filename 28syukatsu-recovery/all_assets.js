import Database from 'better-sqlite3';
const db = new Database('./28syukatsu-recovery/data/shukatsu.db');
const assets = db.prepare('SELECT id, company_id, title FROM CompanyResearchAsset ORDER BY id DESC LIMIT 10').all();
console.log('Recent Assets:', assets);
