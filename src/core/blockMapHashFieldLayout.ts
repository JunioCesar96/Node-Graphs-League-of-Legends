/** Alturas da linha de map hash no BlockCard (px). */
export const BLOCK_MAP_HASH_ROW_BASE_HEIGHT = 28

export const BLOCK_MAP_HASH_LIST_HEADER_HEIGHT = 30
export const BLOCK_MAP_HASH_LIST_ITEM_HEIGHT = 22
export const BLOCK_MAP_HASH_LIST_MAX_VISIBLE_ITEMS = 6

/** Altura quando a lista está retraída (só triângulo + input). */
export const BLOCK_MAP_HASH_LIST_RETRACTED_HEIGHT = 0

export const BLOCK_MAP_HASH_LIST_PANEL_MIN_WIDTH = 384.5
export const BLOCK_MAP_HASH_LIST_PANEL_MIN_HEIGHT = 100
export const BLOCK_MAP_HASH_LIST_PANEL_MAX_WIDTH = 720
export const BLOCK_MAP_HASH_LIST_PANEL_MAX_HEIGHT = 480
export const BLOCK_MAP_HASH_LIST_PANEL_CHROME_HEIGHT = 12

export function blockMapHashListPanelDefaultHeight(entryCount: number): number {
  const listBody = Math.max(
    blockMapHashListBodyHeight(entryCount, true),
    BLOCK_MAP_HASH_LIST_ITEM_HEIGHT,
  )
  return BLOCK_MAP_HASH_LIST_HEADER_HEIGHT + listBody + BLOCK_MAP_HASH_LIST_PANEL_CHROME_HEIGHT
}

export function clampBlockMapHashListPanelSize(
  width: number,
  height: number,
  anchorTop = 0,
): { width: number; height: number } {
  const maxHeight = Math.min(
    BLOCK_MAP_HASH_LIST_PANEL_MAX_HEIGHT,
    Math.max(BLOCK_MAP_HASH_LIST_PANEL_MIN_HEIGHT, window.innerHeight - anchorTop - 8),
  )
  return {
    width: Math.min(
      BLOCK_MAP_HASH_LIST_PANEL_MAX_WIDTH,
      Math.max(BLOCK_MAP_HASH_LIST_PANEL_MIN_WIDTH, width),
    ),
    height: Math.min(maxHeight, Math.max(BLOCK_MAP_HASH_LIST_PANEL_MIN_HEIGHT, height)),
  }
}

export function blockMapHashListBodyHeight(entryCount: number, expanded = false): number {
  if (!expanded || entryCount === 0) {
    return 0
  }
  const rows = Math.max(entryCount, 1)
  const visibleRows = Math.min(rows, BLOCK_MAP_HASH_LIST_MAX_VISIBLE_ITEMS)
  return visibleRows * BLOCK_MAP_HASH_LIST_ITEM_HEIGHT
}

export function estimateBlockMapHashListRowHeight(entryCount: number, expanded = false): number {
  if (!expanded) {
    return BLOCK_MAP_HASH_ROW_BASE_HEIGHT
  }
  return (
    BLOCK_MAP_HASH_ROW_BASE_HEIGHT +
    BLOCK_MAP_HASH_LIST_HEADER_HEIGHT +
    blockMapHashListBodyHeight(entryCount, true)
  )
}

/** Y do centro do slot na linha do input (entrada seleccionada). */
export function blockMapHashEntrySlotCenterY(): number {
  return BLOCK_MAP_HASH_ROW_BASE_HEIGHT / 2
}

/** @deprecated Usar blockMapHashEntrySlotCenterY — slot único na linha do input. */
export function blockMapHashListEntrySlotCenterY(_entryIndex: number): number {
  return blockMapHashEntrySlotCenterY()
}

export function truncateBlockMapKey(key: string, maxLength = 16): string {
  const trimmed = key.trim()
  if (!trimmed) {
    return '—'
  }
  if (trimmed.length <= maxLength) {
    return trimmed
  }
  const segments = trimmed.split('/').filter(Boolean)
  if (segments.length > 2) {
    return `${segments[0]}/...`
  }
  return `${trimmed.slice(0, Math.max(1, maxLength - 1))}…`
}

export function matchesBlockMapHashSearch(
  entry: { key: string; typeName?: string; schemaId?: string },
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }
  return (
    entry.key.toLowerCase().includes(normalized) ||
    (entry.typeName ?? '').toLowerCase().includes(normalized) ||
    (entry.schemaId ?? '').toLowerCase().includes(normalized)
  )
}
