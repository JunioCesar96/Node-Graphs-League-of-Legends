import {
  parseAddonLanguagePackJson,
  resolveAddonI18nInHtml,
  resolveAddonI18nText,
  type AddonLanguagePack,
} from '@/core/addonLanguage'

export type InputAddonLanguagePack = AddonLanguagePack

export { resolveAddonI18nInHtml as resolveInputAddonI18nInHtml, resolveAddonI18nText as resolveInputAddonI18nText }

export async function fetchInputAddonLanguagePack(
  inputAddonId: string,
  locale: string,
  fallbackLocales: readonly string[] = ['pt', 'en'],
): Promise<InputAddonLanguagePack> {
  const lang = locale.trim().toLowerCase().slice(0, 2)
  const tried = new Set<string>()

  const tryLoad = async (code: string): Promise<InputAddonLanguagePack | null> => {
    const key = code.trim().toLowerCase().slice(0, 2)
    if (!key || tried.has(key)) {
      return null
    }
    tried.add(key)
    const basePath = `/inputAddons/${encodeURIComponent(inputAddonId)}/language`
    try {
      const res = await fetch(`${basePath}/${encodeURIComponent(key)}.json`)
      if (!res.ok) {
        return null
      }
      const raw: unknown = await res.json()
      const pack = parseAddonLanguagePackJson(raw)
      return Object.keys(pack).length > 0 ? pack : null
    } catch {
      return null
    }
  }

  const primary = await tryLoad(lang)
  if (primary) {
    return primary
  }

  for (const fallback of fallbackLocales) {
    const pack = await tryLoad(fallback)
    if (pack) {
      return pack
    }
  }

  return {}
}
