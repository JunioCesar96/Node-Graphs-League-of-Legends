import type { CanvasConnection, CanvasNode, CanvasScene } from '@/core/canvasScene'
import { defaultNewCanvasNodeLayout } from '@/core/nodeCardSections'
import type { NodeInstance, NodeParameterValue, NodeSchemaDefinition } from '@/core/nodeSchema'
import { parseOptionalPathLabelsFromBinTreePayload } from '@/core/ltkBinTreeLabels'
import {
  type JadeLinkSemantic,
  type JadePropertyRow,
  buildJadePropertyTableText,
  collectObjectLinksFromBinProperties,
  collectJadePropertyRows,
} from '@/core/ltkBinTreePropertyFormat'

const BIN_OBJECT_SCHEMA_ID = 'ltk-bin-object-jade-v1'
const BIN_FILE_META_SCHEMA_ID = 'ltk-bin-file-meta-jade-v1'

/** Texto fixo no inspector do nó meta (explica subnós olk / hlk no canvas). */
const BIN_TREE_GRAPH_LEGEND_COMMENT =
  'ObjectLink · subnós `olk-*`: referência forte no modelo Jade. Hash→ · subnós `hlk-*`: propriedade kind Hash cujo número coincide com outro `path_hash` neste snapshot (heurística; desliga no build frontend com `VITE_LTK_HASH_AS_EDGE=false`). Opcional: `_path_labels` no root enriquece etiquetas no inspector. Ponte: `jade-http-bridge` (Rust) ou mock Node com `JADE_CONVERT_TREE_BINARY`.'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hexU32(hash: number) {
  return `0x${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function summarizeForeignObjectLinkTargets(foreignPathHashes: ReadonlySet<number>, maxLines: number, maxChars: number) {
  if (foreignPathHashes.size === 0) {
    return '(sem ObjectLink para um path_hash que não exista neste snapshot)'
  }

  const ascending = [...foreignPathHashes].map((candidate) => candidate >>> 0).sort((first, second) => first - second)
  const lines = ascending.slice(0, maxLines).map((candidate) => hexU32(candidate))
  let text =
    `# path_hash únicos absentes (${String(foreignPathHashes.size)}) — até ${String(maxLines)} linhas\n${lines.join('\n')}`
  const overflowLineCount = Math.max(ascending.length - maxLines, 0)

  if (overflowLineCount > 0) {
    text += `\n… +${String(overflowLineCount)} outros`
  }

  if (text.length > maxChars) {
    return `${text.slice(0, maxChars)}\n…`
  }

  return text
}

