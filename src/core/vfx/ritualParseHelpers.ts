/** Helpers partilhados do parser ritual VFX (port de ritual_parse_mvp.py). */

import { resolveRitualFieldName } from './vfxRitualFieldNames'

export const FIELD_SCALAR_RE =
  /^\s*(?:([A-Za-z_]\w*)|(0x[0-9a-fA-F]+))\s*:\s*([^=\n]*?)=\s*((?!\{)[^\n]*)$/
export const FIELD_SCALAR_BRACED_RE =
  /^\s*(?:([A-Za-z_]\w*)|(0x[0-9a-fA-F]+))\s*:\s*([^=\n]*?)=\s*\{([^}]*)\}\s*$/
export const STRUCTURAL_LINE_RE =
  /^\s*(?:([A-Za-z_]\w*)|(0x[0-9a-fA-F]+))\s*:\s*(embed|pointer|link|list2?\[[^\]]+\]|list\[[^\]]+\])\s*=/i
export const EMITTER_OPEN_RE = /^\s*(?:VfxEmitterDefinitionData|0x09cde442)\s*\{\s*$/i
export const PARTICLE_NAME_RE = /^\s*(?:particleName|0xecf1c6bc)\s*:\s*string\s*=\s*"([^"]*)"\s*$/i
export const PARTICLE_PATH_RE = /^\s*(?:particlePath|0xe7638138)\s*:\s*string\s*=\s*"([^"]*)"\s*$/i
export const SYSTEM_LIFETIME_RE =
  /^\s*(?:maxDuration|visibilityRadius|0xfd01a9d3)\s*:\s*f32\s*=\s*([0-9.+-eE]+)\s*$/i

/** Hash FNV-1a de `VfxSystemDefinitionData` (rituais PROP). */
export const VFX_SYSTEM_DEFINITION_DATA_HASH = 0x45cd899f

/** Hash FNV-1a de `VfxEmitterDefinitionData` (rituais PROP). */
export const VFX_EMITTER_DEFINITION_DATA_HASH = 0x09cde442
export const OPTION_OPEN_RE =
  /^\s*(?:([A-Za-z_]\w*)|(0x[0-9a-fA-F]+))\s*:\s*(option\[[^\]]+\])\s*=\s*\{\s*$/i

export function normalizeLineEndings(content: string): string {
  return content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

export function countBrackets(line: string): [number, number] {
  let opens = 0
  let closes = 0
  let inString = false
  let stringChar: string | null = null

  for (let i = 0; i < line.length; i++) {
    const char = line[i] ?? ''
    const prev = i > 0 ? (line[i - 1] ?? '') : ''

    if ((char === '"' || char === "'") && prev !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
        stringChar = null
      }
    }

    if (!inString) {
      if (char === '{') opens += 1
      if (char === '}') closes += 1
    }
  }

  return [opens, closes]
}

export function stripInlineComment(line: string): string {
  let inString = false
  let stringChar: string | null = null

  for (let i = 0; i < line.length; i++) {
    const char = line[i] ?? ''
    const prev = i > 0 ? (line[i - 1] ?? '') : ''

    if ((char === '"' || char === "'") && prev !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
        stringChar = null
      }
    }

    if (!inString && char === '/' && line[i + 1] === '/') {
      return line.slice(0, i).trimEnd()
    }
  }

  return line
}

export function parseScalarLine(line: string): [string, string, string] | null {
  const raw = stripInlineComment(line.trimEnd())
  if (!raw.trim()) return null

  const braced = FIELD_SCALAR_BRACED_RE.exec(raw)
  if (braced) {
    const rawKey = braced[1] ?? braced[2] ?? ''
    const name = resolveRitualFieldName(rawKey)
    return [name, (braced[3] ?? '').trim(), (braced[4] ?? '').trim()]
  }

  const scalar = FIELD_SCALAR_RE.exec(raw)
  if (scalar) {
    const rawKey = scalar[1] ?? scalar[2] ?? ''
    const name = resolveRitualFieldName(rawKey)
    const value = (scalar[4] ?? '').trim()
    if (value.includes('{')) return null
    return [name, (scalar[3] ?? '').trim(), value]
  }

  return null
}

