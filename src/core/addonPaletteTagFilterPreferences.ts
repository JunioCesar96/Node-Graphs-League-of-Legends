export const STORAGE_ADDON_PALETTE_TAG_FILTER_HIDDEN_KEY =
  'node-graphs-lol:addon-palette-tag-filter-hidden'

function normalizeTagKeys(keys: readonly string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const raw of keys) {
    const tag = raw.trim()
    if (!tag || seen.has(tag)) {
      continue
    }
    seen.add(tag)
    normalized.push(tag)
  }

  return normalized
}

export function readHiddenAddonPaletteTagKeys(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_ADDON_PALETTE_TAG_FILTER_HIDDEN_KEY)
    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return normalizeTagKeys(parsed.filter((entry): entry is string => typeof entry === 'string'))
  } catch {
    return []
  }
}

export function writeHiddenAddonPaletteTagKeys(keys: readonly string[]): void {
  try {
    window.localStorage.setItem(
      STORAGE_ADDON_PALETTE_TAG_FILTER_HIDDEN_KEY,
      JSON.stringify(normalizeTagKeys(keys)),
    )
  } catch {
    /** quota / modo privado */
  }
}

export function partitionAddonPaletteTagKeys(
  allTagKeys: readonly string[],
  hiddenTagKeys: readonly string[],
): { visibleTagKeys: string[]; hiddenTagKeysInCatalog: string[] } {
  const hiddenSet = new Set(normalizeTagKeys(hiddenTagKeys))
  const visibleTagKeys: string[] = []
  const hiddenTagKeysInCatalog: string[] = []

  for (const tagKey of allTagKeys) {
    if (hiddenSet.has(tagKey)) {
      hiddenTagKeysInCatalog.push(tagKey)
    } else {
      visibleTagKeys.push(tagKey)
    }
  }

  return { visibleTagKeys, hiddenTagKeysInCatalog }
}
