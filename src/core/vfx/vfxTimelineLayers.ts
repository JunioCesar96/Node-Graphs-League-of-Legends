export type VfxTimelineLayer = {
  id: string
  name: string
  duration: number
  activeStart: number
  activeEnd: number
  activeAtPlayhead: boolean
  visible: boolean
  focused: boolean
}

export type VfxTimelineSortMode = 'asc' | 'desc'

export type VfxTimelineLayerWithIndex = VfxTimelineLayer & {
  sourceIndex: number
}

export function annotateTimelineLayers(layers: readonly VfxTimelineLayer[]): VfxTimelineLayerWithIndex[] {
  return layers.map((layer, index) => ({
    ...layer,
    sourceIndex: index + 1,
  }))
}

export function filterAndSortTimelineLayers(
  layers: readonly VfxTimelineLayerWithIndex[],
  query: string,
  sortMode: VfxTimelineSortMode,
): VfxTimelineLayerWithIndex[] {
  const normalizedQuery = query.trim().toLowerCase()
  let filtered = layers

  if (normalizedQuery) {
    filtered = layers.filter(
      (layer) =>
        layer.name.toLowerCase().includes(normalizedQuery) ||
        String(layer.sourceIndex).includes(normalizedQuery),
    )
  }

  const sorted = [...filtered].sort((left, right) => {
    const cmp = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    return sortMode === 'asc' ? cmp : -cmp
  })

  return sorted
}
