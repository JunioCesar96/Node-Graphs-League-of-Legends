/**
 * Interpretação compacta das propriedades `ltk_meta::BinProperty` conforme aparecem
 * no JSON de `serde` (tag/kind em `BinPropertyKind`, `PropertyValueEnum` com tag+value).
 * Suporta variações comuns quando o campo `kind` vem como u8 ou o valor vem empacotado.
 */

import { isHashPathHintGloballyEnabled } from '@/core/ltkBinTreeFlags'

export type JadePropertyRow = {
  kindLabel: string
  /** Valor já resumido para uma linha do inspector Jade-like */
  preview: string
  nameHashKey: number
  /** Alguns tipos repetem hash no corpo vs chave JSON */
  nameHashEmbedded?: number | null
  /** Ligação forte a outro `path_hash` no mesmo BinTree (`ObjectLink`) */
  linkPathHash?: number | null
}

/** Ordem igual a `ltk_meta::BinPropertyKind` (exceto valores complexos compostos como 128+). */
export const BIN_PROPERTY_KIND_BY_DISCRIMINANT = [
  'None',
  'Bool',
  'I8',
  'U8',
  'I16',
  'U16',
  'I32',
  'U32',
  'I64',
  'U64',
  'F32',
  'Vector2',
  'Vector3',
  'Vector4',
  'Matrix44',
  'Color',
  'String',
  'Hash',
  'WadChunkLink',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function discriminantToKindLabel(disc: number): string {
  if (disc >= 0 && disc < BIN_PROPERTY_KIND_BY_DISCRIMINANT.length) {
    return BIN_PROPERTY_KIND_BY_DISCRIMINANT[disc] ?? `Kind(${String(disc)})`
  }

  if (disc === 128) {
    return 'Container'
  }

  if (disc === 129) {
    return 'UnorderedContainer'
  }

  if (disc === 130) {
    return 'Struct'
  }

  if (disc === 131) {
    return 'Embedded'
  }

  if (disc === 132) {
    return 'ObjectLink'
  }

  if (disc === 133) {
    return 'Optional'
  }

  if (disc === 134) {
    return 'Map'
  }

  if (disc === 135) {
    return 'BitBool'
  }

  return `Kind(${String(disc)})`
}

export function normalizePropertyKind(raw: unknown): string {
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim()
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return discriminantToKindLabel(Math.trunc(raw))
  }

  return 'Unknown'
}

