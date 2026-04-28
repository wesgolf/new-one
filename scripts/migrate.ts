/**
 * Artist OS — Supabase Migration Runner
 *
 * Reads DATABASE_URL from .env or .env.local and executes approved supabase-*.sql files
 * in order.
 *
 * Safety:
 *   - Destructive SQL is blocked by default.
 *   - Files containing DROP TABLE / TRUNCATE / DELETE FROM / DROP COLUMN are skipped
 *     unless --allow-destructive is passed explicitly.
 *
 * Setup (one-time):
 *   1. Get your DB connection string from:
 *      Supabase Dashboard → Settings → Database → Connection string
 *      Use the "Transaction pooler" URI (port 6543) or "Direct connection" (port 5432)
 *   2. Add to .env or .env.local:
 *      DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
 *
 * Usage:
 *   npm run migrate
 */

import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

function readDatabaseUrlFromEnv(): string | null {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.SUPABASE_POSTGRES_URL,
    process.env.VITE_SUPABASE_POSTGRES_URL,
    process.env.VITE_SUPABASE_DB_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = candidate.replace(/^DATABASE_URL=/, '').trim();
    if (normalized) return normalized;
  }

  return null;
}

const DATABASE_URL = readDatabaseUrlFromEnv();
const OPTIONAL = process.argv.includes('--optional');
const ALLOW_DESTRUCTIVE = process.argv.includes('--allow-destructive');

if (!DATABASE_URL) {
  if (OPTIONAL) {
    console.log('ℹ️  DATABASE_URL is not set; skipping optional Supabase migrations.');
    process.exit(0);
  }
  console.error('❌  DATABASE_URL is not set in .env or .env.local');
  console.error('');
  console.error('Get it from: Supabase Dashboard → Settings → Database → Connection string');
  console.error('Then add to .env.local:');
  console.error('  DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres');
  process.exit(1);
}

// All migration files in the order they should run
const MIGRATION_FILES = [
  'supabase-schema.sql',
  'supabase-settings-migration.sql',
  'supabase-app-settings-migration.sql',
  'supabase-releases-migration.sql',
  'supabase-ideas-migration.sql',
  'supabase-tasks-migration.sql',
  'supabase-sync-migration.sql',
  'supabase-search-migration.sql',
  'supabase-coach-sessions-migration.sql',
  'supabase-songstats-track-id-migration.sql',
  'supabase-query-performance-migration.sql',
];

const ROOT = path.resolve(process.cwd());

const DESTRUCTIVE_PATTERNS: RegExp[] = [
  /\bDROP\s+TABLE\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bALTER\s+TABLE\b[\s\S]*?\bDROP\s+COLUMN\b/i,
];

function hasDestructiveSql(sql: string): boolean {
  return DESTRUCTIVE_PATTERNS.some((pattern) => pattern.test(sql));
}

async function run() {
  const sql = postgres(DATABASE_URL, {
    ssl: 'require',
    max: 1,
  });

  try {
    console.log('✅  Connected to Supabase database\n');

    for (const file of MIGRATION_FILES) {
      const filePath = path.join(ROOT, file);
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️   Skipping ${file} (not found)`);
        continue;
      }

      const sqlText = fs.readFileSync(filePath, 'utf8');
      if (!ALLOW_DESTRUCTIVE && hasDestructiveSql(sqlText)) {
        console.warn(`⚠️   Skipping ${file} — destructive SQL detected. Pass --allow-destructive to override.\n`);
        continue;
      }
      console.log(`▶   Running ${file}...`);
      try {
        await sql.unsafe(sqlText);
        console.log(`✅  ${file} — done\n`);
      } catch (err: any) {
        // Surface the error but continue with remaining migrations
        console.error(`❌  ${file} — ERROR: ${err.message}\n`);
      }
    }

    console.log('Migration run complete.');
  } finally {
    await sql.end();
  }
}

run().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
