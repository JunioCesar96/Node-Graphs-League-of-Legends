import { resolveParameterStringByHash } from '@/core/parameterAliasResolver'
import { isRitualHashToken, lolFnv1aHashHex, normalizeRitualHashKey } from '@/core/vfx/lolFnv1aHash'
import { resolveRitualFieldName } from '@/core/vfx/vfxRitualFieldNames'

/** Resolve hash FNV conhecida localmente (campos VFX / Parameters Table). */
export function resolveRitualHashLocally(hash: string): string | null {
  const trimmed = hash.trim()
  if (!isRitualHashToken(trimmed)) {
    return null
  }

  const fromParameters = resolveParameterStringByHash(trimmed)
  if (fromParameters) {
    return fromParameters
  }

  const resolved = resolveRitualFieldName(trimmed)
  return resolved !== trimmed ? resolved : null
}

function unescapeRitualStringLiteral(value: string): string {
  return value.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}

/** Procura no documento strings cujo FNV1a coincide com a hash (ex.: outra entrada do mesmo ficheiro). */
export function resolveHashFromDocumentLiterals(hash: string, documentText: string): string | null {
  const target = normalizeRitualHashKey(hash.trim())
  const literalRe = /"((?:[^"\\]|\\.)*)"/g

  for (const match of documentText.matchAll(literalRe)) {
    const raw = match[1]
    if (!raw) {
      continue
    }
    const value = unescapeRitualStringLiteral(raw)
    if (normalizeRitualHashKey(lolFnv1aHashHex(value)) === target) {
      return value
    }
  }

  return null
}

function escapeRitualString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/** Formata o nome resolvido conforme o contexto ritual (chave de mapa com aspas, campo sem aspas). */
export function formatResolvedHashForContext(
  resolvedName: string,
  contextLine: string,
  hash: string,
): string {
  const trimmed = resolvedName.trim()
  if (!trimmed) {
    return resolvedName
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed
  }

  const hashIndex = contextLine.indexOf(hash)
  if (hashIndex < 0) {
    return trimmed
  }

  const afterHash = contextLine.slice(hashIndex + hash.length).trimStart()

  if (/^=\s*[A-Za-z_]/.test(afterHash)) {
    return `"${escapeRitualString(trimmed)}"`
  }

  if (/^:/.test(afterHash)) {
    return trimmed
  }

  if (/^(?:embed|pointer)\s*=/i.test(afterHash) || /^\{/.test(afterHash)) {
    return trimmed
  }

  if (/^=/.test(afterHash)) {
    return `"${escapeRitualString(trimmed)}"`
  }

  return trimmed
}

/** Extrai o token que substituiu a hash na linha resolvida (ex.: `"Attack3_BASE"`). */
export function extractHashReplacementFromLine(
  originalLine: string,
  resolvedLine: string,
  hash: string,
): string | null {
  const originalTrimmed = originalLine.trim()
  const resolvedTrimmed = resolvedLine.trim()
  const hashIndex = originalTrimmed.indexOf(hash)
  if (hashIndex < 0) {
    return null
  }

  const prefix = originalTrimmed.slice(0, hashIndex)
  const suffix = originalTrimmed.slice(hashIndex + hash.length)

  if (!resolvedTrimmed.startsWith(prefix) || !resolvedTrimmed.endsWith(suffix)) {
    return null
  }

  const replacement = resolvedTrimmed
    .slice(prefix.length, resolvedTrimmed.length - suffix.length)
    .trim()
  return replacement.length > 0 ? replacement : null
}

/** Procura chaves de mapa `"Nome" = Type` cujo FNV1a coincide com a hash. */
export function resolveHashFromDocumentMapKeys(hash: string, documentText: string): string | null {
  const target = normalizeRitualHashKey(hash.trim())
  const mapKeyRe = /^\s*"((?:[^"\\]|\\.)*)"\s*=\s*/gm

  for (const match of documentText.matchAll(mapKeyRe)) {
    const raw = match[1]
    if (!raw) {
      continue
    }
    const name = unescapeRitualStringLiteral(raw)
    if (normalizeRitualHashKey(lolFnv1aHashHex(name)) === target) {
      return name
    }
  }

  return null
}

export { resolveRitualHashForEditor } from '@/core/ritualBin/resolveRitualHashForEditor'
