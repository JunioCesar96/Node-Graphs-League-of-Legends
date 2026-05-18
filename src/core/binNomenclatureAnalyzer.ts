/**
 * Analisador alinhado a `nomecratura.md`: classificação por linha do texto ritual `.bin`
 * e aplicação de `group` / `collection` aos `NodeSchemaDefinition` (fluxo VFX Jade).
 */

import type { NodeSchemaDefinition, NomenclaturePathSegment } from '@/core/nodeSchema'
import type { ParsedVfxData } from '@/core/jadeVfxParse'
import { countBrackets, findBlockEnd, normalizeLineEndings, parseVfxContent } from '@/core/jadeVfxParse'
import { segmentsToPathHierarchyIdString, segmentsToPathHierarchyString } from '@/core/pathHierarchy'
import {
  buildVfxJadePathHierarchySteps,
  extractTitleCategoryPrefix,
  VFX_JADE_EMITTER_EMBED_COLLECTION,
  VFX_JADE_EMITTER_EMBED_GROUP,
  VFX_JADE_SYSTEM_ROOT_COLLECTION,
  VFX_JADE_SYSTEM_ROOT_GROUP,
} from '@/core/vfxJadeNomenclature'

/** Passo 7 de nomecratura.md: Classification (collection) → Set Nomenclature (group). */
export function mapCollectionNomenclatureToGroup(collection: string): string {
  const t = collection.trim()
  if (t.startsWith('#1')) {
    return '#1 Classes'
  }
  if (t.startsWith('#2')) {
    return '#2 Entidades'
  }
  if (t.startsWith('#3')) {
    return '#3 Internal Structures'
  }
  if (t.startsWith('#4')) {
    return '#4 Parameters'
  }
  return ''
}

export type BinNomecraturaLineTag = {
  lineIndex: number
  line: string
  /** Colunas aproximadas (espaço = 1, tab = 4). */
  indentCols: number
  collection: string
  group: string
}

function measureIndentCols(line: string): number {
  let n = 0
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === ' ') {
      n += 1
    } else if (ch === '\t') {
      n += 4
    } else {
      break
    }
  }
  return n
}

