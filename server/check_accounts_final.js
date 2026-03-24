import db, { APP_STATUS } from './shukatsu-db.js';

try {
  const accounts = db.prepare('SELECT * FROM Account').all();
  console.log('--- Account Table Data ---');
  console.log(JSON.stringify(accounts, null, 2));
  console.log(`Total Accounts: ${accounts.length}`);
} catch (err) {
  console.error('Error querying Account table:', err.message);
} finally {
  db.close();
}
