import Database from 'better-sqlite3';
const db = new Database('./28syukatsu-recovery/data/shukatsu.db');
const asset = db.prepare('SELECT content FROM CompanyResearchAsset WHERE company_id = ? ORDER BY id DESC LIMIT 1').get(25);
console.log('Content:', asset ? asset.content : 'Not found');
