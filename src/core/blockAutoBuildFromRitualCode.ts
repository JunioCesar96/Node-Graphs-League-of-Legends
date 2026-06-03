import { expandBlockTokensInScene } from '@/core/blockRitualExport'
import { expandGroupTokensInScene } from '@/core/groupRitualExport'
import { syncAllValueVector3ConstantsToDynamicsInScene } from '@/core/valueVector3DynamicsSync'
import { emitNodeRitualViewCodeText } from '@/core/nodeCodeEditorBinding'

import type { BlockDefinitionJsonDocument, BlockParentContext } from './blockDefinitionJson'
import {
  buildBlockDefinitionDocumentId,
  buildBlockHeaderSlots,
  mapOutgoingLinkKindToBlockType,
  resolveBlockDisplayName,
  resolveBlockParentContext,
} from './blockDefinitionJson'
import { blockDefinitionInstanceKey } from './blockDefinitionSchemaResolve'
import type { BlockParameterJsonDocument } from './blockParameterJson'
import { sanitizeBlockParameterFileStem } from './blockParameterJson'
import { buildParameterDocumentsFromRitualSchema } from './blockParameterRitualModel'
import { deriveChildBlockNodeId } from './blockParameterSynthesis'
import { blockTypeDefinitionById } from './blockStructureRegistry'
import { templatizeSchemaNodeId } from './blockParameterIdTemplate'
import type { CanvasNode, CanvasScene } from './canvasScene'
import { collectChildLinks, type ChildLink } from './codeToCanvasScene'
import {
  findParsedSchemaInRegistry,
  type ClassGroupStackParseResult,
  type MutableClassGroupSchema,
} from './classGroupRitualStackParser'
import {
  prepareClassGroupRitualParse,
  resolveBlockBuildRootSchema,
} from './ritualCodePrepare'
import type { NodeSchemaDefinition } from './nodeSchema'

const DEFAULT_BLOCK_COLOR = '#40ff56'

export type RitualBlockInstanceContext = {
  schemaId: string
  schema: MutableClassGroupSchema
  blockName: string
  displayName: string
  nodeId: string
  parentContext: BlockParentContext
}

export type RitualBlockCatalogSlice = {
  blockDocuments: BlockDefinitionJsonDocument[]
  parameterDocuments: BlockParameterJsonDocument[]
  warnings: string[]
  errors: string[]
}

function isParsedSchemaStructOnly(schema: MutableClassGroupSchema): boolean {
  return (
    schema.parameters.length === 0 &&
    (schema.embed?.length ?? 0) === 0 &&
    (schema.pointer?.length ?? 0) === 0 &&
    (schema.listEmbed?.length ?? 0) === 0 &&
    (schema.listPointer?.length ?? 0) === 0 &&
    (schema.list2Embed?.length ?? 0) === 0 &&
    (schema.list2Pointer?.length ?? 0) === 0 &&
    schema.internalStructures.length === 0
  )
}

function resolveSchemaInParse(
  parse: ClassGroupStackParseResult,
  schemaId: string,
  blockTitle: string,
): MutableClassGroupSchema | undefined {
  const direct = parse.registry.get(schemaId)
  if (direct) {
    return direct
  }
  if (blockTitle.trim()) {
    return findParsedSchemaInRegistry(parse.registry, blockTitle.trim())
  }
  return undefined
}

/** Mesma lógica de ligação filho que o Neeko (`collectChildLinks`). */
export function blockParentContextFromChildLink(link: ChildLink): BlockParentContext {
  const blockField =
    link.kind === 'mapHashEmbed' ||
    link.kind === 'mapHashPointer' ||
    link.kind === 'mapU64Pointer'
      ? link.parameterName
      : link.fieldName

  return {
    block: blockField.trim(),
    type: mapOutgoingLinkKindToBlockType(link.kind),
  }
}

export function blockFieldNameFromChildLink(link: ChildLink): string {
  switch (link.kind) {
    case 'internal':
    case 'embed':
    case 'pointer':
      return link.fieldName.trim()
    case 'listEmbed':
    case 'listPointer':
      return `${link.fieldName.trim()}__slot__${String(link.index)}`
    case 'list2Embed':
    case 'list2Pointer':
      return `${link.fieldName.trim()}__slot__${String(link.instanceIndex)}`
    case 'mapHashEmbed':
    case 'mapHashPointer':
    case 'mapU64Pointer':
      return link.entryKey.trim()
  }
}