function findEntriesMapOpenLineIndex(lines: string[]): number | null {
  const mapIdx = lines.findIndex((l) => /entries:\s*map\[/i.test(l))
  if (mapIdx === -1) {
    return null
  }

  for (let j = mapIdx; j < Math.min(mapIdx + 48, lines.length); j++) {
    const L = lines[j]!
    if (/\]\s*\{/.test(L)) {
      return j
    }
  }

  for (let j = mapIdx; j < Math.min(mapIdx + 48, lines.length); j++) {
    if (lines[j]!.includes('{')) {
      return j
    }
  }

  return null
}

function pushTag(
  tags: BinNomecraturaLineTag[],
  lineIndex: number,
  line: string,
  collection: string,
  group: string,
) {
  tags.push({
    lineIndex,
    line,
    indentCols: measureIndentCols(line),
    collection,
    group,
  })
}

export function classifyFieldLine(line: string): { collection: string; group: string } | null {
  const t = line.trim()
  if (t.length === 0 || t.startsWith('//')) {
    return null
  }

  if (/\bembed\b/i.test(line) && /^\s*\w+\s*:/.test(line)) {
    const c = '#3 Embed Block'
    return { collection: c, group: mapCollectionNomenclatureToGroup(c) }
  }

  if (/\b(?:list2?\[|list\[)/i.test(line) && /^\s*\w+\s*:/.test(line)) {
    const c = '#3 Collection Block'
    return { collection: c, group: mapCollectionNomenclatureToGroup(c) }
  }

  if (/\bpointer\b/i.test(line) && /^\s*\w+\s*:/.test(line)) {
    const c = '#3 Pointer Node'
    return { collection: c, group: mapCollectionNomenclatureToGroup(c) }
  }

  if (/\blink\b/i.test(line) && /^\s*\w+\s*:/.test(line)) {
    const c = '#3 Graph Link'
    return { collection: c, group: mapCollectionNomenclatureToGroup(c) }
  }

  if (!/^\s*\w+\s*:\s*\S/.test(line) || !/=/.test(line)) {
    return null
  }

  const typeSeg = line.replace(/^[\s]*\w+\s*:\s*/i, '')
  const typePart = typeSeg.split('=')[0] ?? ''

  if (/\b(?:vec2|vec3|vec4|rgba)\b/i.test(typePart)) {
    const c = '#4 Compound/Vector Field'
    return { collection: c, group: mapCollectionNomenclatureToGroup(c) }
  }

  if (/\boption\[/i.test(typePart)) {
    const c = '#4 Optional Field'
    return { collection: c, group: mapCollectionNomenclatureToGroup(c) }
  }

  if (
    /\b(?:f32|u32|u8|string|bool|flag|hash|i16|i32)\b/i.test(typePart) ||
    /\bembed\b/i.test(typePart)
  ) {
    const c = '#4 Primitive Field'
    return { collection: c, group: mapCollectionNomenclatureToGroup(c) }
  }

  return null
}

/**
 * Percorre o texto ritual e etiqueta linhas segundo os passos 3–6 de nomecratura.md,
 * aplicando o mapeamento do passo 7 em `group`.
 */
export function analyzeRitualTextBinNomecratura(source: string): BinNomecraturaLineTag[] {
  const lines = normalizeLineEndings(source).split('\n')
  const tags: BinNomecraturaLineTag[] = []

  const openLine = findEntriesMapOpenLineIndex(lines)
  let bodyStart = -1
  let bodyEnd = -1
  let minEntryIndent: number | null = null

  if (openLine !== null) {
    const endBlock = findBlockEnd(lines, openLine)
    bodyStart = openLine + 1
    bodyEnd = endBlock - 1

    for (let i = bodyStart; i <= bodyEnd && i < lines.length; i++) {
      if (!/^\s*"([^"]+)"\s*=\s*(\w+)\s*\{/.test(lines[i]!)) {
        continue
      }
      const ind = measureIndentCols(lines[i]!)
      if (minEntryIndent === null || ind < minEntryIndent) {
        minEntryIndent = ind
      }
    }
  }

  let braceDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const indentCols = measureIndentCols(line)

    if (/type:\s*string/i.test(line) || /version:\s*u32/i.test(line)) {
      const c = '#1 Header Metadata'
      pushTag(tags, i, line, c, mapCollectionNomenclatureToGroup(c))
    } else if (/linked:\s*list\[string\]/i.test(line)) {
      const c = '#1 Dependency Array'
      pushTag(tags, i, line, c, mapCollectionNomenclatureToGroup(c))
    } else if (/entries:\s*map\[/i.test(line)) {
      const c = '#1 Root Map'
      pushTag(tags, i, line, c, mapCollectionNomenclatureToGroup(c))
    }

    if (
      minEntryIndent !== null &&
      i >= bodyStart &&
      i <= bodyEnd &&
      indentCols === minEntryIndent
    ) {
      const em = line.match(/^\s*"([^"]+)"\s*=\s*(\w+)\s*\{/)
      if (em) {
        const cls = em[2]!
        const c = cls === 'VfxSystemDefinitionData' ? '#2 VFX Definition Root' : '#2 Root Entry'
        pushTag(tags, i, line, c, mapCollectionNomenclatureToGroup(c))
      }
    }

    if (
      minEntryIndent !== null &&
      i >= bodyStart &&
      i <= bodyEnd &&
      indentCols > minEntryIndent &&
      /^\s*"[^"]+"\s*=\s*VfxEmitterDefinitionData\s*\{/.test(line)
    ) {
      const c = '#3 Embed Block'
      pushTag(tags, i, line, c, mapCollectionNomenclatureToGroup(c))
    }

    const depthBefore = braceDepth
    if (minEntryIndent !== null && indentCols > minEntryIndent && depthBefore > 0) {
      const field = classifyFieldLine(line)
      if (field) {
        pushTag(tags, i, line, field.collection, field.group)
      }
    }

    const { opens, closes } = countBrackets(line)
    braceDepth += opens - closes
  }

  return tags
}

function stripStringDefault(raw: string): string {
  let v = raw.trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }
  return v
}

function flattenEmitterRefs(parsed: ParsedVfxData): { systemKey: string; emitterName: string }[] {
  const out: { systemKey: string; emitterName: string }[] = []
  for (const sk of parsed.systemOrder) {
    const sys = parsed.systems[sk]
    if (!sys) {
      continue
    }
    for (const em of sys.emitters) {
      out.push({ systemKey: sk, emitterName: em.name })
    }
  }
  return out
}

export type ApplyBinNomenclaturaResult = {
  schemas: NodeSchemaDefinition[]
  appliedCount: number
  warnings: string[]
}

/**
 * Aplica `nomenclature` (pathHierarchy, collection, group) aos schemas gerados pelo conversor Class Group,
 * usando pilhas `pathHierarchySteps` produzidas em `convertRitobinStructureTextToNodeSchemas`.
 */