/** Formato `ltk_meta::BinTree` como devolvido por `serde_json` (keys de mapas como string). */
function readPathHash(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw
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

/** Deteta snapshot JSON típico de `ltk_meta::BinTree`, evitindo colidir com `{ format: 'node-graphs-lol' }`. */
export function isLikelyLtkBinTreeJson(payload: unknown): boolean {
  if (!isRecord(payload)) {
    return false
  }

  if ('format' in payload && payload.format === 'node-graphs-lol') {
    return false
  }

  const objectsCandidate = payload.objects

  const hasStructuredObjects =
    isRecord(objectsCandidate) &&
    Object.values(objectsCandidate).some((entry) => {
      if (!isRecord(entry)) {
        return false
      }

      return typeof entry.path_hash === 'number' && typeof entry.class_hash === 'number' && 'properties' in entry
    })

  const hasTreeHints =
    typeof payload.version === 'number' ||
    typeof payload.is_override === 'boolean' ||
    (Array.isArray(payload.dependencies) && payload.dependencies.every((d) => typeof d === 'string'))

  const hasNamedObjectsBucket = 'objects' in payload && objectsCandidate !== null && objectsCandidate !== undefined

  return hasNamedObjectsBucket && (hasStructuredObjects || (isRecord(objectsCandidate) && hasTreeHints))
}

type ObjectGraphLinkDraft = {
  entityBodySanitized: string
  semantic: JadeLinkSemantic
  targetPathHash: number
}

function truncateTitleLabel(candidate: string, maxChars: number) {
  if (candidate.length <= maxChars) {
    return candidate
  }

  return `${candidate.slice(0, Math.max(0, maxChars - 1))}…`
}

function dedupeStableLinkDrafts(
  drafts: readonly { entityBody: string; semantic: JadeLinkSemantic; targetPathHash: number }[],
): ObjectGraphLinkDraft[] {
  const seenSig = new Set<string>()
  const result: ObjectGraphLinkDraft[] = []

  for (const draft of drafts) {
    const entityBodySanitized = draft.entityBody.replace(/[^0-9A-Za-z_]/g, '_')
    const semantic = draft.semantic
    const signature = `${semantic}|${entityBodySanitized}->${draft.targetPathHash >>> 0}`

    if (seenSig.has(signature)) {
      continue
    }

    seenSig.add(signature)
    result.push({
      entityBodySanitized,
      semantic,
      targetPathHash: draft.targetPathHash >>> 0,
    })
  }

  return result
}

function buildFileMetaSchema(options: {
  dependencies: string[]
  extratreeObjectLinks: number
  foreignObjectTargetsPreviewText: string
  hashPathHintEdges: number
  intratreeObjectLinks: number
  isOverride: boolean | undefined
  objectCount: number
  pathLabelBucketCount?: number
  versionLabel: string
}): NodeSchemaDefinition {
  const depText =
    options.dependencies.length > 0 ? options.dependencies.join('\n') : '(sem dependências listadas neste BinTree JSON)'

  return {
    id: BIN_FILE_META_SCHEMA_ID,
    title: 'Bin file (ltk_meta)',
    parameters: [
      {
        defaultValue: options.versionLabel,
        id: 'tree-version',
        name: 'version',
        type: 'string',
      },
      {
        defaultValue: options.isOverride === undefined ? '(desconhecido)' : options.isOverride ? 'true' : 'false',
        id: 'is-override',
        name: 'is_override',
        type: 'keyword',
      },
      {
        defaultValue: String(options.objectCount),
        id: 'object-count',
        name: 'objects',
        type: 'integer',
      },
      {
        defaultValue: String(options.pathLabelBucketCount ?? 0),
        id: 'path-label-count',
        name: 'path_label_entries',
        type: 'integer',
      },
      {
        defaultValue: String(options.intratreeObjectLinks),
        id: 'intratree-links',
        name: 'object_links_intratree',
        type: 'integer',
      },
      {
        defaultValue: String(options.hashPathHintEdges),
        id: 'hash-path-hints',
        name: 'hash_path_hint_edges',
        type: 'integer',
      },
      {
        defaultValue: String(options.extratreeObjectLinks),
        id: 'extratree-links',
        name: 'object_links_extratree',
        type: 'integer',
      },
      {
        defaultValue: BIN_TREE_GRAPH_LEGEND_COMMENT,
        id: 'bintree-graph-legend',
        name: 'legenda grafo (olk / Hash→)',
        type: 'comment',
      },
      {
        defaultValue: options.foreignObjectTargetsPreviewText,
        id: 'foreign-objectlink-targets',
        name: 'objectlink_targets_extratree',
        type: 'comment',
      },
      {
        defaultValue: depText,
        id: 'dependencies',
        name: 'dependencies',
        type: 'comment',
      },
    ],
    internalStructures: [
      {
        id: 'ref-out',
        name: 'Ref',
        schemaId: 'emitter-shape',
      },
    ],
  }
}

function buildBinObjectJadeSchema(
  pathHash: number,
  classHash: number,
  propertyRows: JadePropertyRow[],
  objectGraphDrafts: ObjectGraphLinkDraft[],
  snapshotPathHashes: ReadonlySet<number>,
  pathLabels?: ReadonlyMap<number, string>,
): { propertyTableText: string; schema: NodeSchemaDefinition } {
  const propertyTableText = buildJadePropertyTableText(propertyRows, 320, snapshotPathHashes, pathLabels)

  const linkEntities = objectGraphDrafts.map((draft) => ({
    id: draft.semantic === 'hash_path_hint' ? `hlk-${draft.entityBodySanitized}` : `olk-${draft.entityBodySanitized}`,
    name: draft.semantic === 'hash_path_hint' ? 'Hash→' : 'ObjectLink',
    schemaId: 'emitter-shape',
  }))

  return {
    propertyTableText,
    schema: {
      internalStructures: [
        {
          id: 'ref-out',
          name: 'Ref',
          schemaId: 'emitter-shape',
        },
        ...linkEntities,
      ],
      id: BIN_OBJECT_SCHEMA_ID,
      parameters: [
        {
          defaultValue: hexU32(pathHash),
          id: 'path-hash',
          name: 'path_hash',
          type: 'string',
        },
        {
          defaultValue: hexU32(classHash),
          id: 'class-hash',
          name: 'class_hash',
          type: 'string',
        },
        {
          defaultValue: String(propertyRows.length),
          id: 'property-count',
          name: 'property_count',
          type: 'integer',
        },
        {
          defaultValue: propertyTableText,
          id: 'jade-property-table',
          name: 'properties (Jade)',
          type: 'comment',
        },
      ],
      title: (() => {
        const hexPiece = hexU32(pathHash)
        const trimmed = pathLabels?.get(pathHash >>> 0)?.trim()

        if (trimmed) {
          return `${truncateTitleLabel(trimmed, 40)} (${hexPiece}) · class ${hexU32(classHash)}`
        }

        return `${hexPiece} · class ${hexU32(classHash)}`
      })(),
    },
  }
}

function coerceBinTreeObjects(objectsUnknown: unknown): Array<{ pathHash: number; classHash: number; properties: unknown }> {
  if (!isRecord(objectsUnknown)) {
    return []
  }

  const result: Array<{ pathHash: number; classHash: number; properties: unknown }> = []

  for (const [maybeKey, value] of Object.entries(objectsUnknown)) {
    if (!isRecord(value)) {
      continue
    }

    const pathHashResolved =
      typeof value.path_hash === 'number'
        ? value.path_hash >>> 0
        : readPathHash((value as Record<string, unknown>).path_hash) ?? readPathHash(maybeKey)

    if (pathHashResolved === null) {
      continue
    }

    const classHash =
      typeof value.class_hash === 'number' ? value.class_hash >>> 0 : readPathHash(value.class_hash) ?? 0

    result.push({
      classHash,
      pathHash: pathHashResolved >>> 0,
      properties: Reflect.get(value, 'properties'),
    })
  }

  return result.sort((first, second) => first.pathHash - second.pathHash)
}

/** Converte snapshot `BinTree` (JSON Jade / `ltk_meta`) para uma cena de canvas com nó meta + um nó por objecto (modelo Jade). */
export function binTreeJsonToCanvasScene(treeUnknown: unknown): CanvasScene | null {
  if (!isLikelyLtkBinTreeJson(treeUnknown) || !isRecord(treeUnknown)) {
    return null
  }

  const entries = coerceBinTreeObjects(treeUnknown.objects)

  const dependencies = Array.isArray(treeUnknown.dependencies)
    ? treeUnknown.dependencies.filter((dependency): dependency is string => typeof dependency === 'string')
    : []

  const existsPath = new Set(entries.map((item) => item.pathHash >>> 0))
  const pathLabels = parseOptionalPathLabelsFromBinTreePayload(treeUnknown)

  let cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(entries.length + 1, 2))))
  const originX = 72
  const originY = 72

  const stabBySourcePath = new Map<number, ObjectGraphLinkDraft[]>()
  let extratreeObjectLinks = 0
  let hashPathHintEdges = 0
  let intratreeObjectLinks = 0
  let totalDedupedLinkEndpoints = 0
  const foreignObjectLinkHashes = new Set<number>()

  for (const entry of entries) {
    const stableLinks = dedupeStableLinkDrafts(collectObjectLinksFromBinProperties(entry.properties, existsPath))

    stabBySourcePath.set(entry.pathHash >>> 0, stableLinks)
    totalDedupedLinkEndpoints += stableLinks.length

    for (const draft of stableLinks) {
      if (draft.semantic === 'hash_path_hint') {
        hashPathHintEdges += 1

        continue
      }

      if (existsPath.has(draft.targetPathHash >>> 0)) {
        intratreeObjectLinks += 1
      } else {
        extratreeObjectLinks += 1
        foreignObjectLinkHashes.add(draft.targetPathHash >>> 0)
      }
    }
  }

  const horizontalSpreadBoost = Math.min(220, Math.floor(totalDedupedLinkEndpoints / 18) * 14)
  const verticalSpreadBoost = Math.min(160, Math.floor(totalDedupedLinkEndpoints / 26) * 10)
  const gapX = 320 + horizontalSpreadBoost
  const gapY = 220 + verticalSpreadBoost

  cols = Math.max(
    1,
    Math.min(entries.length + 3, cols + Math.min(2, Math.floor(totalDedupedLinkEndpoints / 95))),
  )

  const foreignObjectTargetsPreviewText = summarizeForeignObjectLinkTargets(
    foreignObjectLinkHashes,
    64,
    12_000,
  )

  const nodes: CanvasNode[] = []
  const connections: CanvasConnection[] = []

  let layoutIndex = 0

  const versionKnown = typeof treeUnknown.version === 'number'
  const versionLabel = versionKnown ? String(treeUnknown.version) : '(não especificada)'
  const isOverride = typeof treeUnknown.is_override === 'boolean' ? treeUnknown.is_override : undefined

  const metaSchema = buildFileMetaSchema({
    dependencies,
    extratreeObjectLinks,
    foreignObjectTargetsPreviewText,
    hashPathHintEdges,
    intratreeObjectLinks,
    isOverride,
    objectCount: entries.length,
    pathLabelBucketCount: pathLabels?.size,
    versionLabel,
  })

  const metaNodeInstance: NodeInstance = {
    id: 'ltk-bin-meta-file',
    schema: metaSchema,
    values: metaSchema.parameters.map((parameter) => {
        switch (parameter.id) {
          case 'tree-version':
            return { parameterId: parameter.id, value: versionLabel }

          case 'is-override':
            return {
              parameterId: parameter.id,
              value: isOverride === undefined ? '(desconhecido)' : isOverride ? 'true' : 'false',
            }

          case 'object-count':
            return { parameterId: parameter.id, value: String(entries.length) }

          case 'intratree-links':
            return { parameterId: parameter.id, value: String(intratreeObjectLinks) }

          case 'hash-path-hints':
            return { parameterId: parameter.id, value: String(hashPathHintEdges) }

          case 'extratree-links':
            return { parameterId: parameter.id, value: String(extratreeObjectLinks) }

          case 'path-label-count':
            return {
              parameterId: parameter.id,
              value: String(pathLabels?.size ?? 0),
            }

          case 'foreign-objectlink-targets':
            return {
              parameterId: parameter.id,
              value: foreignObjectTargetsPreviewText,
            }

          case 'dependencies':
            return {
              parameterId: parameter.id,
              value:
                dependencies.length > 0 ? dependencies.join('\n') : '(sem dependências listadas neste BinTree JSON)',
            }

          default:
            return { parameterId: parameter.id, value: parameter.defaultValue }
        }
      }),
  }

  nodes.push({
    id: 'ltk-bin-meta-file',
    node: metaNodeInstance,
    position: {
      x: originX + (layoutIndex % cols) * gapX,
      y: originY + Math.floor(layoutIndex / cols) * gapY,
    },
    ...defaultNewCanvasNodeLayout(metaNodeInstance),
  })

  layoutIndex += 1

  for (const entry of entries) {
    const nodeId = `ltk-bin-obj-${entry.pathHash}`
    const rows = collectJadePropertyRows(entry.properties, existsPath, pathLabels)
    const stableLinks = stabBySourcePath.get(entry.pathHash >>> 0) ?? []
    const built = buildBinObjectJadeSchema(entry.pathHash, entry.classHash, rows, stableLinks, existsPath, pathLabels)

    const values: NodeParameterValue[] = built.schema.parameters.map((parameter) => {
      switch (parameter.id) {
        case 'path-hash':
          return { parameterId: parameter.id, value: hexU32(entry.pathHash) }

        case 'class-hash':
          return { parameterId: parameter.id, value: hexU32(entry.classHash) }

        case 'property-count':
          return { parameterId: parameter.id, value: String(rows.length) }

        case 'jade-property-table':
          return { parameterId: parameter.id, value: built.propertyTableText }

        default:
          return { parameterId: parameter.id, value: parameter.defaultValue }
      }
    })

    const objectNodeInstance: NodeInstance = {
      id: nodeId,
      schema: built.schema,
      values,
    }

    nodes.push({
      id: nodeId,
      node: objectNodeInstance,
      position: {
        x: originX + (layoutIndex % cols) * gapX,
        y: originY + Math.floor(layoutIndex / cols) * gapY,
      },
      ...defaultNewCanvasNodeLayout(objectNodeInstance),
    })

    for (const draft of stableLinks) {
      if (!existsPath.has(draft.targetPathHash >>> 0)) {
        continue
      }

      const linkPrefix = draft.semantic === 'hash_path_hint' ? 'hlk' : 'olk'

      connections.push({
        fromInternalStructureId: `${linkPrefix}-${draft.entityBodySanitized}`,
        fromNodeId: nodeId,
        id: `lnk:${nodeId}:${linkPrefix}_${draft.entityBodySanitized}->ltk-bin-obj-${String(draft.targetPathHash)}`,
        toNodeId: `ltk-bin-obj-${draft.targetPathHash}`,
      })
    }

    layoutIndex += 1
  }

  const rowCountForLayout = Math.max(nodes.length, 1)

  return {
    connections,
    height: Math.min(
      4000,
      originY * 2 + (Math.ceil(rowCountForLayout / cols) || 1) * gapY + 240,
    ),
    nodes,
    width: Math.min(5800, originX * 2 + cols * gapX + 300),
  }
}

/** Parse string JSON opcionalmente exportada pelo Jade (`convert_bin_to_json`). */
export function parseBinTreeJsonText(text: string): CanvasScene | null {
  let parsed: unknown

  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return null
  }

  return binTreeJsonToCanvasScene(parsed)
}