type BlockInstanceWalkSeed = {
  schemaId: string
  parentContext: BlockParentContext
  parentNodeId: string | null
  fieldName: string | null
  displayName: string
  rootTemplateNodeId: string
}

function collectBlockInstancesByWalkingLinks(
  parse: ClassGroupStackParseResult,
  rootSchema: MutableClassGroupSchema,
  seed: Omit<BlockInstanceWalkSeed, 'schemaId'>,
): RitualBlockInstanceContext[] {
  const instances: RitualBlockInstanceContext[] = []
  const seen = new Set<string>()

  type QueueItem = BlockInstanceWalkSeed & { schemaId: string }

  const queue: QueueItem[] = [
    {
      schemaId: rootSchema.id,
      ...seed,
    },
  ]

  while (queue.length > 0) {
    const item = queue.shift()!
    const schema = resolveSchemaInParse(parse, item.schemaId, item.displayName)
    if (!schema) {
      continue
    }

    const blockName = schema.title.trim()
    if (!blockName) {
      continue
    }

    const nodeId =
      item.parentNodeId && item.fieldName
        ? deriveChildBlockNodeId(item.parentNodeId, blockName, item.fieldName)
        : templatizeSchemaNodeId(item.rootTemplateNodeId, blockName)

    const visitKey = blockDefinitionInstanceKey({ blockName, source: { nodeId } })
    if (seen.has(visitKey)) {
      continue
    }
    seen.add(visitKey)

    instances.push({
      schemaId: schema.id,
      schema,
      blockName,
      displayName: item.displayName,
      nodeId,
      parentContext: item.parentContext,
    })

    for (const link of collectChildLinks(schema)) {
      const childSchema = resolveSchemaInParse(parse, link.childParsedId, '')
      if (!childSchema) {
        continue
      }

      queue.push({
        schemaId: link.childParsedId,
        parentContext: blockParentContextFromChildLink(link),
        parentNodeId: nodeId,
        fieldName: blockFieldNameFromChildLink(link),
        displayName: childSchema.title.trim() || link.childParsedId,
        rootTemplateNodeId: item.rootTemplateNodeId,
      })
    }
  }

  return instances
}

export function prepareSceneForRitualBlockExport(scene: CanvasScene): CanvasScene {
  const synced = syncAllValueVector3ConstantsToDynamicsInScene(scene)
  return expandGroupTokensInScene(expandBlockTokensInScene(synced))
}

export function parseRitualCodeToBlockSchemas(ritualText: string): ClassGroupStackParseResult {
  const prepared = prepareClassGroupRitualParse(ritualText)
  if (!prepared.ok) {
    return {
      registry: new Map(),
      rootSchemaIds: new Set(),
      warnings: [],
      classGroupPathBySchemaId: new Map(),
    }
  }
  return prepared.parse
}

export function resolveRootSchemaFromParse(
  parse: ClassGroupStackParseResult,
  canvasNode: CanvasNode,
): MutableClassGroupSchema | null {
  const title = canvasNode.node.schema.title.trim()
  const byTitle = findParsedSchemaInRegistry(parse.registry, title)
  if (byTitle) {
    return byTitle
  }

  return resolveBlockBuildRootSchema(parse)
}

/** Instâncias de bloco a partir de ritual puro (sem nó na cena). */
export function collectBlockInstancesFromRitualCode(
  parse: ClassGroupStackParseResult,
  rootSchema: MutableClassGroupSchema,
  displayName?: string,
): RitualBlockInstanceContext[] {
  const rootDisplay =
    resolveBlockDisplayName(displayName?.trim() || rootSchema.title.trim()) ||
    rootSchema.title.trim()

  return collectBlockInstancesByWalkingLinks(parse, rootSchema, {
    parentContext: { block: rootSchema.title.trim(), type: 'standalone' },
    parentNodeId: null,
    fieldName: null,
    displayName: rootDisplay,
    rootTemplateNodeId: rootSchema.id.trim(),
  })
}

