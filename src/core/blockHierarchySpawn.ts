import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import {
  buildEmptyBlockStructureFromDefinition,
  resolveSchemaIdForBlockDefinition,
} from './blockDefinitionJson'
import { addParameterToBlockStructure } from './blockCatalogMutations'
import { blockDefinitionInstanceKey } from './blockDefinitionSchemaResolve'
import { applyBlockStructureWithTokens } from './blockCatalogMutations'
import type { RitualBlockInstanceContext } from './blockAutoBuildFromRitualCode'
import type { BlockSpawnCatalog, BlockSpawnParameterLookupHints } from './blockSpawnCatalog'
import { resolveSpawnCatalogParameterDocument } from './blockSpawnCatalog'
import { ritualStructuralTargetForParameter } from './blockParameterRitualModel'
import {
  childBlockDefinitionForParameter,
  resolveBlockParameterDocument,
  structuralChildBlockType,
} from './blockStructureFromDefinition'
import { deriveChildBlockNodeId } from './blockParameterSynthesis'
import type { BlockParameterJsonDocument } from './blockParameterJson'
import { blockParameterDocumentIsList } from './blockParameterJson'
import { blockParameterSlotId, type BlockParameterDef, type BlockStructurePayload } from './blockSchema'
import { resolveBlockHeaderInputSlotIdForLink } from './blockCardHeaderSlots'
import {
  canConnectBlockSlots,
  findBlockSlotEndpoint,
  withoutConnectionsToBlockInputSlot,
} from './blockSlotConnections'
import { reconcileBlockSpawnConnections } from './reconcileBlockSpawnConnections'
import type { CanvasConnection, CanvasNode, CanvasPosition, CanvasScene } from './canvasScene'
import { createUniqueNodeId } from './canvasNodeIds'
import { defaultNewCanvasNodeLayout } from './nodeCardSections'
import { listEmbedSlotId } from './listEmbedSlots'
import { listPointerSlotId } from './listPointerSlots'
import { mapHashEmbedSlotId } from './mapHashEmbedSlots'
import { mapHashPointerSlotId } from './mapHashPointerSlots'
import { mapU64PointerSlotId } from './mapU64PointerSlots'
import type { NodeSchemaDefinition } from './nodeSchema'
import { createNodeInstanceFromRegistry } from './nodeStructureRegistry'
import { STRUCTURE_CARD_HEADER_HEIGHT } from './structureCardLayout'

const CHILD_OFFSET_X = 420
const CHILD_OFFSET_Y = 56
const LIST_SLOT_FIELD_PATTERN = /^(.+)__slot__(\d+)$/

export type BlockSpawnLayoutState = {
  spawnedPositionByNodeId: Map<string, CanvasPosition>
  stackAnchorByGroup: Map<string, CanvasPosition>
  nonListChildCountByParent: Map<string, number>
  layoutRow: number
}

export function createBlockSpawnLayoutState(): BlockSpawnLayoutState {
  return {
    spawnedPositionByNodeId: new Map(),
    stackAnchorByGroup: new Map(),
    nonListChildCountByParent: new Map(),
    layoutRow: 0,
  }
}

function parseListSlotField(
  linkFieldName: string | null,
): { fieldBase: string; index: number } | null {
  if (!linkFieldName) {
    return null
  }

  const match = LIST_SLOT_FIELD_PATTERN.exec(linkFieldName.trim())
  if (!match) {
    return null
  }

  const index = Number(match[2])
  if (!Number.isFinite(index)) {
    return null
  }

  return { fieldBase: match[1]!, index }
}

/** Agrupa irmãos de list[pointer]/list[embed] ou entradas map sob o mesmo parâmetro. */
export function resolveBlockInstanceStackGroupKey(
  instance: RitualBlockInstanceContext,
): string | null {
  if (!instance.parentNodeId || !instance.parentParameterName) {
    return null
  }

  const parameterKey = instance.parentParameterName.trim()
  const listSlot = parseListSlotField(instance.linkFieldName)
  if (listSlot) {
    return `list:${instance.parentNodeId}::${parameterKey}::${listSlot.fieldBase}`
  }

  if (instance.linkFieldName?.trim()) {
    return `map:${instance.parentNodeId}::${parameterKey}`
  }

  return null
}

