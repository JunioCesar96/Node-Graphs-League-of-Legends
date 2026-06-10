import { normalizeRitualHashKey } from './lolFnv1aHash'
import {
  PARTICLE_NAME_RE,
  PARTICLE_PATH_RE,
  normalizeLineEndings,
} from './ritualParseHelpers'
import { resolveRitualFieldName, resolveRitualTypeName } from './vfxRitualFieldNames'

const MAP_ENTRY_OPEN_RE = /^(\s*)0x[0-9a-fA-F]+\s*=\s*(0x[0-9a-fA-F]+)\s*\{/
const FIELD_HASH_KEY_RE = /^(\s*)(0x[0-9a-fA-F]+)(\s*:)/
const STANDALONE_TYPE_BLOCK_RE = /^(\s*)(0x[0-9a-fA-F]+)(\s*\{)/
const EMBED_POINTER_TYPE_RE = /\b(embed|pointer)\s*=\s*(0x[0-9a-fA-F]+)/gi

function hashWasResolved(hash: string, resolved: string): boolean {
  return resolved !== normalizeRitualHashKey(hash)
}

function escapeRitualString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function formatMapEntryKey(particlePath: string | null, particleName: string | null): string | null {
  const path = particlePath?.trim()
  if (path) {
    return `"${escapeRitualString(path)}"`
  }
  const name = particleName?.trim()
  if (name) {
    return `"${escapeRitualString(name)}"`
  }
  return null
}

function resolveMapEntryOpeningLines(lines: string[]): Map<number, string> {
  const replacements = new Map<number, string>()

  for (let index = 0; index < lines.length; index++) {
    const openMatch = lines[index].match(MAP_ENTRY_OPEN_RE)
    if (!openMatch) {
      continue
    }

    const indent = openMatch[1] ?? ''
    const typeHash = openMatch[2] ?? ''
    const typeName = resolveRitualTypeName(typeHash)
    let depth = 0
    let particleName: string | null = null
    let particlePath: string | null = null
    let closeIndex = index

    for (let cursor = index; cursor < lines.length; cursor++) {
      const line = lines[cursor]
      for (const char of line) {
        if (char === '{') {
          depth++
        } else if (char === '}') {
          depth--
        }
      }

      const nameMatch = line.match(PARTICLE_NAME_RE)
      if (nameMatch?.[1]) {
        particleName = nameMatch[1]
      }
      const pathMatch = line.match(PARTICLE_PATH_RE)
      if (pathMatch?.[1]) {
        particlePath = pathMatch[1]
      }

      if (cursor > index && depth <= 0) {
        closeIndex = cursor
        break
      }
      closeIndex = cursor
    }

    const mapKey = formatMapEntryKey(particlePath, particleName)
    if (mapKey && hashWasResolved(typeHash, typeName)) {
      replacements.set(index, `${indent}${mapKey} = ${typeName} {`)
    } else if (hashWasResolved(typeHash, typeName)) {
      replacements.set(
        index,
        lines[index].replace(/=\s*0x[0-9a-fA-F]+\s*\{/, `= ${typeName} {`),
      )
    }

    index = closeIndex
  }

  return replacements
}

function humanizeLine(line: string): { line: string; changed: boolean } {
  let changed = false
  let next = line

  const fieldMatch = next.match(FIELD_HASH_KEY_RE)
  if (fieldMatch?.[2]) {
    const resolved = resolveRitualFieldName(fieldMatch[2])
    if (hashWasResolved(fieldMatch[2], resolved)) {
      changed = true
      next = `${fieldMatch[1] ?? ''}${resolved}${fieldMatch[3] ?? ':'}${next.slice(fieldMatch[0].length)}`
    }
  }

  const blockMatch = next.match(STANDALONE_TYPE_BLOCK_RE)
  if (blockMatch?.[2] && !MAP_ENTRY_OPEN_RE.test(next)) {
    const resolved = resolveRitualTypeName(blockMatch[2])
    if (hashWasResolved(blockMatch[2], resolved)) {
      changed = true
      next = `${blockMatch[1] ?? ''}${resolved}${blockMatch[3] ?? '{'}${
        next.slice(blockMatch[0].length)
      }`
    }
  }

  next = next.replace(EMBED_POINTER_TYPE_RE, (full, kind: string, hash: string) => {
    const resolved = resolveRitualTypeName(hash)
    if (!hashWasResolved(hash, resolved)) {
      return full
    }
    changed = true
    return `${kind} = ${resolved}`
  })

  return { line: next, changed }
}

/** Texto ritual com chaves/campos ainda em hash (PROP, VfxSystemDefinitionData, etc.). */
export function ritualTextNeedsHumanize(content: string): boolean {
  const normalized = normalizeLineEndings(content)

  for (const line of normalized.split('\n')) {
    const field = line.match(/^\s*(0x[0-9a-fA-F]+)\s*:/)
    if (field?.[1] && hashWasResolved(field[1], resolveRitualFieldName(field[1]))) {
      return true
    }

    const mapType = line.match(/^\s*0x[0-9a-fA-F]+\s*=\s*(0x[0-9a-fA-F]+)\s*\{/)
    if (mapType?.[1] && hashWasResolved(mapType[1], resolveRitualTypeName(mapType[1]))) {
      return true
    }

    const block = line.match(/^\s*(0x[0-9a-fA-F]+)\s*\{/)
    if (block?.[1] && hashWasResolved(block[1], resolveRitualTypeName(block[1]))) {
      return true
    }

    const embed = line.match(/\b(?:embed|pointer)\s*=\s*(0x[0-9a-fA-F]+)/i)
    if (embed?.[1] && hashWasResolved(embed[1], resolveRitualTypeName(embed[1]))) {
      return true
    }
  }

  return false
}

/** Converte hashes FNV do export PROP para nomes Jade legíveis no editor. */
export function humanizeVfxPropRitualText(source: string): { text: string; changed: boolean } {
  if (!ritualTextNeedsHumanize(source)) {
    return { text: source, changed: false }
  }

  const lines = normalizeLineEndings(source).split('\n')
  const mapEntryLines = resolveMapEntryOpeningLines(lines)
  let changed = mapEntryLines.size > 0
  const output: string[] = []

  for (let index = 0; index < lines.length; index++) {
    if (mapEntryLines.has(index)) {
      output.push(mapEntryLines.get(index)!)
      continue
    }

    const result = humanizeLine(lines[index] ?? '')
    if (result.changed) {
      changed = true
    }
    output.push(result.line)
  }

  return { text: output.join('\n'), changed }
}
