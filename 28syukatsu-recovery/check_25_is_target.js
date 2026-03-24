import Database from 'better-sqlite3';
const db = new Database('./28syukatsu-recovery/data/shukatsu.db');
const res = db.prepare('SELECT id, name, is_target FROM Company WHERE id = ?').get(25);
console.log('Company 25:', res);