export function resolveBlockInstanceSpawnPosition(
  instance: RitualBlockInstanceContext,
  depth: number,
  rootPosition: CanvasPosition,
  layout: BlockSpawnLayoutState,
): CanvasPosition {
  const parentPos = instance.parentNodeId
    ? layout.spawnedPositionByNodeId.get(instance.parentNodeId)
    : undefined
  const stackGroupKey = resolveBlockInstanceStackGroupKey(instance)
  const previousStack = stackGroupKey ? layout.stackAnchorByGroup.get(stackGroupKey) : undefined

  if (stackGroupKey && previousStack) {
    return {
      x: previousStack.x,
      y: previousStack.y + STRUCTURE_CARD_HEADER_HEIGHT,
    }
  }

  if (instance.parentNodeId && parentPos) {
    if (stackGroupKey) {
      return {
        x: parentPos.x + CHILD_OFFSET_X,
        y: parentPos.y,
      }
    }

    const siblingIndex = layout.nonListChildCountByParent.get(instance.parentNodeId) ?? 0
    layout.nonListChildCountByParent.set(instance.parentNodeId, siblingIndex + 1)

    return {
      x: parentPos.x + CHILD_OFFSET_X,
      y: parentPos.y + siblingIndex * CHILD_OFFSET_Y,
    }
  }

  return {
    x: rootPosition.x + depth * CHILD_OFFSET_X,
    y: rootPosition.y + layout.layoutRow * CHILD_OFFSET_Y,
  }
}

export function recordBlockInstanceSpawnPosition(
  nodeId: string,
  position: CanvasPosition,
  instance: RitualBlockInstanceContext,
  layout: BlockSpawnLayoutState,
): void {
  layout.spawnedPositionByNodeId.set(nodeId, position)
  layout.layoutRow += 1

  const stackGroupKey = resolveBlockInstanceStackGroupKey(instance)
  if (stackGroupKey) {
    layout.stackAnchorByGroup.set(stackGroupKey, position)
  }
}

export type BlockHierarchySpawnPlan = {
  nodes: CanvasNode[]
  connections: CanvasConnection[]
  rootNodeId: string
}

export type BlockHierarchySpawnProgress = {
  index: number
  total: number
  blockName: string
  displayName: string
}

export type BlockHierarchySpawnHooks = {
  onInstanceProgress?: (progress: BlockHierarchySpawnProgress) => void
  yieldUi?: () => Promise<void>
  shouldCancel?: () => boolean
}

function headerInputSlotId(
  structure: BlockStructurePayload,
  parentParamDoc: BlockParameterJsonDocument,
): string | null {
  const appearanceSlots = structure.appearance?.headerSlots ?? []
  const outTypes =
    parentParamDoc.slots?.out?.map((entry) => entry.trim()).filter(Boolean) ??
    (structuralChildBlockType(parentParamDoc)
      ? [structuralChildBlockType(parentParamDoc)!]
      : [])
  return resolveBlockHeaderInputSlotIdForLink(structure.blockType, appearanceSlots, {
    fromParameterName: parentParamDoc.parameterName,
    outTypes,
    targetBlockName: structure.blockType,
    targetDisplayName: structure.blockName,
  })
}

type SpawnContext = {
  schemaLookup: Record<string, NodeSchemaDefinition>
  scene: CanvasScene
  nodes: CanvasNode[]
  connections: CanvasConnection[]
  spawnCatalog?: BlockSpawnCatalog
}

function resolveSpawnParameterDocument(
  definition: BlockDefinitionJsonDocument,
  parameterName: string,
  schema: NodeSchemaDefinition,
  catalog?: BlockSpawnCatalog,
  hints?: BlockSpawnParameterLookupHints,
): BlockParameterJsonDocument | null {
  const fromCatalog = resolveSpawnCatalogParameterDocument(
    catalog,
    definition.blockName,
    parameterName,
    hints,
  )
  if (fromCatalog) {
    return fromCatalog
  }
  return resolveBlockParameterDocument(definition, parameterName, schema)
}

