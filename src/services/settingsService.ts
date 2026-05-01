import { supabase } from '../lib/supabase';
import type {
  GeneralSettings,
  IntegrationsSettings,
  UnauthorizedPageSettings,
} from '../types/domain';
import {
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_INTEGRATIONS_SETTINGS,
  DEFAULT_UNAUTHORIZED_PAGE_SETTINGS,
} from '../types/domain';

const PROFILE_SETTINGS_CACHE_KEY = 'artist_os_profile_settings_v1';

type CachedSettingsShape = {
  general: GeneralSettings;
  integrations: IntegrationsSettings;
  unauthorized_page: UnauthorizedPageSettings;
};

function readCached(): CachedSettingsShape {
  try {
    const raw = localStorage.getItem(PROFILE_SETTINGS_CACHE_KEY);
    if (!raw) {
      return {
        general: { ...DEFAULT_GENERAL_SETTINGS },
        integrations: { ...DEFAULT_INTEGRATIONS_SETTINGS },
        unauthorized_page: { ...DEFAULT_UNAUTHORIZED_PAGE_SETTINGS },
      };
    }
    const parsed = JSON.parse(raw) as Partial<CachedSettingsShape>;
    return {
      general: { ...DEFAULT_GENERAL_SETTINGS, ...(parsed.general ?? {}) },
      integrations: { ...DEFAULT_INTEGRATIONS_SETTINGS, ...(parsed.integrations ?? {}) },
      unauthorized_page: { ...DEFAULT_UNAUTHORIZED_PAGE_SETTINGS, ...(parsed.unauthorized_page ?? {}) },
    };
  } catch {
    return {
      general: { ...DEFAULT_GENERAL_SETTINGS },
      integrations: { ...DEFAULT_INTEGRATIONS_SETTINGS },
      unauthorized_page: { ...DEFAULT_UNAUTHORIZED_PAGE_SETTINGS },
    };
  }
}

function writeCached(values: CachedSettingsShape) {
  localStorage.setItem(PROFILE_SETTINGS_CACHE_KEY, JSON.stringify(values));
}

async function requireUserId() {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

async function loadProfileSettings(): Promise<CachedSettingsShape> {
  const cached = readCached();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  const settings = (data?.settings ?? {}) as Record<string, unknown>;
  const merged = {
    general: { ...DEFAULT_GENERAL_SETTINGS, ...((settings.general as Record<string, unknown>) ?? {}) } as GeneralSettings,
    integrations: { ...DEFAULT_INTEGRATIONS_SETTINGS, ...((settings.integrations as Record<string, unknown>) ?? {}) } as IntegrationsSettings,
    unauthorized_page: { ...DEFAULT_UNAUTHORIZED_PAGE_SETTINGS, ...((settings.unauthorized_page as Record<string, unknown>) ?? {}) } as UnauthorizedPageSettings,
  };
  writeCached(merged);
  return {
    general: { ...cached.general, ...merged.general },
    integrations: { ...cached.integrations, ...merged.integrations },
    unauthorized_page: { ...cached.unauthorized_page, ...merged.unauthorized_page },
  };
}

async function saveProfileSettings(next: CachedSettingsShape) {
  const userId = await requireUserId();
  writeCached(next);
  const { error } = await supabase
    .from('profiles')
    .update({
      settings: {
        general: next.general,
        integrations: next.integrations,
        unauthorized_page: next.unauthorized_page,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw error;
}

export const settingsService = {
  getCachedSettingsByCategory(category: 'general' | 'integrations' | 'unauthorized_page') {
    const cached = readCached();
    return cached[category];
  },

  async ensureDefaultSettings() {
    const current = await loadProfileSettings();
    await saveProfileSettings(current);
  },

  general: {
    get: async () => (await loadProfileSettings()).general,
    update: async <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
      const current = await loadProfileSettings();
      const next = {
        ...current,
        general: { ...current.general, [key]: value },
      };
      await saveProfileSettings(next);
    },
    save: async (values: Partial<GeneralSettings>) => {
      const current = await loadProfileSettings();
      const next = {
        ...current,
        general: { ...current.general, ...values },
      };
      await saveProfileSettings(next);
    },
  },

  integrations: {
    get: async () => (await loadProfileSettings()).integrations,
    update: async <K extends keyof IntegrationsSettings>(key: K, value: IntegrationsSettings[K]) => {
      const current = await loadProfileSettings();
      const next = {
        ...current,
        integrations: { ...current.integrations, [key]: value },
      };
      await saveProfileSettings(next);
    },
    save: async (values: Partial<IntegrationsSettings>) => {
      const current = await loadProfileSettings();
      const next = {
        ...current,
        integrations: { ...current.integrations, ...values },
      };
      await saveProfileSettings(next);
    },
  },

  unauthorized_page: {
    get: async () => (await loadProfileSettings()).unauthorized_page,
    update: async <K extends keyof UnauthorizedPageSettings>(key: K, value: UnauthorizedPageSettings[K]) => {
      const current = await loadProfileSettings();
      const next = {
        ...current,
        unauthorized_page: { ...current.unauthorized_page, [key]: value },
      };
      await saveProfileSettings(next);
    },
    save: async (values: Partial<UnauthorizedPageSettings>) => {
      const current = await loadProfileSettings();
      const next = {
        ...current,
        unauthorized_page: { ...current.unauthorized_page, ...values },
      };
      await saveProfileSettings(next);
    },
  },
};
