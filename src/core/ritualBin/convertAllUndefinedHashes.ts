import { isRitualHashToken } from '@/core/vfx/lolFnv1aHash'

import {
  applyRitualHashEditToDocumentText,
  convertRitualHashToStringInDocument,
  findHashColumnsOnLine,
} from './convertRitualHashToString'

const HASH_IN_LINE_RE = /\b(0x[0-9a-fA-F]+)\b/g

export type RitualHashOccurrence = {
  lineNumber: number
  startColumn: number
  endColumn: number
  hash: string
}

export type RitualHashEdit = RitualHashOccurrence & {
  replacement: string
}

export type BulkHashConvertOptions = {
  mode?: 'full' | 'tables-only'
  onProgress?: (progress: { completed: number; total: number; currentHash?: string }) => void
  isCancelled?: () => boolean
}

export type BulkHashConvertPassResult = {
  edits: RitualHashEdit[]
  converted: number
  failed: number
  failedOccurrences: RitualHashOccurrence[]
}

export function findHashOccurrencesInLines(lines: string[]): RitualHashOccurrence[] {
  const out: RitualHashOccurrence[] = []

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? ''
    HASH_IN_LINE_RE.lastIndex = 0

    for (const match of line.matchAll(HASH_IN_LINE_RE)) {
      const hash = match[1]
      if (!hash || !isRitualHashToken(hash)) {
        continue
      }

      const index = match.index ?? 0
      out.push({
        lineNumber: lineIndex + 1,
        startColumn: index + 1,
        endColumn: index + hash.length + 1,
        hash,
      })
    }
  }

  return out
}

function relocateOccurrence(
  documentText: string,
  occurrence: RitualHashOccurrence,
): RitualHashOccurrence | null {
  const lines = documentText.split('\n')
  const line = lines[occurrence.lineNumber - 1] ?? ''
  const columns = findHashColumnsOnLine(line, occurrence.hash)
  if (!columns) {
    return null
  }

  return {
    lineNumber: occurrence.lineNumber,
    startColumn: columns.startColumn,
    endColumn: columns.endColumn,
    hash: columns.hash,
  }
}

/**
 * Aplica «Convert to string» a cada hash, na ordem do documento,
 * actualizando o texto entre conversões (como repetir o menu item a item).
 */
export async function convertHashOccurrencesInDocument(
  documentText: string,
  occurrences: RitualHashOccurrence[],
  options: BulkHashConvertOptions = {},
): Promise<BulkHashConvertPassResult> {
  const mode = options.mode ?? 'full'
  const edits: RitualHashEdit[] = []
  const failedOccurrences: RitualHashOccurrence[] = []
  let working = documentText

  for (const occurrence of occurrences) {
    if (options.isCancelled?.()) {
      break
    }

    const located = relocateOccurrence(working, occurrence)
    if (!located) {
      continue
    }

    const resolved = await convertRitualHashToStringInDocument(
      located.hash,
      located.lineNumber,
      working,
      { mode },
    )

    if (!resolved || resolved === located.hash) {
      failedOccurrences.push(located)
    } else {
      const edit: RitualHashEdit = { ...located, replacement: resolved }
      edits.push(edit)
      working = applyRitualHashEditToDocumentText(working, edit)
    }

    options.onProgress?.({
      completed: edits.length + failedOccurrences.length,
      total: occurrences.length,
      currentHash: located.hash,
    })
  }

  return {
    edits,
    converted: edits.length,
    failed: failedOccurrences.length,
    failedOccurrences,
  }
}

export async function convertAllUndefinedHashesInDocument(
  documentText: string,
  options: BulkHashConvertOptions = {},
): Promise<BulkHashConvertPassResult> {
  const lines = documentText.split('\n')
  const occurrences = findHashOccurrencesInLines(lines)

  if (occurrences.length === 0) {
    return { edits: [], converted: 0, failed: 0, failedOccurrences: [] }
  }

  return convertHashOccurrencesInDocument(documentText, occurrences, options)
}