function spawnParameterLookupHints(
  instanceSchema: RitualBlockInstanceContext['schema'] | undefined,
  parameterName: string,
): BlockSpawnParameterLookupHints | undefined {
  if (!instanceSchema) {
    return undefined
  }

  const structural = ritualStructuralTargetForParameter(instanceSchema, parameterName)
  if (!structural) {
    return undefined
  }

  return structural.kind === 'pointer'
    ? { pointerType: structural.className }
    : { embedType: structural.className }
}

function buildBlockStructureForSpawn(
  definition: BlockDefinitionJsonDocument,
  schema: NodeSchemaDefinition,
  catalog?: BlockSpawnCatalog,
  instanceSchema?: RitualBlockInstanceContext['schema'],
): BlockStructurePayload {
  let structure = buildEmptyBlockStructureFromDefinition(definition)
  const seen = new Set<string>()

  for (const rawName of definition.parameters) {
    const parameterName = rawName.trim()
    if (!parameterName || seen.has(parameterName)) {
      continue
    }
    seen.add(parameterName)

    const doc = resolveSpawnParameterDocument(
      definition,
      parameterName,
      schema,
      catalog,
      spawnParameterLookupHints(instanceSchema, parameterName),
    )
    if (!doc) {
      continue
    }

    const added = addParameterToBlockStructure(structure, doc)
    if (!added.error) {
      structure = added.structure
    }
  }

  return structure
}

function resolveChildDefinitionForSpawn(
  parentDefinition: BlockDefinitionJsonDocument,
  paramDoc: BlockParameterJsonDocument,
  ctx: SpawnContext,
): BlockDefinitionJsonDocument | null {
  const childType = structuralChildBlockType(paramDoc)
  if (!childType) {
    return null
  }

  const nodeId = deriveChildBlockNodeId(
    parentDefinition.source.nodeId,
    childType,
    paramDoc.parameterName,
  )
  const catalogKey = blockDefinitionInstanceKey({
    blockName: childType.trim(),
    source: { nodeId },
  })
  const fromCatalog = ctx.spawnCatalog?.blockByInstanceKey.get(catalogKey)
  if (fromCatalog) {
    return fromCatalog
  }

  return childBlockDefinitionForParameter(parentDefinition, paramDoc, ctx.schemaLookup, {
    parentBlockName: parentDefinition.blockName,
    parentParameterName: paramDoc.parameterName,
    sceneNodes: [...ctx.scene.nodes, ...ctx.nodes],
  })
}

function allocateNodeId(ctx: SpawnContext, schemaId: string): string {
  return createUniqueNodeId(schemaId, [...ctx.scene.nodes, ...ctx.nodes])
}

function resolveSpawnNodeId(
  ctx: SpawnContext,
  definition: BlockDefinitionJsonDocument,
  schemaId: string,
): string {
  const preferred =
    definition.source.kind === 'block' ? definition.source.nodeId.trim() : ''
  if (preferred) {
    const taken = [...ctx.scene.nodes, ...ctx.nodes].some((node) => node.id === preferred)
    if (!taken) {
      return preferred
    }
  }
  return allocateNodeId(ctx, schemaId)
}

function findParameterDefForDoc(
  structure: BlockStructurePayload,
  paramDoc: BlockParameterJsonDocument,
) {
  const key = paramDoc.parameterName.trim()
  return structure.parameters.find(
    (entry) =>
      entry.nameParameter === key ||
      entry.idParameter === key ||
      entry.nameParameter.toLowerCase() === key.toLowerCase(),
  )
}