export function collectOptionBody(
  lines: string[],
  startIndex: number,
): [string, string, string, number] {
  const openLine = lines[startIndex] ?? ''
  const match = OPTION_OPEN_RE.exec(stripInlineComment(openLine))
  if (!match) return ['', '', '', startIndex]

  const name = resolveRitualFieldName(match[1] ?? match[2] ?? '')
  const ritType = (match[3] ?? '').trim()
  let depth = countBrackets(openLine)[0] - countBrackets(openLine)[1]
  const bodyLines: string[] = []
  let index = startIndex + 1

  while (index < lines.length && depth > 0) {
    const line = lines[index] ?? ''
    const stripped = stripInlineComment(line)
    const [opens, closes] = countBrackets(stripped)
    depth += opens - closes
    if (depth > 0 || (depth === 0 && !stripped.includes('}'))) {
      bodyLines.push(stripped.trim())
    }
    index += 1
  }

  const body = bodyLines.filter(Boolean).join(' ').trim()
  return [name, ritType, body, index - 1]
}

export function collectBlock(lines: string[], start: number): [string[], number] {
  let depth = countBrackets(stripInlineComment(lines[start] ?? ''))[0]
  depth -= countBrackets(stripInlineComment(lines[start] ?? ''))[1]
  if (depth <= 0) depth = 1

  const body: string[] = []
  let index = start + 1

  while (index < lines.length && depth > 0) {
    const stripped = stripInlineComment(lines[index] ?? '')
    body.push(lines[index] ?? '')
    const [opens, closes] = countBrackets(stripped)
    depth += opens - closes
    index += 1
  }

  return [body, index - 1]
}

export function extractEmitterBlocks(systemLines: string[]): string[][] {
  const blocks: string[][] = []
  let index = 0

  while (index < systemLines.length) {
    const line = systemLines[index] ?? ''
    if (EMITTER_OPEN_RE.test(stripInlineComment(line))) {
      let depth = 1
      const blockLines: string[] = []
      index += 1
      while (index < systemLines.length && depth > 0) {
        const current = systemLines[index] ?? ''
        const stripped = stripInlineComment(current)
        const [opens, closes] = countBrackets(stripped)
        depth += opens - closes
        if (depth > 0) blockLines.push(current)
        index += 1
      }
      blocks.push(blockLines)
      continue
    }
    index += 1
  }

  return blocks
}

export type VfxSystemBlockRef = {
  mapKey: string | null
  lines: string[]
}

const MAP_ENTRY_VFX_RE =
  /^\s*(?:"([^"]+)"|(0x[0-9a-fA-F]+))\s*=\s*(?:VfxSystemDefinitionData|0x45cd899f)\s*\{/i
const STANDALONE_VFX_RE = /^\s*VfxSystemDefinitionData\s*\{/

/** Primeiro bloco VfxSystemDefinitionData (legado). */
export function findSystemBlockLines(content: string): string[] | null {
  const blocks = findAllVfxSystemBlocks(content)
  return blocks[0]?.lines ?? null
}

/** Todos os sistemas VFX no ritual (map PROP ou blocos soltos). */
export function findAllVfxSystemBlocks(content: string): VfxSystemBlockRef[] {
  const lines = normalizeLineEndings(content).split('\n')
  const blocks: VfxSystemBlockRef[] = []
  let index = 0

  while (index < lines.length) {
    const stripped = stripInlineComment(lines[index] ?? '')
    let mapKey: string | null = null
    let matched = false

    const mapMatch = MAP_ENTRY_VFX_RE.exec(stripped)
    if (mapMatch) {
      mapKey = mapMatch[1] ?? mapMatch[2] ?? null
      matched = true
    } else if (STANDALONE_VFX_RE.test(stripped)) {
      matched = true
    }

    if (!matched) {
      index += 1
      continue
    }

    let depth = countBrackets(stripped)[0] - countBrackets(stripped)[1]
    if (depth <= 0) depth = 1

    const blockLines = [lines[index] ?? '']
    index += 1

    while (index < lines.length && depth > 0) {
      const line = lines[index] ?? ''
      blockLines.push(line)
      const inner = stripInlineComment(line)
      const [opens, closes] = countBrackets(inner)
      depth += opens - closes
      index += 1
    }

    blocks.push({ mapKey, lines: blockLines })
  }

  return blocks
}

export function labelFromMapKey(mapKey: string | null): string | null {
  if (!mapKey) return null
  if (/^0x[0-9a-fA-F]+$/i.test(mapKey.trim())) return null
  const normalized = mapKey.replace(/\\/g, '/').trim()
  const slash = normalized.lastIndexOf('/')
  if (slash >= 0 && slash < normalized.length - 1) {
    return normalized.slice(slash + 1)
  }
  return normalized
}
