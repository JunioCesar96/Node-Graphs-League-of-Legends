import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { LangIdValue } from '@/core/language/languageIds'
import { resolveLanguageText } from '@/core/language/languagePack'
import {
  DEFAULT_LANGUAGE_LOCALE,
  getStoredLanguageLocale,
  setStoredLanguageLocale,
} from '@/core/language/languagePreference'
import {
  fetchLanguageLocales,
  fetchLanguagePack,
  pickInitialLanguageLocale,
} from '@/core/language/languageService'
import type { LanguagePack } from '@/core/language/languageTypes'

export type LanguageContextValue = {
  locale: string
  locales: string[]
  ready: boolean
  reloadLocales: () => Promise<void>
  setLocale: (locale: string) => Promise<void>
  t: (
    id: LangIdValue | number,
    fallback?: string,
    vars?: Readonly<Record<string, string | number>>,
  ) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locales, setLocales] = useState<string[]>([])
  const [locale, setLocaleState] = useState(DEFAULT_LANGUAGE_LOCALE)
  const [pack, setPack] = useState<LanguagePack>({})
  const [ready, setReady] = useState(false)

  const loadPackForLocale = useCallback(async (nextLocale: string) => {
    const nextPack = await fetchLanguagePack(nextLocale)

    setPack(nextPack)
    setLocaleState(nextLocale)
    setStoredLanguageLocale(nextLocale)
  }, [])

  const refreshLocaleList = useCallback(async () => {
    const discovered = await fetchLanguageLocales()

    setLocales(discovered)

    const preferred = pickInitialLanguageLocale(discovered, getStoredLanguageLocale())
    const target =
      discovered.includes(locale) ? locale : preferred

    await loadPackForLocale(target)
  }, [loadPackForLocale, locale])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        await refreshLocaleList()
      } finally {
        if (!cancelled) {
          setReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
    // Mount only — reload via reloadLocales / setLocale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLocale = useCallback(
    async (nextLocale: string) => {
      if (!locales.includes(nextLocale)) {
        return
      }

      await loadPackForLocale(nextLocale)
    },
    [loadPackForLocale, locales],
  )

  const reloadLocales = useCallback(async () => {
    await refreshLocaleList()
  }, [refreshLocaleList])

  const t = useCallback(
    (
      id: LangIdValue | number,
      fallback?: string,
      vars?: Readonly<Record<string, string | number>>,
    ) => resolveLanguageText(pack, id, fallback, vars),
    [pack],
  )

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      locales,
      ready,
      reloadLocales,
      setLocale,
      t,
    }),
    [locale, locales, ready, reloadLocales, setLocale, t],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)

  if (context == null) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }

  return context
}