export function hexU32Property(hash: number) {
  return `0x${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function readU32ish(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw >>> 0
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim()

    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      const n = Number.parseInt(trimmed.slice(2), 16)

      return Number.isFinite(n) ? n >>> 0 : null
    }

    const parsed = Number.parseInt(trimmed, 10)

    return Number.isFinite(parsed) ? parsed >>> 0 : null
  }

  return null
}

function extractNewtypeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (Array.isArray(value) && value.length > 0) {
    const head = value[0]

    if (typeof head === 'number' && Number.isFinite(head)) {
      return head
    }
  }

  if (isRecord(value)) {
    if ('Signed' in value && Array.isArray(value.Signed) && value.Signed.length > 0) {
      const v = value.Signed[0]

      if (typeof v === 'number' && Number.isFinite(v)) {
        return v
      }
    }

    if ('Unsigned' in value && Array.isArray(value.Unsigned) && value.Unsigned.length > 0) {
      const v = value.Unsigned[0]

      if (typeof v === 'number' && Number.isFinite(v)) {
        return v >>> 0
      }
    }
  }

  return null
}

function truncateReadableLabel(candidate: string, maxChars: number) {
  if (candidate.length <= maxChars) {
    return candidate
  }

  return `${candidate.slice(0, Math.max(0, maxChars - 1))}…`
}

function hexWithOptionalHumanLabel(hexCore: string, pathHashUnsigned: number, pathLabels?: ReadonlyMap<number, string>) {
  const label = pathLabels?.get(pathHashUnsigned >>> 0)

  if (!label?.trim()) {
    return hexCore
  }

  return `${truncateReadableLabel(label.trim(), 48)} ${hexCore}`
}

function formatValueBrief(
  kindLabel: string,
  value: unknown,
  depth: number,
  pathLabels?: ReadonlyMap<number, string>,
): string {
  if (depth > 5) {
    return '…'
  }

  const k = kindLabel

  if (k === 'None' || value === null) {
    return 'none'
  }

  if (k === 'String' && typeof value === 'string') {
    const shown = value.length > 72 ? `${value.slice(0, 72)}…` : value

    return JSON.stringify(shown)
  }

  if (
    k === 'I32' ||
    k === 'U32' ||
    k === 'I16' ||
    k === 'U16' ||
    k === 'I8' ||
    k === 'U8' ||
    k === 'I64' ||
    k === 'U64' ||
    k === 'F32' ||
    k === 'Bool' ||
    k === 'BitBool' ||
    k === 'Hash' ||
    k === 'ObjectLink' ||
    k === 'WadChunkLink'
  ) {
    const n = extractNewtypeNumber(value)

    if (n !== null) {
      if (k === 'Hash' || k === 'ObjectLink') {
        const u = n >>> 0

        return hexWithOptionalHumanLabel(hexU32Property(u), u, pathLabels)
      }

      return String(n)
    }
  }

  if (k === 'Vector2' || k === 'Vector3' || k === 'Vector4') {
    if (Array.isArray(value)) {
      return `[${value.map((v) => (typeof v === 'number' ? v.toFixed(4) : String(v))).join(', ')}]`
    }
  }

  if (k === 'Container' || k === 'UnorderedContainer') {
    if (isRecord(value) && Array.isArray(value.items)) {
      const itemKind =
        typeof value.item_kind === 'string' ? value.item_kind : discriminantToKindLabel(Number(value.item_kind))

      return `${String(value.items.length)}× ${itemKind}`
    }
  }

  if (k === 'Map' && isRecord(value)) {
    const keys = Object.keys(value)

    return `map keys: ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? '…' : ''}`
  }

  if (k === 'Optional' && isRecord(value)) {
    return `optional(${Object.keys(value).join(',')})`
  }

  if (k === 'Struct' || k === 'Embedded') {
    if (isRecord(value) && Object.keys(value).length <= 6) {
      try {
        return JSON.stringify(value)
      } catch {
        return '(struct)'
      }
    }

    return '(struct…)'
  }

  try {
    const text = JSON.stringify(value)

    return text.length > 96 ? `${text.slice(0, 96)}…` : text
  } catch {
    return String(value)
  }
}

function parseNameHashKey(mapKey: string): number | null {
  const withPrefix = readU32ish(mapKey)

  if (withPrefix !== null) {
    return withPrefix
  }

  const compact = mapKey.trim()

  if (/^\d+$/.test(compact)) {
    const decimal = Number.parseInt(compact, 10)

    return Number.isFinite(decimal) ? decimal >>> 0 : null
  }

  if (/^[0-9a-f]{8}$/i.test(compact)) {
    const n = Number.parseInt(compact, 16)

    return Number.isFinite(n) ? n >>> 0 : null
  }

  return null
}

function isFlattenedVariant(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && 'kind' in value && Reflect.get(value, 'value') !== undefined
}

export type JadeLinkSemantic = 'object_link' | 'hash_path_hint'

/** Target + id estável para GraphCanvas (`olk-*` ou `hlk-*`). */
export type JadeObjectLinkDraft = {
  /** Sufixo único por objeto/propriedade; ex.: "111" ou "50_0" (container índice 0) */
  entityBody: string
  ownerPropNameHash: number
  targetPathHash: number
  semantic: JadeLinkSemantic
}

/**
 * Descobre todas as referências `ObjectLink` (topo + dentro de Container, Optional,
 * Struct/Embedded) tal como aparecem no JSON `serde` de `ltk_meta`.
 */
export function collectObjectLinksFromBinProperties(
  propertiesUnknown: unknown,
  snapshotPathHashes?: ReadonlySet<number>,
): JadeObjectLinkDraft[] {
  if (!isRecord(propertiesUnknown)) {
    return []
  }

  const results: JadeObjectLinkDraft[] = []
  const inferredSnapshot = snapshotPathHashes ?? new Set<number>()
  const emitHashHints =
    snapshotPathHashes !== undefined &&
    snapshotPathHashes.size > 0 &&
    isHashPathHintGloballyEnabled()

  for (const [mapKey, propUnknown] of Object.entries(propertiesUnknown)) {
    if (!isRecord(propUnknown)) {
      continue
    }

    const nameFromKey = parseNameHashKey(mapKey)
    const nameEmbedded =
      typeof propUnknown.name_hash === 'number'
        ? propUnknown.name_hash >>> 0
        : readU32ish(propUnknown.name_hash)

    const ownerPropHash = (nameEmbedded ?? nameFromKey ?? 0) >>> 0
    const kindLabel = normalizePropertyKind(propUnknown.kind)
    const rawValue = Reflect.get(propUnknown, 'value')

    walkValueForObjectLinks(kindLabel, rawValue, ownerPropHash, [], 0, results, {
      emitHashPathHints: emitHashHints,
      snapshotPathHashes: inferredSnapshot,
    })
  }

  return results.sort((first, second) => {
    if (first.ownerPropNameHash !== second.ownerPropNameHash) {
      return first.ownerPropNameHash - second.ownerPropNameHash
    }

    return first.entityBody.localeCompare(second.entityBody)
  })
}

type WalkObjectLinkAccumulatorOptions = Readonly<{
  emitHashPathHints: boolean
  snapshotPathHashes: ReadonlySet<number>
}>

/** Regista `ObjectLink` e opcionalmente `Hash` quando o valor coincide com um `path_hash` no mesmo snapshot. */
function walkValueForObjectLinks(
  kindLabel: string,
  raw: unknown,
  ownerPropHash: number,
  pathIndexes: readonly number[],
  depth: number,
  out: JadeObjectLinkDraft[],
  options: WalkObjectLinkAccumulatorOptions,
): void {
  if (depth > 32) {
    return
  }

  if (kindLabel === 'ObjectLink') {
    const target = extractNewtypeNumber(raw)

    if (target !== null) {
      const bodySuffix = pathIndexes.length > 0 ? pathIndexes.join('_') : ''
      const entityBody = bodySuffix === '' ? String(ownerPropHash >>> 0) : `${ownerPropHash >>> 0}_${bodySuffix}`

      out.push({
        entityBody,
        ownerPropNameHash: ownerPropHash >>> 0,
        semantic: 'object_link',
        targetPathHash: target >>> 0,
      })
    }

    return
  }

  if (options.emitHashPathHints && kindLabel === 'Hash') {
    const hinted = extractNewtypeNumber(raw)

    if (hinted !== null) {
      const pathTarget = hinted >>> 0

      if (options.snapshotPathHashes.has(pathTarget)) {
        const bodySuffix = pathIndexes.length > 0 ? pathIndexes.join('_') : ''
        const entityBody =
          bodySuffix === ''
            ? `hash_${ownerPropHash >>> 0}_${pathTarget}`
            : `hash_${ownerPropHash >>> 0}_${bodySuffix}_${pathTarget}`

        out.push({
          entityBody,
          ownerPropNameHash: ownerPropHash >>> 0,
          semantic: 'hash_path_hint',
          targetPathHash: pathTarget,
        })
      }
    }

    return
  }

  if (kindLabel === 'Container' || kindLabel === 'UnorderedContainer') {
    if (!isRecord(raw) || !Array.isArray(raw.items)) {
      return
    }

    for (let itemIndex = 0; itemIndex < raw.items.length; itemIndex += 1) {
      const slot = Reflect.get(raw.items, itemIndex)

      if (!isFlattenedVariant(slot)) {
        continue
      }

      const childKind = normalizePropertyKind(slot.kind)
      const childValue = Reflect.get(slot, 'value')

      walkValueForObjectLinks(childKind, childValue, ownerPropHash, [...pathIndexes, itemIndex], depth + 1, out, options)
    }

    return
  }

  if (kindLabel === 'Optional') {
    if (!isRecord(raw)) {
      return
    }

    let innerResolved: unknown = Reflect.get(raw, 'value')

    if (innerResolved === undefined) {
      innerResolved = Reflect.get(raw, 'Value')
    }

    if (innerResolved === null || innerResolved === undefined) {
      return
    }

    if (isRecord(innerResolved) && Reflect.has(innerResolved, 'Some')) {
      innerResolved =
        Reflect.get(innerResolved, 'Some') ??
        Reflect.get(innerResolved, 'some') ??
        innerResolved
    }

    if (!isFlattenedVariant(innerResolved)) {
      return
    }

    const optionalInnerKind = normalizePropertyKind(innerResolved.kind)
    const optionalInnerValue = Reflect.get(innerResolved, 'value')

    walkValueForObjectLinks(
      optionalInnerKind,
      optionalInnerValue,
      ownerPropHash,
      pathIndexes,
      depth + 1,
      out,
      options,
    )

    return
  }

  if (kindLabel === 'Struct' || kindLabel === 'Embedded') {
    if (!isRecord(raw)) {
      return
    }

    const nestedBucket = Reflect.get(raw, 'properties')

    if (!isRecord(nestedBucket)) {
      return
    }

    for (const [nestedMapKey, nestedUnknown] of Object.entries(nestedBucket)) {
      if (!isRecord(nestedUnknown)) {
        continue
      }

      const nestedFromKey = parseNameHashKey(nestedMapKey)
      const nestedEmbedded =
        typeof nestedUnknown.name_hash === 'number'
          ? nestedUnknown.name_hash >>> 0
          : readU32ish(nestedUnknown.name_hash)

      const nestedOwnerHash = (nestedEmbedded ?? nestedFromKey ?? 0) >>> 0
      const nestedKindLabel = normalizePropertyKind(nestedUnknown.kind)
      const nestedRawValue = Reflect.get(nestedUnknown, 'value')

      walkValueForObjectLinks(
        nestedKindLabel,
        nestedRawValue,
        nestedOwnerHash,
        [],
        depth + 1,
        out,
        options,
      )
    }

    return
  }

  if (kindLabel === 'Map') {
    if (!isRecord(raw)) {
      return
    }

    const bucketUnknown: unknown = Reflect.get(raw, 'entries') ?? Reflect.get(raw, 'Entries')
    let valueSequence: unknown[] = []

    if (isRecord(bucketUnknown)) {
      valueSequence = Object.values(bucketUnknown)
    } else if (Array.isArray(bucketUnknown)) {
      valueSequence = bucketUnknown
        .filter((candidate): candidate is Record<string, unknown> => isRecord(candidate))
        .flatMap((entryRow) =>
          Reflect.get(entryRow, 'value') ??
            Reflect.get(entryRow, 'Value') ??
            Reflect.get(entryRow, '1') ??
            undefined,
        )
        .filter((candidate) => candidate !== undefined && candidate !== null)
    }

    let ordinal = 0

    for (const mapValueCandidate of valueSequence) {
      if (!isFlattenedVariant(mapValueCandidate)) {
        ordinal += 1
        continue
      }

      const mapChildKind = normalizePropertyKind(mapValueCandidate.kind)
      const mapChildValue = Reflect.get(mapValueCandidate, 'value')

      walkValueForObjectLinks(
        mapChildKind,
        mapChildValue,
        ownerPropHash,
        [...pathIndexes, ordinal],
        depth + 1,
        out,
        options,
      )

      ordinal += 1
    }
  }
}

type GatherSubtreeRefsContext = {
  /** Omitir apenas o primeiro ObjectLink superficial (valor directo da propriedade Jade). */
  omitTopPrimitiveObjectLink: boolean
  /** Omitir apenas o primeiro `Hash` superficial quando marca outro objeto no mesmo snapshot (`VITE_LTK_HASH_AS_EDGE`). */
  omitTopPrimitiveHashPointer: boolean
  snapshotPathHashes?: ReadonlySet<number>
}

/** Recolhe `path_hash` alvo na sub-árvore para dicas `[→…]` na tabela Jade. */
function gatherSubtreeWalkPreviewTargets(
  kindLabel: string,
  raw: unknown,
  targets: Set<number>,
  depth: number,
  context: GatherSubtreeRefsContext,
): void {
  if (depth > 48) {
    return
  }

  if (kindLabel === 'ObjectLink') {
    const skipOnlyRootPrimitive = context.omitTopPrimitiveObjectLink && depth === 0

    if (!skipOnlyRootPrimitive) {
      const target = extractNewtypeNumber(raw)

      if (target !== null) {
        targets.add(target >>> 0)
      }
    }

    return
  }

  if (kindLabel === 'Hash' && context.snapshotPathHashes?.size && isHashPathHintGloballyEnabled()) {
    const skipOnlyRootPrimitive = context.omitTopPrimitiveHashPointer && depth === 0

    if (!skipOnlyRootPrimitive) {
      const target = extractNewtypeNumber(raw)

      if (target !== null && context.snapshotPathHashes.has(target >>> 0)) {
        targets.add(target >>> 0)
      }
    }

    return
  }

  if (kindLabel === 'Container' || kindLabel === 'UnorderedContainer') {
    if (!isRecord(raw) || !Array.isArray(raw.items)) {
      return
    }

    for (let index = 0; index < raw.items.length; index += 1) {
      const slot = Reflect.get(raw.items, index)

      if (!isFlattenedVariant(slot)) {
        continue
      }

      gatherSubtreeWalkPreviewTargets(
        normalizePropertyKind(slot.kind),
        Reflect.get(slot, 'value'),
        targets,
        depth + 1,
        context,
      )
    }

    return
  }

  if (kindLabel === 'Optional') {
    if (!isRecord(raw)) {
      return
    }

    let innerResolved: unknown = Reflect.get(raw, 'value')

    if (innerResolved === undefined) {
      innerResolved = Reflect.get(raw, 'Value')
    }

    if (innerResolved === null || innerResolved === undefined) {
      return
    }

    if (isRecord(innerResolved) && Reflect.has(innerResolved, 'Some')) {
      innerResolved =
        Reflect.get(innerResolved, 'Some') ??
        Reflect.get(innerResolved, 'some') ??
        innerResolved
    }

    if (!isFlattenedVariant(innerResolved)) {
      return
    }

    gatherSubtreeWalkPreviewTargets(
      normalizePropertyKind(innerResolved.kind),
      Reflect.get(innerResolved, 'value'),
      targets,
      depth + 1,
      context,
    )

    return
  }

  if (kindLabel === 'Struct' || kindLabel === 'Embedded') {
    if (!isRecord(raw)) {
      return
    }

    const nestedBucket = Reflect.get(raw, 'properties')

    if (!isRecord(nestedBucket)) {
      return
    }

    for (const nestedUnknown of Object.values(nestedBucket)) {
      if (!isRecord(nestedUnknown)) {
        continue
      }

      gatherSubtreeWalkPreviewTargets(
        normalizePropertyKind(nestedUnknown.kind),
        Reflect.get(nestedUnknown, 'value'),
        targets,
        depth + 1,
        context,
      )
    }

    return
  }

  if (kindLabel === 'Map') {
    if (!isRecord(raw)) {
      return
    }

    const bucketUnknown: unknown = Reflect.get(raw, 'entries') ?? Reflect.get(raw, 'Entries')
    let valueSequence: unknown[] = []

    if (isRecord(bucketUnknown)) {
      valueSequence = Object.values(bucketUnknown)
    } else if (Array.isArray(bucketUnknown)) {
      valueSequence = bucketUnknown
        .filter((candidate): candidate is Record<string, unknown> => isRecord(candidate))
        .flatMap((entryRow) =>
          Reflect.get(entryRow, 'value') ??
            Reflect.get(entryRow, 'Value') ??
            Reflect.get(entryRow, '1') ??
            undefined,
        )
        .filter((candidate) => candidate !== undefined && candidate !== null)
    }

    for (const mapValueCandidate of valueSequence) {
      if (!isFlattenedVariant(mapValueCandidate)) {
        continue
      }

      gatherSubtreeWalkPreviewTargets(
        normalizePropertyKind(mapValueCandidate.kind),
        Reflect.get(mapValueCandidate, 'value'),
        targets,
        depth + 1,
        context,
      )
    }
  }
}

function formatObjectLinkHexWithSnapshot(
  pathHashUnsigned: number,
  snapshotPathHashes: ReadonlySet<number> | undefined,
  pathLabels?: ReadonlyMap<number, string>,
): string {
  let hexDisplay = hexU32Property(pathHashUnsigned)

  hexDisplay = hexWithOptionalHumanLabel(hexDisplay, pathHashUnsigned >>> 0, pathLabels)

  if (snapshotPathHashes === undefined || snapshotPathHashes.has(pathHashUnsigned >>> 0)) {
    return hexDisplay
  }

  return `${hexDisplay}(fora)`
}

function augmentPreviewWithSubtreeRefs(
  kindLabel: string,
  rawValue: unknown,
  preview: string,
  snapshotPathHashes?: ReadonlySet<number>,
  pathLabels?: ReadonlyMap<number, string>,
): string {
  const subtree = new Set<number>()

  gatherSubtreeWalkPreviewTargets(kindLabel, rawValue, subtree, 0, {
    omitTopPrimitiveHashPointer: kindLabel === 'Hash',
    omitTopPrimitiveObjectLink: kindLabel === 'ObjectLink',
    snapshotPathHashes,
  })

  const sortedTargets = [...subtree]

  sortedTargets.sort((first, second) => first - second)

  if (sortedTargets.length === 0) {
    return preview
  }

  const maxShow = 4
  const head = sortedTargets
    .slice(0, maxShow)
    .map((candidate) => formatObjectLinkHexWithSnapshot(candidate >>> 0, snapshotPathHashes, pathLabels))
  const more = sortedTargets.length > maxShow ? ` +${sortedTargets.length - maxShow}` : ''

  return `${preview}  [→ ${head.join(', ')}${more}]`
}

/** Linhas Jade-like por propriedade; opcionalmente `snapshotPathHashes` marca referências externas com `(fora)`. */
export function collectJadePropertyRows(
  propertiesUnknown: unknown,
  snapshotPathHashes?: ReadonlySet<number>,
  pathLabels?: ReadonlyMap<number, string>,
): JadePropertyRow[] {
  if (!isRecord(propertiesUnknown)) {
    return []
  }

  const rows: JadePropertyRow[] = []

  for (const [mapKey, propUnknown] of Object.entries(propertiesUnknown)) {
    if (!isRecord(propUnknown)) {
      continue
    }

    const nameFromKey = parseNameHashKey(mapKey)
    const nameEmbedded =
      typeof propUnknown.name_hash === 'number'
        ? propUnknown.name_hash >>> 0
        : readU32ish(propUnknown.name_hash)

    const nameHashKey = (nameEmbedded ?? nameFromKey ?? 0) >>> 0
    const kindLabel = normalizePropertyKind(propUnknown.kind)
    const rawValue = Reflect.get(propUnknown, 'value')
    const preview = augmentPreviewWithSubtreeRefs(
      kindLabel,
      rawValue,
      formatValueBrief(kindLabel, rawValue, 0, pathLabels),
      snapshotPathHashes,
      pathLabels,
    )

    let linkPathHash: number | null = null

    if (kindLabel === 'ObjectLink') {
      const target = extractNewtypeNumber(rawValue)

      if (target !== null) {
        linkPathHash = target >>> 0
      }
    } else if (kindLabel === 'Hash' && snapshotPathHashes !== undefined && isHashPathHintGloballyEnabled()) {
      const target = extractNewtypeNumber(rawValue)

      if (target !== null && snapshotPathHashes.has(target >>> 0)) {
        linkPathHash = target >>> 0
      }
    }

    rows.push({
      kindLabel,
      linkPathHash,
      nameHashEmbedded: nameEmbedded,
      nameHashKey,
      preview,
    })
  }

  return rows.sort((first, second) => first.nameHashKey - second.nameHashKey)
}

export function buildJadePropertyTableText(
  rows: JadePropertyRow[],
  maxLines: number,
  snapshotPathHashes?: ReadonlySet<number>,
  pathLabels?: ReadonlyMap<number, string>,
): string {
  if (rows.length === 0) {
    return '(sem propriedades)'
  }

  const header = 'name_hash (key)   kind                preview'
  const lines = rows.slice(0, maxLines).map((row) => {
    const hashLabel = hexU32Property(row.nameHashKey)
    const kindCell = row.kindLabel.padEnd(18, ' ')
    const linkNote =
      row.linkPathHash != null
        ? `  →${formatObjectLinkHexWithSnapshot(row.linkPathHash >>> 0, snapshotPathHashes, pathLabels)}`
        : ''

    return `${hashLabel}  ${kindCell}  ${row.preview}${linkNote}`
  })

  const overflow =
    rows.length > maxLines ? `\n… +${rows.length - maxLines} propriedades (truncado para o inspector)` : ''

  return `${header}\n${lines.join('\n')}${overflow}`
}
