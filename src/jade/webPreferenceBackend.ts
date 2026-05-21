import {
  getPreferenceBackend,
  setPreferenceBackend,
  type PreferenceBackend,
} from '@jade/lib/preferenceStore'

const STORAGE_PREFIX = 'node-graphs-lol:jade:'

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`
}

export const webPreferenceBackend: PreferenceBackend = {
  async getPreference(key, defaultValue) {
    try {
      const raw = window.localStorage.getItem(storageKey(key))
      return raw ?? defaultValue
    } catch {
      return defaultValue
    }
  },
  async setPreference(key, value) {
    try {
      window.localStorage.setItem(storageKey(key), value)
    } catch {
      /* ignore quota / private mode */
    }
  },
}

/** Regista localStorage; preserva Tauri se já estiver activo (Jade desktop embutido). */
export function registerWebPreferenceBackend(): void {
  const current = getPreferenceBackend()
  if (current !== webPreferenceBackend) {
    setPreferenceBackend(webPreferenceBackend)
  }
}

export function readWebPreference(key: string, defaultValue: string): string {
  try {
    return window.localStorage.getItem(storageKey(key)) ?? defaultValue
  } catch {
    return defaultValue
  }
}

export function writeWebPreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(storageKey(key), value)
  } catch {
    /* ignore */
  }
}
