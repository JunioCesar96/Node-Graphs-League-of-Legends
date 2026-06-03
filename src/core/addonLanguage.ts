import { parseLanguagePackJson, resolveLanguageText, type LanguagePack } from '@/core/language/languagePack'

export type AddonLanguagePack = LanguagePack

const I18N_KEY_RE = /\[\{(\d+)\}\]|\{(\d+)\}/g

export function parseAddonLanguagePackJson(raw: unknown): AddonLanguagePack {
  return parseLanguagePackJson(raw)
}

/** Substitui `{0}`, `[{0}]` etc. pelas entradas do pack do add-on. */
export function resolveAddonI18nText(template: string, pack: AddonLanguagePack): string {
  if (!template.includes('{')) {
    return template
  }
  return template.replace(I18N_KEY_RE, (match, bracketed: string | undefined, plain: string | undefined) => {
    const id = Number(bracketed ?? plain)
    if (!Number.isInteger(id) || id < 0) {
      return match
    }
    return resolveLanguageText(pack, id, match)
  })
}

export function resolveAddonI18nInHtml(html: string, pack: AddonLanguagePack): string {
  if (!html || Object.keys(pack).length === 0) {
    return html
  }
  return resolveAddonI18nText(html, pack)
}

export async function fetchAddonLanguagePack(
  addonId: string,
  locale: string,
  fallbackLocales: readonly string[] = ['pt', 'en'],
): Promise<AddonLanguagePack> {
  const lang = locale.trim().toLowerCase().slice(0, 2)
  const tried = new Set<string>()

  const tryLoad = async (code: string): Promise<AddonLanguagePack | null> => {
    const key = code.trim().toLowerCase().slice(0, 2)
    if (!key || tried.has(key)) {
      return null
    }
    tried.add(key)
    const basePath = `/addons/${encodeURIComponent(addonId)}/language`
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
