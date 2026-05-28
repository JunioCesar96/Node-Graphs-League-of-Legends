import type { LanguagePack } from './languageTypes'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Converte JSON `{ "0": "…", "1": "…" }` para mapa numérico. */
export function parseLanguagePackJson(raw: unknown): LanguagePack {
  if (!isRecord(raw)) {
    return {}
  }

  const pack: Record<number, string> = {}

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== 'string') {
      continue
    }

    const id = Number(key)

    if (!Number.isInteger(id) || id < 0) {
      continue
    }

    pack[id] = value
  }

  return pack
}

export function formatLanguageText(
  template: string,
  vars?: Readonly<Record<string, string | number>>,
): string {
  if (vars == null || Object.keys(vars).length === 0) {
    return template
  }

  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key]

    return value === undefined ? match : String(value)
  })
}

export function resolveLanguageText(
  pack: LanguagePack,
  id: number,
  fallback?: string,
  vars?: Readonly<Record<string, string | number>>,
): string {
  const hit = pack[id]

  const base =
    hit != null && hit.length > 0
      ? hit
      : fallback != null && fallback.length > 0
        ? fallback
        : `[${String(id)}]`

  return formatLanguageText(base, vars)
}
