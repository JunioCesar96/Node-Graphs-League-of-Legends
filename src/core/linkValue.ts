const CHARACTERS_SEGMENT = 'Characters'

export const LINK_NEW_SEGMENT_DEFAULT = 'NewPath'

export function parseLinkPath(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) {
    return ['']
  }

  const parts = trimmed.split('/').map((part) => part.trim())
  const nonEmpty = parts.filter((part) => part.length > 0)
  return nonEmpty.length > 0 ? nonEmpty : ['']
}

export function formatLinkPath(segments: readonly string[]): string {
  return segments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join('/')
}

export function normalizeLinkPath(raw: string): string {
  return formatLinkPath(parseLinkPath(raw))
}

export function isValidPartialLinkValue(value: string): boolean {
  return !/[\r\n]/.test(value)
}

export function isCharacterSegmentIndex(segments: readonly string[], index: number): boolean {
  return index > 0 && segments[index - 1] === CHARACTERS_SEGMENT
}

export function formatLinkPathPreview(path: string, maxLength = 48): string {
  const normalized = normalizeLinkPath(path)
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `…${normalized.slice(-(maxLength - 1))}`
}

export function reorderLinkSegments(
  segments: readonly string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= segments.length ||
    toIndex >= segments.length ||
    fromIndex === toIndex
  ) {
    return [...segments]
  }

  const next = [...segments]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved!)
  return next
}

function replaceAllLiteral(value: string, search: string, replacement: string): string {
  if (!search) {
    return value
  }
  return value.split(search).join(replacement)
}

/**
 * Ao renomear o campeão (segmento após «Characters»), propaga o nome antigo
 * em todos os outros segmentos (ex.: Zac → Lulu em «Zac_Base» → «Lulu_Base»).
 */
export function applyCharacterRenameInPath(
  segments: readonly string[],
  characterIndex: number,
  newName: string,
): string[] {
  if (characterIndex < 0 || characterIndex >= segments.length) {
    return [...segments]
  }

  const oldName = segments[characterIndex]!.trim()
  const trimmedNew = newName.trim()

  if (!oldName || oldName === trimmedNew) {
    const next = [...segments]
    next[characterIndex] = trimmedNew
    return next
  }

  return segments.map((segment, index) => {
    if (index === characterIndex) {
      return trimmedNew
    }
    return replaceAllLiteral(segment, oldName, trimmedNew)
  })
}

export function segmentTagLabel(segment: string, maxLength = 12): string {
  const trimmed = segment.trim()
  if (!trimmed) {
    return '…'
  }
  if (trimmed.length <= maxLength) {
    return trimmed
  }
  return `${trimmed.slice(0, maxLength - 1)}…`
}