function resolveParentOutputSlotId(
  parentParam: BlockParameterDef,
  paramDoc: BlockParameterJsonDocument,
  linkFieldName: string | null,
): string | null {
  if (linkFieldName) {
    if (paramDoc.type === 'mapHashEmbed') {
      return mapHashEmbedSlotId(parentParam.idParameter, linkFieldName)
    }
    if (paramDoc.type === 'mapHashPointer') {
      return mapHashPointerSlotId(parentParam.idParameter, linkFieldName)
    }
    if (paramDoc.type === 'mapU64Pointer') {
      return mapU64PointerSlotId(parentParam.idParameter, linkFieldName)
    }

    const listSlotMatch = /^(.+)__slot__(\d+)$/.exec(linkFieldName)
    if (listSlotMatch) {
      const index = Number(listSlotMatch[2])
      if (Number.isFinite(index)) {
        if (paramDoc.type === 'pointer' && blockParameterDocumentIsList(paramDoc)) {
          return listPointerSlotId(parentParam.idParameter, index)
        }
        if (paramDoc.type === 'embed' && blockParameterDocumentIsList(paramDoc)) {
          return listEmbedSlotId(parentParam.idParameter, index)
        }
      }
    }
  }

  return blockParameterSlotId(parentParam.idParameter, 'output')
}

function resolveChildLinkParameterDocument(
  spawnCatalog: BlockSpawnCatalog,
  parentDefinition: BlockDefinitionJsonDocument | undefined,
  parentSchema: NodeSchemaDefinition | undefined,
  parentBlockName: string,
  parentParameterName: string,
  childBlockName: string,
): BlockParameterJsonDocument | null {
  const hints = { pointerType: childBlockName, embedType: childBlockName }
  if (parentDefinition && parentSchema) {
    return resolveSpawnParameterDocument(
      parentDefinition,
      parentParameterName,
      parentSchema,
      spawnCatalog,
      hints,
    )
  }
  return (
    resolveSpawnCatalogParameterDocument(
      spawnCatalog,
      parentBlockName,
      parentParameterName,
      hints,
    ) ?? null
  )
}

function connectParentToChild(
  ctx: SpawnContext,
  parentNodeId: string,
  parentParamDoc: BlockParameterJsonDocument,
  childNodeId: string,
  linkFieldName: string | null = null,
): void {
  const parentNode = ctx.nodes.find((entry) => entry.id === parentNodeId)
  const childNode = ctx.nodes.find((entry) => entry.id === childNodeId)
  if (!parentNode?.blockStructure || !childNode?.blockStructure) {
    return
  }

  const parentParam = findParameterDefForDoc(parentNode.blockStructure, parentParamDoc)
  if (!parentParam) {
    return
  }

  const fromSlotId = resolveParentOutputSlotId(parentParam, parentParamDoc, linkFieldName)
  const toSlotId = headerInputSlotId(childNode.blockStructure, parentParamDoc)
  if (!toSlotId) {
    return
  }

  const fromEndpoint = findBlockSlotEndpoint(parentNode, fromSlotId)
  const toEndpoint = findBlockSlotEndpoint(childNode, toSlotId)
  if (
    !fromEndpoint ||
    !toEndpoint ||
    !canConnectBlockSlots(
      fromEndpoint,
      toEndpoint,
      parentNode.blockStructure,
      childNode.blockStructure,
    )
  ) {
    return
  }

  ctx.connections.push({
    id: `block:${parentNodeId}:${fromSlotId}->${childNodeId}:${toSlotId}`,
    fromNodeId: parentNodeId,
    fromInternalStructureId: `__block__:${fromSlotId}`,
    toNodeId: childNodeId,
    routing: 'wireless',
    fromBlockSlotId: fromSlotId,
    fromBlockParameterId: parentParam.idParameter,
    toBlockSlotId: toSlotId,
  })
}

function spawnSingleBlockNode(
  ctx: SpawnContext,
  definition: BlockDefinitionJsonDocument,
  schema: NodeSchemaDefinition,
  position: CanvasPosition,
  instance?: RitualBlockInstanceContext,
): string | null {
  const instanceId = resolveSpawnNodeId(ctx, definition, schema.id)
  const nodeInstance = createNodeInstanceFromRegistry(ctx.schemaLookup, schema.id, instanceId)
  if (!nodeInstance) {
    return null
  }

  const structure = buildBlockStructureForSpawn(
    definition,
    schema,
    ctx.spawnCatalog,
    instance?.schema,
  )
  const canvasNode: CanvasNode = {
    id: instanceId,
    node: nodeInstance,
    position,
    ...defaultNewCanvasNodeLayout(nodeInstance),
    blockStructure: structure,
    blockViewActive: true,
    groupStructure: undefined,
    groupViewActive: false,
  }

  const applied = applyBlockStructureWithTokens(ctx.scene, canvasNode, structure)
  ctx.nodes.push({
    ...canvasNode,
    node: applied.node,
    blockStructure: structure,
  })

  return instanceId
}

