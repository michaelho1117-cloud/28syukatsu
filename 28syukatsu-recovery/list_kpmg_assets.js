import Database from 'better-sqlite3';
const db = new Database('./28syukatsu-recovery/data/shukatsu.db');
const assets = db.prepare('SELECT id, company_id, title FROM CompanyResearchAsset WHERE company_id = ?').all(48);
console.log('KPMG Assets:', assets);
