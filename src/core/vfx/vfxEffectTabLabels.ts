import type { VfxEffectListItem } from '@/hooks/useVfxPreview'

export type VfxEffectSortMode = 'asc' | 'desc'

function longestCommonPrefix(labels: readonly string[]): string {
  if (labels.length < 2) return ''
  let prefix = labels[0] ?? ''
  for (const label of labels.slice(1)) {
    while (prefix && !label.startsWith(prefix)) {
      prefix = prefix.slice(0, -1)
    }
    if (!prefix) return ''
  }
  const separatorIdx = prefix.lastIndexOf('_')
  if (separatorIdx > 0) {
    return prefix.slice(0, separatorIdx + 1)
  }
  return prefix
}

export function computeEffectDisplayPrefix(labels: readonly string[]): string {
  return longestCommonPrefix(labels)
}

export function shortenEffectLabel(label: string, commonPrefix: string): string {
  if (!commonPrefix || !label.startsWith(commonPrefix)) return label
  const suffix = label.slice(commonPrefix.length)
  return suffix.trim() || label
}

export function filterAndSortEffects(
  effects: readonly VfxEffectListItem[],
  query: string,
  sortMode: VfxEffectSortMode,
): VfxEffectListItem[] {
  const normalizedQuery = query.trim().toLowerCase()
  let filtered = effects
  if (normalizedQuery) {
    filtered = effects.filter(
      (effect) =>
        effect.label.toLowerCase().includes(normalizedQuery) ||
        (effect.mapKey?.toLowerCase().includes(normalizedQuery) ?? false),
    )
  }

  const sorted = [...filtered].sort((left, right) => {
    const cmp = left.label.localeCompare(right.label, undefined, { sensitivity: 'base' })
    return sortMode === 'asc' ? cmp : -cmp
  })

  return sorted
}
