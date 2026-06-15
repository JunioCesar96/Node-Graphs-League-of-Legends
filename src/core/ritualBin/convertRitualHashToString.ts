import { normalizeRitualHashKey } from '@/core/vfx/lolFnv1aHash'

import { resolveRitualHashForEditor } from './resolveRitualHashForEditor'

/** Mesmas linhas de contexto que o menu «Convert to string» com hash seleccionada. */
export function collectPrecedingEditorLines(lines: string[], lineNumber: number): string[] {
  const out: string[] = []
  for (let line = Math.max(1, lineNumber - 8); line < lineNumber; line += 1) {
    out.push(lines[line - 1] ?? '')
  }
  return out
}

/**
 * Mesmo pipeline do item de menu «Convert to string» (hash seleccionada no editor).
 */
export async function convertRitualHashToStringInDocument(
  hash: string,
  lineNumber: number,
  documentText: string,
  options?: { mode?: 'full' | 'tables-only' },
): Promise<string | null> {
  const lines = documentText.split('\n')
  const contextLine = lines[lineNumber - 1] ?? ''
  const precedingLines = collectPrecedingEditorLines(lines, lineNumber)

  return resolveRitualHashForEditor(hash, contextLine, documentText, precedingLines, options)
}

export function findHashColumnsOnLine(
  line: string,
  hash: string,
): { startColumn: number; endColumn: number; hash: string } | null {
  const target = normalizeRitualHashKey(hash)
  const re = /\b(0x[0-9a-fA-F]+)\b/g
  re.lastIndex = 0

  for (const match of line.matchAll(re)) {
    const token = match[1]
    if (!token || normalizeRitualHashKey(token) !== target) {
      continue
    }
    const index = match.index ?? 0
    return {
      startColumn: index + 1,
      endColumn: index + token.length + 1,
      hash: token,
    }
  }

  return null
}

export function applyRitualHashEditToDocumentText(
  documentText: string,
  edit: { lineNumber: number; startColumn: number; endColumn: number; replacement: string },
): string {
  const lines = documentText.split('\n')
  const lineIndex = edit.lineNumber - 1
  const line = lines[lineIndex] ?? ''
  lines[lineIndex] =
    line.slice(0, edit.startColumn - 1) + edit.replacement + line.slice(edit.endColumn - 1)
  return lines.join('\n')
}