export function collectBlockInstancesFromRitualParse(
  parse: ClassGroupStackParseResult,
  rootSchema: MutableClassGroupSchema,
  scene: CanvasScene,
  canvasNode: CanvasNode,
): RitualBlockInstanceContext[] {
  const rootDisplay =
    resolveBlockDisplayName(canvasNode.displayLabel?.trim() || rootSchema.title.trim()) ||
    rootSchema.title.trim()

  return collectBlockInstancesByWalkingLinks(parse, rootSchema, {
    parentContext: resolveBlockParentContext(scene, canvasNode, rootSchema.title),
    parentNodeId: null,
    fieldName: null,
    displayName: rootDisplay,
    rootTemplateNodeId: canvasNode.node.schema.id.trim() || rootSchema.id.trim(),
  })
}

function blockParameterCatalogKey(doc: BlockParameterJsonDocument): string {
  return `${doc.block.trim()}::${doc.parameterName.trim()}`
}

/** Extrai JSON de parâmetro a partir dos schemas ritual parseados (1 doc por bloco+nome). */
export function extractBlockParameterDocumentsFromRitualInstances(
  instances: readonly RitualBlockInstanceContext[],
): BlockParameterJsonDocument[] {
  const byKey = new Map<string, BlockParameterJsonDocument>()

  for (const instance of instances) {
    for (const paramDoc of buildParameterDocumentsFromRitualSchema({
      blockName: instance.blockName,
      nodeId: instance.nodeId,
      schema: instance.schema,
    })) {
      byKey.set(blockParameterCatalogKey(paramDoc), paramDoc)
    }
  }

  return [...byKey.values()].sort((a, b) =>
    blockParameterCatalogKey(a).localeCompare(blockParameterCatalogKey(b)),
  )
}

/** Garante um documento JSON para cada nome listado em `block.parameters`. */
export function synchronizeParameterDocumentsWithBlockDefinitions(
  blockDocuments: readonly BlockDefinitionJsonDocument[],
  parameterDocuments: readonly BlockParameterJsonDocument[],
  instances: readonly RitualBlockInstanceContext[],
): BlockParameterJsonDocument[] {
  const byKey = new Map(
    parameterDocuments.map((doc) => [blockParameterCatalogKey(doc), doc] as const),
  )
  const extracted = extractBlockParameterDocumentsFromRitualInstances(instances)

  for (const doc of extracted) {
    const key = blockParameterCatalogKey(doc)
    if (!byKey.has(key)) {
      byKey.set(key, doc)
    }
  }

  for (const blockDoc of blockDocuments) {
    for (const parameterName of blockDoc.parameters) {
      const key = `${blockDoc.blockName.trim()}::${parameterName.trim()}`
      if (byKey.has(key)) {
        continue
      }
      const fallback = extracted.find(
        (doc) => doc.block.trim() === blockDoc.blockName.trim() && doc.parameterName.trim() === parameterName.trim(),
      )
      if (fallback) {
        byKey.set(key, fallback)
      }
    }
  }

  return [...byKey.values()].sort((a, b) =>
    blockParameterCatalogKey(a).localeCompare(blockParameterCatalogKey(b)),
  )
}

export function buildBlockDefinitionFromRitualInstance(
  instance: RitualBlockInstanceContext,
): BlockDefinitionJsonDocument | null {
  const blockName = instance.blockName.trim()
  const displayName = instance.displayName.trim()
  if (!blockName || !displayName || displayName.includes('_')) {
    return null
  }

  const paramDocs = buildParameterDocumentsFromRitualSchema({
    blockName,
    nodeId: instance.nodeId,
    schema: instance.schema,
  })
  const parameters = paramDocs.map((doc) => doc.parameterName.trim()).filter(Boolean)
  if (parameters.length === 0 && !isParsedSchemaStructOnly(instance.schema)) {
    return null
  }

  const id = buildBlockDefinitionDocumentId(blockName, displayName)
  if (!sanitizeBlockParameterFileStem(id)) {
    return null
  }

  return {
    id,
    block: instance.parentContext.block,
    blockName,
    type: instance.parentContext.type,
    name: displayName,
    source: { kind: 'block', nodeId: instance.nodeId },
    color: blockTypeDefinitionById(blockName)?.color ?? DEFAULT_BLOCK_COLOR,
    headerSlots: buildBlockHeaderSlots(instance.parentContext.block, blockName),
    parameters,
  }
}