function resolveSpawnSchemaId(
  instance: RitualBlockInstanceContext,
  blockName: string,
  schemaLookup: Record<string, NodeSchemaDefinition>,
): string | null {
  const preferred = instance.schemaId.trim()
  if (preferred && schemaLookup[preferred]) {
    return preferred
  }
  return resolveSchemaIdForBlockDefinition(blockName, schemaLookup)
}

function buildInstanceSpawnOrder(instances: readonly RitualBlockInstanceContext[]): {
  order: RitualBlockInstanceContext[]
  depthByNodeId: Map<string, number>
} {
  const root =
    instances.find((instance) => !instance.parentNodeId) ?? instances[0] ?? null
  if (!root) {
    return { order: [], depthByNodeId: new Map() }
  }

  const childrenByParent = new Map<string, RitualBlockInstanceContext[]>()
  for (const instance of instances) {
    if (!instance.parentNodeId) {
      continue
    }
    const siblings = childrenByParent.get(instance.parentNodeId) ?? []
    siblings.push(instance)
    childrenByParent.set(instance.parentNodeId, siblings)
  }

  const order: RitualBlockInstanceContext[] = []
  const depthByNodeId = new Map<string, number>()
  const visited = new Set<string>()

  const walk = (instance: RitualBlockInstanceContext, depth: number) => {
    if (visited.has(instance.nodeId)) {
      return
    }
    visited.add(instance.nodeId)
    order.push(instance)
    depthByNodeId.set(instance.nodeId, depth)
    for (const child of childrenByParent.get(instance.nodeId) ?? []) {
      walk(child, depth + 1)
    }
  }

  walk(root, 0)

  for (const instance of instances) {
    if (!visited.has(instance.nodeId)) {
      walk(instance, 0)
    }
  }

  return { order, depthByNodeId }
}

export function planBlockHierarchySpawnFromInstances(
  instances: readonly RitualBlockInstanceContext[],
  schemaLookup: Record<string, NodeSchemaDefinition>,
  scene: CanvasScene,
  rootPosition: CanvasPosition,
  spawnCatalog?: BlockSpawnCatalog,
  hooks?: BlockHierarchySpawnHooks,
): BlockHierarchySpawnPlan | null {
  if (instances.length === 0 || !spawnCatalog) {
    return null
  }

  const ctx: SpawnContext = {
    schemaLookup,
    scene,
    nodes: [],
    connections: [],
    spawnCatalog,
  }

  const { order, depthByNodeId } = buildInstanceSpawnOrder(instances)
  if (order.length === 0) {
    return null
  }

  let rootNodeId: string | null = null
  const layout = createBlockSpawnLayoutState()
  let spawnIndex = 0
  const instanceByNodeId = new Map(instances.map((instance) => [instance.nodeId, instance]))

  for (const instance of order) {
    const definition = spawnCatalog.blockByInstanceKey.get(
      blockDefinitionInstanceKey({
        blockName: instance.blockName,
        source: { nodeId: instance.nodeId },
      }),
    )
    if (!definition) {
      continue
    }

    const schemaId = resolveSpawnSchemaId(instance, definition.blockName, ctx.schemaLookup)
    if (!schemaId) {
      continue
    }
    const schema = ctx.schemaLookup[schemaId]
    if (!schema) {
      continue
    }

    const depth = depthByNodeId.get(instance.nodeId) ?? 0
    const position = resolveBlockInstanceSpawnPosition(instance, depth, rootPosition, layout)

    const spawnedId = spawnSingleBlockNode(ctx, definition, schema, position, instance)
    if (!spawnedId) {
      continue
    }

    recordBlockInstanceSpawnPosition(spawnedId, position, instance, layout)

    hooks?.onInstanceProgress?.({
      index: spawnIndex,
      total: order.length,
      blockName: instance.blockName,
      displayName: instance.displayName,
    })
    spawnIndex += 1

    if (!instance.parentNodeId) {
      rootNodeId = spawnedId
    } else if (instance.parentParameterName) {
      const parentInstance = instanceByNodeId.get(instance.parentNodeId)
      const parentDefinition = spawnCatalog.blockByInstanceKey.get(
        blockDefinitionInstanceKey({
          blockName: parentInstance?.blockName ?? '',
          source: { nodeId: instance.parentNodeId },
        }),
      )
      const parentSchemaId = parentInstance
        ? resolveSpawnSchemaId(
            parentInstance,
            parentDefinition?.blockName ?? parentInstance.blockName,
            ctx.schemaLookup,
          )
        : parentDefinition
          ? resolveSchemaIdForBlockDefinition(parentDefinition.blockName, ctx.schemaLookup)
          : null
      const parentSchema = parentSchemaId ? ctx.schemaLookup[parentSchemaId] : undefined
      const paramDoc = resolveChildLinkParameterDocument(
        spawnCatalog,
        parentDefinition,
        parentSchema,
        parentInstance?.blockName ?? '',
        instance.parentParameterName,
        instance.blockName,
      )

      if (paramDoc) {
        connectParentToChild(
          ctx,
          instance.parentNodeId,
          paramDoc,
          spawnedId,
          instance.linkFieldName,
        )
      }
    }
  }

  if (!rootNodeId) {
    return null
  }

  return {
    nodes: ctx.nodes,
    connections: ctx.connections,
    rootNodeId,
  }
}

