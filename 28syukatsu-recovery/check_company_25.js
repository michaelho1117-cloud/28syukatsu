import Database from 'better-sqlite3';
const db = new Database('./28syukatsu-recovery/data/shukatsu.db');
const c = db.prepare('SELECT id, name FROM Company WHERE id = ?').get(25);
console.log('Company 25:', c);
