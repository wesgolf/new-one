/**
 * settingsService.ts
 *
 * Centralized read/write layer for the `user_settings` table.
 * All settings are stored as JSONB under (user_id, category, key).
 *
 * Usage:
 *   import { settingsService } from '../services/settingsService';
 *
 *   const general = await settingsService.getSettingsByCategory('general');
 *   await settingsService.updateSetting('general', 'theme', 'dark');
 *   await settingsService.ensureDefaultSettings();
 */

import { supabase } from '../lib/supabase';
import { isMissingTableError } from '../lib/supabaseData';
import type {
  GeneralSettings,
  IntegrationsSettings,
  SettingCategory,
  SettingsMap,
  UnauthorizedPageSettings,
  UserSettingRow,
} from '../types/domain';
import {
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_INTEGRATIONS_SETTINGS,
  DEFAULT_UNAUTHORIZED_PAGE_SETTINGS,
} from '../types/domain';

let settingsTableUnavailable = false;
const SETTINGS_TIMEOUT_MS = 4000;
const SETTINGS_CACHE_PREFIX = 'artist_os_settings:';

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function withTimeout<T>(promise: PromiseLike<T> | T, ms = SETTINGS_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Settings request timed out')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function requireUserId(): Promise<string> {
  const { data } = await withTimeout(supabase.auth.getSession(), 1500);
  const userId = data.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

function cacheKey(category: string) {
  return `${SETTINGS_CACHE_PREFIX}${category}`;
}

function readCachedSettings<T extends Record<string, unknown>>(category: string, defaults: T): T {
  try {
    const raw = localStorage.getItem(cacheKey(category));
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return { ...defaults, ...parsed } as T;
  } catch {
    return { ...defaults };
  }
}

function writeCachedSettings(category: string, values: Record<string, unknown>) {
  try {
    localStorage.setItem(cacheKey(category), JSON.stringify(values));
  } catch {
    // ignore local cache failures
  }
}

/** Convert an array of raw rows into a single plain object (key → value). */
function rowsToObject<T extends Record<string, unknown>>(
  rows: UserSettingRow[],
  defaults: T,
): T {
  const merged = { ...defaults } as Record<string, unknown>;
  for (const row of rows) {
    merged[row.key] = row.value_json;
  }
  return merged as T;
}

// ─── Default settings map ─────────────────────────────────────────────────────

const CATEGORY_DEFAULTS: Record<string, Record<string, unknown>> = {
  general:           DEFAULT_GENERAL_SETTINGS           as unknown as Record<string, unknown>,
  unauthorized_page: DEFAULT_UNAUTHORIZED_PAGE_SETTINGS as unknown as Record<string, unknown>,
  integrations:      DEFAULT_INTEGRATIONS_SETTINGS      as unknown as Record<string, unknown>,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch all settings rows for a given category and return them as a typed
 * object merged on top of the category defaults. Missing keys fall back to
 * their defaults so callers always get a fully-shaped object.
 */
async function getSettingsByCategory<K extends keyof SettingsMap>(
  category: K,
): Promise<SettingsMap[K]>;
async function getSettingsByCategory(
  category: SettingCategory,
): Promise<Record<string, unknown>>;
async function getSettingsByCategory(
  category: string,
): Promise<Record<string, unknown>> {
  const defaults = CATEGORY_DEFAULTS[category] ?? {};
  const cached = readCachedSettings(category, defaults);

  if (settingsTableUnavailable) return cached;

  try {
    const userId = await requireUserId();
    const { data, error } = await withTimeout(
      supabase
        .from('user_settings')
        .select('id, user_id, category, key, value_json, created_at, updated_at')
        .eq('user_id', userId)
        .eq('category', category),
    );

    if (error) {
      if (isMissingTableError(error)) {
        settingsTableUnavailable = true;
        console.warn('[settingsService] user_settings table missing; using defaults for this session.');
        return cached;
      }
      throw error;
    }

    const merged = rowsToObject(
      (data ?? []) as UserSettingRow[],
      defaults as Record<string, unknown>,
    );
    writeCachedSettings(category, merged);
    return merged;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err ?? '');
    if (!message.toLowerCase().includes('timed out')) {
      console.warn(`[settingsService] getSettingsByCategory(${category}) failed:`, err);
    }
    return cached;
  }
}

/**
 * Update a single setting key within a category.
 * Raises if the user is not authenticated or if the DB write fails.
 */
async function updateSetting(
  category: SettingCategory,
  key: string,
  value: unknown,
): Promise<void> {
  const defaults = CATEGORY_DEFAULTS[category] ?? {};
  const current = readCachedSettings(category, defaults);
  writeCachedSettings(category, { ...current, [key]: value });

  if (settingsTableUnavailable) return;

  const userId = await requireUserId();

  const { error } = await withTimeout(
    supabase
      .from('user_settings')
      .update({ value_json: value, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('category', category)
      .eq('key', key),
  );

  if (error) {
    if (isMissingTableError(error)) {
      settingsTableUnavailable = true;
      console.warn('[settingsService] user_settings table missing; skipping setting write.');
      return;
    }
    throw error;
  }
}

/**
 * Insert or update a single setting. Safe to call even if the row does not
 * exist yet. Uses the (user_id, category, key) unique constraint.
 */
async function upsertSetting(
  category: SettingCategory,
  key: string,
  value: unknown,
): Promise<void> {
  const defaults = CATEGORY_DEFAULTS[category] ?? {};
  const current = readCachedSettings(category, defaults);
  writeCachedSettings(category, { ...current, [key]: value });

  if (settingsTableUnavailable) return;

  const userId = await requireUserId();

  const { error } = await withTimeout(
    supabase.from('user_settings').upsert(
      {
        user_id:    userId,
        category,
        key,
        value_json: value,
      },
      { onConflict: 'user_id,category,key' },
    ),
  );

  if (error) {
    if (isMissingTableError(error)) {
      settingsTableUnavailable = true;
      console.warn('[settingsService] user_settings table missing; skipping setting upsert.');
      return;
    }
    throw error;
  }
}

/**
 * Upsert all keys of a category object in a single batch.
 * Useful for saving a whole category form at once.
 */
async function upsertCategory(
  category: SettingCategory,
  values: Record<string, unknown>,
): Promise<void> {
  const defaults = CATEGORY_DEFAULTS[category] ?? {};
  const current = readCachedSettings(category, defaults);
  writeCachedSettings(category, { ...current, ...values });

  if (settingsTableUnavailable) return;

  const userId = await requireUserId();

  const rows = Object.entries(values).map(([key, value_json]) => ({
    user_id: userId,
    category,
    key,
    value_json,
  }));

  if (rows.length === 0) return;

  const { error } = await withTimeout(
    supabase
      .from('user_settings')
      .upsert(rows, { onConflict: 'user_id,category,key' }),
  );

  if (error) {
    if (isMissingTableError(error)) {
      settingsTableUnavailable = true;
      console.warn('[settingsService] user_settings table missing; skipping category upsert.');
      return;
    }
    throw error;
  }
}

/**
 * Seed default settings for all known categories on first login.
 * Rows that already exist are left unchanged (ON CONFLICT DO NOTHING semantics
 * via upsert with ignoreDuplicates).
 */
async function ensureDefaultSettings(): Promise<void> {
  if (settingsTableUnavailable) return;

  const userId = await requireUserId();

  const rows: Array<{ user_id: string; category: string; key: string; value_json: unknown }> = [];

  for (const [category, defaults] of Object.entries(CATEGORY_DEFAULTS)) {
    for (const [key, value_json] of Object.entries(defaults)) {
      rows.push({ user_id: userId, category, key, value_json });
    }
  }

  try {
    const { error } = await withTimeout(
      supabase
        .from('user_settings')
        .upsert(rows, {
          onConflict:       'user_id,category,key',
          ignoreDuplicates: true,   // existing rows are never overwritten
        }),
      2500,
    );

    if (error && isMissingTableError(error)) {
      settingsTableUnavailable = true;
      console.warn('[settingsService] user_settings table missing; default seeding skipped.');
      return;
    }

    if (error && !isMissingTableError(error)) {
      console.warn('[settingsService] ensureDefaultSettings error:', error);
    }
  } catch (err) {
    // Non-fatal — app should still function without default settings rows
    console.warn('[settingsService] ensureDefaultSettings threw:', err);
  }
}

/**
 * Convenience helpers for typed category access.
 */
const general = {
  get: () => getSettingsByCategory('general') as Promise<GeneralSettings>,
  update: (key: keyof GeneralSettings, value: GeneralSettings[typeof key]) =>
    upsertSetting('general', key, value),
  save: (values: Partial<GeneralSettings>) =>
    upsertCategory('general', values as Record<string, unknown>),
};

const unauthorizedPage = {
  get: () => getSettingsByCategory('unauthorized_page') as Promise<UnauthorizedPageSettings>,
  update: (key: keyof UnauthorizedPageSettings, value: UnauthorizedPageSettings[typeof key]) =>
    upsertSetting('unauthorized_page', key, value),
  save: (values: Partial<UnauthorizedPageSettings>) =>
    upsertCategory('unauthorized_page', values as Record<string, unknown>),
};

const integrations = {
  get: () => getSettingsByCategory('integrations') as Promise<IntegrationsSettings>,
  update: (key: keyof IntegrationsSettings, value: IntegrationsSettings[typeof key]) =>
    upsertSetting('integrations', key, value),
  save: (values: Partial<IntegrationsSettings>) =>
    upsertCategory('integrations', values as Record<string, unknown>),
};

// ─── Exported surface ─────────────────────────────────────────────────────────

export const settingsService = {
  // Generic API
  getSettingsByCategory,
  updateSetting,
  upsertSetting,
  upsertCategory,
  ensureDefaultSettings,
  getCachedSettingsByCategory: <K extends keyof SettingsMap>(category: K) =>
    readCachedSettings(String(category), (CATEGORY_DEFAULTS[String(category)] ?? {}) as Record<string, unknown>) as SettingsMap[K],

  // Typed category shortcuts
  general,
  unauthorizedPage,
  integrations,
};