export async function planBlockHierarchySpawnFromInstancesAsync(
  instances: readonly RitualBlockInstanceContext[],
  schemaLookup: Record<string, NodeSchemaDefinition>,
  scene: CanvasScene,
  rootPosition: CanvasPosition,
  spawnCatalog?: BlockSpawnCatalog,
  hooks?: BlockHierarchySpawnHooks,
): Promise<BlockHierarchySpawnPlan | null> {
  if (instances.length === 0 || !spawnCatalog) {
    return null
  }

  const ctx: SpawnContext = {
    schemaLookup,
    scene,
    nodes: [],
    connections: [],
    spawnCatalog,
  }

  const { order, depthByNodeId } = buildInstanceSpawnOrder(instances)
  if (order.length === 0) {
    return null
  }

  let rootNodeId: string | null = null
  const layout = createBlockSpawnLayoutState()
  let spawnIndex = 0
  const instanceByNodeId = new Map(instances.map((instance) => [instance.nodeId, instance]))

  for (const instance of order) {
    if (hooks?.shouldCancel?.()) {
      return null
    }

    const definition = spawnCatalog.blockByInstanceKey.get(
      blockDefinitionInstanceKey({
        blockName: instance.blockName,
        source: { nodeId: instance.nodeId },
      }),
    )
    if (!definition) {
      continue
    }

    const schemaId = resolveSpawnSchemaId(instance, definition.blockName, ctx.schemaLookup)
    if (!schemaId) {
      continue
    }
    const schema = ctx.schemaLookup[schemaId]
    if (!schema) {
      continue
    }

    const depth = depthByNodeId.get(instance.nodeId) ?? 0
    const position = resolveBlockInstanceSpawnPosition(instance, depth, rootPosition, layout)

    const spawnedId = spawnSingleBlockNode(ctx, definition, schema, position, instance)
    if (!spawnedId) {
      continue
    }

    recordBlockInstanceSpawnPosition(spawnedId, position, instance, layout)

    hooks?.onInstanceProgress?.({
      index: spawnIndex,
      total: order.length,
      blockName: instance.blockName,
      displayName: instance.displayName,
    })
    spawnIndex += 1

    if (!instance.parentNodeId) {
      rootNodeId = spawnedId
    } else if (instance.parentParameterName) {
      const parentInstance = instanceByNodeId.get(instance.parentNodeId)
      const parentDefinition = spawnCatalog.blockByInstanceKey.get(
        blockDefinitionInstanceKey({
          blockName: parentInstance?.blockName ?? '',
          source: { nodeId: instance.parentNodeId },
        }),
      )
      const parentSchemaId = parentInstance
        ? resolveSpawnSchemaId(
            parentInstance,
            parentDefinition?.blockName ?? parentInstance.blockName,
            ctx.schemaLookup,
          )
        : parentDefinition
          ? resolveSchemaIdForBlockDefinition(parentDefinition.blockName, ctx.schemaLookup)
          : null
      const parentSchema = parentSchemaId ? ctx.schemaLookup[parentSchemaId] : undefined
      const paramDoc = resolveChildLinkParameterDocument(
        spawnCatalog,
        parentDefinition,
        parentSchema,
        parentInstance?.blockName ?? '',
        instance.parentParameterName,
        instance.blockName,
      )

      if (paramDoc) {
        connectParentToChild(
          ctx,
          instance.parentNodeId,
          paramDoc,
          spawnedId,
          instance.linkFieldName,
        )
      }
    }

    if (hooks?.yieldUi) {
      await hooks.yieldUi()
    }
  }

  if (!rootNodeId) {
    return null
  }

  return {
    nodes: ctx.nodes,
    connections: ctx.connections,
    rootNodeId,
  }
}