export function buildBlockCatalogFromRitualInstances(
  instances: readonly RitualBlockInstanceContext[],
): RitualBlockCatalogSlice {
  const blockDocuments: BlockDefinitionJsonDocument[] = []
  const parameterDocuments: BlockParameterJsonDocument[] = []
  const errors: string[] = []
  const warnings: string[] = []
  const seenBlocks = new Set<string>()
  const seenParams = new Set<string>()

  for (const instance of instances) {
    const blockDoc = buildBlockDefinitionFromRitualInstance(instance)
    if (!blockDoc) {
      warnings.push(`${instance.blockName}: bloco ignorado (sem parâmetros válidos no ritual)`)
      continue
    }

    const blockKey = blockDefinitionInstanceKey(blockDoc)
    if (!seenBlocks.has(blockKey)) {
      seenBlocks.add(blockKey)
      blockDocuments.push(blockDoc)
    }

    for (const paramDoc of buildParameterDocumentsFromRitualSchema({
      blockName: instance.blockName,
      nodeId: instance.nodeId,
      schema: instance.schema,
    })) {
      const paramKey = blockParameterCatalogKey(paramDoc)
      if (seenParams.has(paramKey)) {
        continue
      }
      seenParams.add(paramKey)
      parameterDocuments.push(paramDoc)
    }
  }

  return { blockDocuments, parameterDocuments, warnings, errors }
}

export function buildBlockCatalogFromViewCodeText(
  exportedText: string,
  scene: CanvasScene,
  canvasNode: CanvasNode,
  exportWarnings: readonly string[] = [],
): RitualBlockCatalogSlice {
  const parse = parseRitualCodeToBlockSchemas(exportedText)
  const rootSchema = resolveRootSchemaFromParse(parse, canvasNode)
  if (!rootSchema) {
    return {
      blockDocuments: [],
      parameterDocuments: [],
      warnings: [...exportWarnings, ...parse.warnings],
      errors: ['Ritual exportado não produziu schema raiz interpretável.'],
    }
  }

  const instances = collectBlockInstancesFromRitualParse(parse, rootSchema, scene, canvasNode)
  const catalog = buildBlockCatalogFromRitualInstances(instances)

  return {
    ...catalog,
    warnings: [...exportWarnings, ...parse.warnings, ...catalog.warnings],
    errors: catalog.errors,
  }
}

export function buildBlockCatalogFromNodeRitualCode(
  scene: CanvasScene,
  registry: Record<string, NodeSchemaDefinition>,
  canvasNode: CanvasNode,
): RitualBlockCatalogSlice {
  const preparedScene = prepareSceneForRitualBlockExport(scene)
  const exported = emitNodeRitualViewCodeText(preparedScene, registry, canvasNode.id)

  if (!exported.ok) {
    return {
      blockDocuments: [],
      parameterDocuments: [],
      warnings: [],
      errors: [exported.error],
    }
  }

  return buildBlockCatalogFromViewCodeText(exported.text, preparedScene, canvasNode, exported.warnings)
}

export { resolveBlockBuildRootSchema } from './ritualCodePrepare'

/** Instâncias completas a partir do export ritual do nó raiz Main (subárvore inteira). */
export function collectBlockInstancesFromMainSceneExport(
  preparedScene: CanvasScene,
  registry: Record<string, NodeSchemaDefinition>,
  rootCanvasNode: CanvasNode,
): RitualBlockInstanceContext[] {
  const exported = emitNodeRitualViewCodeText(preparedScene, registry, rootCanvasNode.id)
  if (!exported.ok) {
    return []
  }

  const parse = parseRitualCodeToBlockSchemas(exported.text)
  const rootSchema = resolveRootSchemaFromParse(parse, rootCanvasNode)
  if (!rootSchema) {
    return []
  }

  return collectBlockInstancesFromRitualParse(parse, rootSchema, preparedScene, rootCanvasNode)
}
