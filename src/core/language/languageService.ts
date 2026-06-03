import { parseLanguagePackJson } from './languagePack'
import { DEFAULT_LANGUAGE_LOCALE } from './languagePreference'
import type { LanguageManifest, LanguagePack } from './languageTypes'

const LOCALE_FILE_PATTERN = /^[\w-]+$/

export function isValidLanguageLocaleId(locale: string): boolean {
  return LOCALE_FILE_PATTERN.test(locale)
}

function languageApiBase(): string {
  return import.meta.env.DEV ? '/api/language' : '/language'
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`Language request failed (${String(response.status)}): ${url}`)
  }

  return (await response.json()) as T
}

export async function fetchLanguageLocales(): Promise<string[]> {
  const base = languageApiBase()

  if (import.meta.env.DEV) {
    const body = await fetchJson<LanguageManifest>(`${base}/locales`)

    return [...body.locales].sort((left, right) => left.localeCompare(right))
  }

  const manifest = await fetchJson<LanguageManifest>(`${base}/manifest.json`)

  return [...manifest.locales].sort((left, right) => left.localeCompare(right))
}

export async function fetchLanguagePack(locale: string): Promise<LanguagePack> {
  if (!isValidLanguageLocaleId(locale)) {
    throw new Error(`Invalid language locale id: ${locale}`)
  }

  const base = languageApiBase()
  const url = import.meta.env.DEV ? `${base}/pack/${encodeURIComponent(locale)}` : `${base}/${encodeURIComponent(locale)}.json`
  const raw = await fetchJson<unknown>(url)

  return parseLanguagePackJson(raw)
}

export function pickInitialLanguageLocale(
  availableLocales: string[],
  storedLocale: string | null,
): string {
  if (availableLocales.length === 0) {
    return DEFAULT_LANGUAGE_LOCALE
  }

  if (storedLocale != null && availableLocales.includes(storedLocale)) {
    return storedLocale
  }

  if (availableLocales.includes(DEFAULT_LANGUAGE_LOCALE)) {
    return DEFAULT_LANGUAGE_LOCALE
  }

  return availableLocales[0]!
}
