import type { GeneralSettings } from '../types/domain';
import { DEFAULT_GENERAL_SETTINGS } from '../types/domain';

const STORAGE_KEY = 'artist_os_general_settings';
const EVENT_NAME = 'artist-os-general-settings';

function resolveTheme(theme: GeneralSettings['theme']): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function normalizeGeneralSettings(input?: Partial<GeneralSettings>): GeneralSettings {
  const notificationInput = (input?.notifications ?? {}) as Partial<GeneralSettings['notifications']> & { email?: boolean };
  const smsValue = notificationInput.sms ?? notificationInput.email ?? DEFAULT_GENERAL_SETTINGS.notifications.sms;

  return {
    ...DEFAULT_GENERAL_SETTINGS,
    ...input,
    notifications: {
      ...DEFAULT_GENERAL_SETTINGS.notifications,
      ...notificationInput,
      sms: smsValue,
    },
  };
}

export function loadCachedGeneralSettings(): GeneralSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_GENERAL_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GeneralSettings>;
    return normalizeGeneralSettings(parsed);
  } catch {
    return DEFAULT_GENERAL_SETTINGS;
  }
}

export function applyTheme(theme: GeneralSettings['theme']) {
  const root = document.documentElement;
  const resolved = resolveTheme(theme);
  root.classList.toggle('app-dark', resolved === 'dark');
  root.dataset.theme = theme;
  root.dataset.resolvedTheme = resolved;
}

export function applyGeneralSettings(settings: GeneralSettings) {
  const next = normalizeGeneralSettings(settings);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  applyTheme(next.theme);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
}

export function subscribeToGeneralSettings(callback: (settings: GeneralSettings) => void) {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<GeneralSettings>).detail;
    callback(detail ?? loadCachedGeneralSettings());
  };

  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
