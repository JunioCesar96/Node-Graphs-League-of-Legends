export const STORAGE_LANGUAGE_LOCALE_KEY = 'node-graphs-lol:languageLocale'

export const DEFAULT_LANGUAGE_LOCALE = 'en'

export function getStoredLanguageLocale(): string | null {
  try {
    const value = window.localStorage.getItem(STORAGE_LANGUAGE_LOCALE_KEY)

    return value != null && value.trim().length > 0 ? value.trim() : null
  } catch {
    return null
  }
}

export function setStoredLanguageLocale(locale: string) {
  try {
    const trimmed = locale.trim()

    if (trimmed.length === 0) {
      window.localStorage.removeItem(STORAGE_LANGUAGE_LOCALE_KEY)

      return
    }

    window.localStorage.setItem(STORAGE_LANGUAGE_LOCALE_KEY, trimmed)
  } catch {
    /** quota / modo privado */
  }
}