export function applyClassGroupNomenclatureFromSchemaPaths(
  schemas: NodeSchemaDefinition[],
  pathById: Readonly<Record<string, readonly NomenclaturePathSegment[]>>,
): ApplyBinNomenclaturaResult {
  const warnings: string[] = []
  let applied = 0
  const next: NodeSchemaDefinition[] = schemas.map((s) => ({
    ...s,
    nomenclature: s.nomenclature ? { ...s.nomenclature } : undefined,
  }))

  for (let si = 0; si < next.length; si++) {
    const s = next[si]!
    const steps = pathById[s.id]
    if (!steps?.length) {
      continue
    }

    const collection = steps[steps.length - 1]!.type.trim()
    const nom = s.nomenclature
    const collectionType = nom?.collectionType?.trim()
      ? nom.collectionType.trim()
      : extractTitleCategoryPrefix(s.title)

    next[si] = {
      ...s,
      nomenclature: {
        group: mapCollectionNomenclatureToGroup(collection),
        collection,
        collectionType,
        pathHierarchy: segmentsToPathHierarchyIdString(steps),
        pathHierarchySteps: steps.map((p) => ({ id: p.id, type: p.type })),
      },
    }
    applied += 1
  }

  if (applied > 0) {
    warnings.unshift(`Nomeclatura Class Group (nomecratura.md): ${String(applied)} schema(s) actualizados.`)
  }

  return { schemas: next, appliedCount: applied, warnings }
}

/**
 * Preenche `group` e `collection` a partir do texto ritual (Particle Editor Jade + VFX)
 * quando há `VfxSystemDefinitionData`. Mantém `collectionType` já presente ou deriva do `title`.
 */
export function applyNomenclatureFromBinRitualText(
  ritualText: string,
  schemas: NodeSchemaDefinition[],
): ApplyBinNomenclaturaResult {
  const normalized = normalizeLineEndings(ritualText)
  const parsed = parseVfxContent(normalized)
  const warnings: string[] = []

  if (parsed.systemOrder.length === 0) {
    return {
      schemas: schemas.map((s) => ({ ...s })),
      appliedCount: 0,
      warnings: [
        'Nenhum «… = VfxSystemDefinitionData {» no texto — nomeclatura a partir do .bin só aplica em trechos Particle Editor Jade (VFX).',
      ],
    }
  }

  const next: NodeSchemaDefinition[] = schemas.map((s) => ({
    ...s,
    nomenclature: s.nomenclature ? { ...s.nomenclature } : undefined,
  }))

  let applied = 0

  const emitterRefs = flattenEmitterRefs(parsed)

  let emitterOrdinal = 0
  for (let si = 0; si < next.length; si++) {
    const s = next[si]!
    if (!s.id.startsWith('vfx-em-')) {
      continue
    }
    if (emitterOrdinal >= emitterRefs.length) {
      warnings.push(`Emitter schema «${s.id}» a mais face ao .bin.`)
      continue
    }
    const nom = s.nomenclature
    const collectionType = nom?.collectionType?.trim()
      ? nom.collectionType.trim()
      : extractTitleCategoryPrefix(s.title)
    const ref = emitterRefs[emitterOrdinal]!
    const pathHierarchySteps = buildVfxJadePathHierarchySteps('emitter', normalized, {
      systemKey: ref.systemKey,
      emitterName: ref.emitterName,
    })
    const pathHierarchy = segmentsToPathHierarchyString(pathHierarchySteps)
    next[si] = {
      ...s,
      nomenclature: {
        group: VFX_JADE_EMITTER_EMBED_GROUP,
        collection: VFX_JADE_EMITTER_EMBED_COLLECTION,
        collectionType,
        pathHierarchy,
        pathHierarchySteps,
      },
    }
    emitterOrdinal += 1
    applied += 1
  }

  if (emitterOrdinal < emitterRefs.length) {
    warnings.push(
      `Faltam ${String(emitterRefs.length - emitterOrdinal)} schema(s) emitter na paleta para cobrir o .bin.`,
    )
  }

  for (let si = 0; si < next.length; si++) {
    const s = next[si]!
    if (!s.id.startsWith('vfx-sys-')) {
      continue
    }

    const pathParam = s.parameters.find((p) => p.name === 'systemPath')
    const systemKey =
      pathParam?.type === 'string' ? stripStringDefault(pathParam.defaultValue) : null

    if (!systemKey || !parsed.systems[systemKey]) {
      warnings.push(
        `Sistema «${s.id}»: systemPath não coincide com chave no .bin (${systemKey ?? '—'}).`,
      )
      continue
    }

    const nom = s.nomenclature
    const collectionType = nom?.collectionType?.trim()
      ? nom.collectionType.trim()
      : extractTitleCategoryPrefix(s.title)

    const pathHierarchySteps = buildVfxJadePathHierarchySteps('system', normalized, { systemKey })
    const pathHierarchy = segmentsToPathHierarchyString(pathHierarchySteps)
    next[si] = {
      ...s,
      nomenclature: {
        group: VFX_JADE_SYSTEM_ROOT_GROUP,
        collection: VFX_JADE_SYSTEM_ROOT_COLLECTION,
        collectionType,
        pathHierarchy,
        pathHierarchySteps,
      },
    }
    applied += 1
  }

  warnings.unshift(`Nomeclatura nomecratura.md (VFX): ${String(applied)} schema(s) actualizados.`)

  return { schemas: next, appliedCount: applied, warnings }
}
