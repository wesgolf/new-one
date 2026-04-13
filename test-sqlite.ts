import Database from 'better-sqlite3';
import path from 'path';

try {
  const db = new Database(':memory:');
  console.log('SQLite works in memory');
  db.close();
} catch (err) {
  console.error('SQLite failed:', err);
  process.exit(1);
}
