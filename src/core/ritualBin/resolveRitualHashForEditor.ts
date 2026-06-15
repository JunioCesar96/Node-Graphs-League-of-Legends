import {
  extractHashReplacementFromLine,
  formatResolvedHashForContext,
  resolveHashFromDocumentLiterals,
  resolveHashFromDocumentMapKeys,
  resolveRitualHashLocally,
} from '@/core/resolveRitualHashSelection'
import { isRitualHashToken } from '@/core/vfx/lolFnv1aHash'

import {
  preloadHashBridge,
  resolveHashViaBridge,
  unhashSnippetViaBridge,
} from './hashBridge'

function buildUnhashSnippets(contextLine: string): string[] {
  const trimmedLine = contextLine.trim()
  const snippets = [trimmedLine]

  if (!/^entries:\s*map\[/i.test(trimmedLine)) {
    snippets.push(`entries: map[hash,embed] = {\n${trimmedLine}\n}`)
  }

  return snippets
}

/** Enriquece contexto com linhas anteriores (list[hash], map keys, etc.). */
export function enrichHashContextLine(contextLine: string, precedingLines: string[] = []): string {
  const hints = precedingLines
    .slice(-8)
    .filter((line) =>
      /list\[hash\]|map\[hash|: hash\b|: link\b|mClipNameList|mClipDataMap|:\s*\w+\s*=/i.test(line),
    )

  if (hints.length === 0) {
    return contextLine
  }

  return [...hints, contextLine].join('\n')
}

/** Resolve hash no editor — local, documento, tabelas nativas (Quartz), unhash de linha. */
export async function resolveRitualHashForEditor(
  hash: string,
  contextLine: string,
  documentText = '',
  precedingLines: string[] = [],
  options?: { mode?: 'full' | 'tables-only' },
): Promise<string | null> {
  const mode = options?.mode ?? 'full'
  const trimmedHash = hash.trim()
  if (!isRitualHashToken(trimmedHash) || !contextLine.includes(trimmedHash)) {
    return null
  }

  const enrichedContext = enrichHashContextLine(contextLine, precedingLines)

  if (mode === 'tables-only') {
    await preloadHashBridge()
    const fromBridge = await resolveHashViaBridge(trimmedHash, enrichedContext)
    if (fromBridge) {
      return formatResolvedHashForContext(fromBridge, contextLine, trimmedHash)
    }
    return null
  }

  const local = resolveRitualHashLocally(trimmedHash)
  if (local) {
    return formatResolvedHashForContext(local, contextLine, trimmedHash)
  }

  if (documentText) {
    const fromMapKeys = resolveHashFromDocumentMapKeys(trimmedHash, documentText)
    if (fromMapKeys) {
      return formatResolvedHashForContext(fromMapKeys, contextLine, trimmedHash)
    }

    const fromDocument = resolveHashFromDocumentLiterals(trimmedHash, documentText)
    if (fromDocument) {
      return formatResolvedHashForContext(fromDocument, contextLine, trimmedHash)
    }
  }

  await preloadHashBridge()

  const fromBridge = await resolveHashViaBridge(trimmedHash, enrichedContext)
  if (fromBridge) {
    return formatResolvedHashForContext(fromBridge, contextLine, trimmedHash)
  }

  for (const snippet of buildUnhashSnippets(enrichedContext)) {
    const bridge = await unhashSnippetViaBridge(snippet)
    if (!bridge.ok || !bridge.changed) {
      continue
    }

    for (const resolvedLine of bridge.text.split('\n')) {
      const replacement = extractHashReplacementFromLine(contextLine, resolvedLine, trimmedHash)
      if (replacement) {
        return replacement
      }
    }
  }

  return null
}