function spawnBlockTree(
  ctx: SpawnContext,
  definition: BlockDefinitionJsonDocument,
  schema: NodeSchemaDefinition,
  position: CanvasPosition,
  parentNodeId?: string,
  parentParamDoc?: BlockParameterJsonDocument,
): string | null {
  const instanceId = spawnSingleBlockNode(ctx, definition, schema, position)
  if (!instanceId) {
    return null
  }

  if (parentNodeId && parentParamDoc) {
    connectParentToChild(ctx, parentNodeId, parentParamDoc, instanceId)
  }

  let childIndex = 0
  for (const parameterName of definition.parameters) {
    const paramDoc = resolveSpawnParameterDocument(
      definition,
      parameterName.trim(),
      schema,
      ctx.spawnCatalog,
    )
    if (!paramDoc) {
      continue
    }
    const childDef = resolveChildDefinitionForSpawn(definition, paramDoc, ctx)
    if (!childDef) {
      continue
    }

    const childSchemaId = resolveSchemaIdForBlockDefinition(childDef.blockName, ctx.schemaLookup)
    if (!childSchemaId) {
      continue
    }
    const childSchema = ctx.schemaLookup[childSchemaId]
    if (!childSchema) {
      continue
    }

    const childPosition: CanvasPosition = {
      x: position.x + CHILD_OFFSET_X,
      y: position.y + childIndex * CHILD_OFFSET_Y,
    }
    childIndex += 1

    spawnBlockTree(ctx, childDef, childSchema, childPosition, instanceId, paramDoc)
  }

  return instanceId
}

export function planBlockHierarchySpawn(
  definition: BlockDefinitionJsonDocument,
  schema: NodeSchemaDefinition,
  schemaLookup: Record<string, NodeSchemaDefinition>,
  scene: CanvasScene,
  rootPosition: CanvasPosition,
  spawnCatalog?: BlockSpawnCatalog,
): BlockHierarchySpawnPlan | null {
  const ctx: SpawnContext = {
    schemaLookup,
    scene,
    nodes: [],
    connections: [],
    spawnCatalog,
  }

  const rootNodeId = spawnBlockTree(ctx, definition, schema, rootPosition)
  if (!rootNodeId) {
    return null
  }

  return {
    nodes: ctx.nodes,
    connections: ctx.connections,
    rootNodeId,
  }
}

export function mergeBlockHierarchyIntoScene(
  scene: CanvasScene,
  plan: BlockHierarchySpawnPlan,
): CanvasScene {
  const mergedNodes = [...scene.nodes, ...plan.nodes]
  let connections = [...scene.connections]
  for (const connection of plan.connections) {
    if (connection.toBlockSlotId) {
      connections = withoutConnectionsToBlockInputSlot(
        connections,
        connection.toNodeId,
        connection.toBlockSlotId,
      )
    }
  }
  connections = [...connections, ...plan.connections]
  connections = reconcileBlockSpawnConnections(mergedNodes, connections)

  return {
    ...scene,
    nodes: mergedNodes,
    connections,
  }
}
