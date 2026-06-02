import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import {
  buildEmptyBlockStructureFromDefinition,
  resolveSchemaIdForBlockDefinition,
} from './blockDefinitionJson'
import { addParameterToBlockStructure } from './blockCatalogMutations'
import { blockDefinitionInstanceKey } from './blockDefinitionSchemaResolve'
import { applyBlockStructureWithTokens } from './blockCatalogMutations'
import type { BlockSpawnCatalog } from './blockSpawnCatalog'
import {
  childBlockDefinitionForParameter,
  resolveBlockParameterDocument,
  structuralChildBlockType,
} from './blockStructureFromDefinition'
import { deriveChildBlockNodeId } from './blockParameterSynthesis'
import type { BlockParameterJsonDocument } from './blockParameterJson'
import { blockParameterSlotId, type BlockStructurePayload } from './blockSchema'
import { resolveBlockHeaderInputSlotIdForLink } from './blockCardHeaderSlots'
import {
  canConnectBlockSlots,
  findBlockSlotEndpoint,
  withoutConnectionsToBlockInputSlot,
} from './blockSlotConnections'
import type { CanvasConnection, CanvasNode, CanvasPosition, CanvasScene } from './canvasScene'
import { createUniqueNodeId } from './canvasNodeIds'
import { defaultNewCanvasNodeLayout } from './nodeCardSections'
import type { NodeSchemaDefinition } from './nodeSchema'
import { createNodeInstanceFromRegistry } from './nodeStructureRegistry'

const CHILD_OFFSET_X = 420
const CHILD_OFFSET_Y = 56

export type BlockHierarchySpawnPlan = {
  nodes: CanvasNode[]
  connections: CanvasConnection[]
  rootNodeId: string
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
): BlockParameterJsonDocument | null {
  const key = `${definition.blockName.trim()}::${parameterName.trim()}`
  const fromCatalog = catalog?.parameterByBlockAndName.get(key)
  if (fromCatalog) {
    return fromCatalog
  }
  return resolveBlockParameterDocument(definition, parameterName, schema)
}

function buildBlockStructureForSpawn(
  definition: BlockDefinitionJsonDocument,
  schema: NodeSchemaDefinition,
  catalog?: BlockSpawnCatalog,
): BlockStructurePayload {
  let structure = buildEmptyBlockStructureFromDefinition(definition)
  const seen = new Set<string>()

  for (const rawName of definition.parameters) {
    const parameterName = rawName.trim()
    if (!parameterName || seen.has(parameterName)) {
      continue
    }
    seen.add(parameterName)

    const doc = resolveSpawnParameterDocument(definition, parameterName, schema, catalog)
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

function connectParentToChild(
  ctx: SpawnContext,
  parentNodeId: string,
  parentParamDoc: BlockParameterJsonDocument,
  childNodeId: string,
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

  const fromSlotId = blockParameterSlotId(parentParam.idParameter, 'output')
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

function spawnBlockTree(
  ctx: SpawnContext,
  definition: BlockDefinitionJsonDocument,
  schema: NodeSchemaDefinition,
  position: CanvasPosition,
  parentNodeId?: string,
  parentParamDoc?: BlockParameterJsonDocument,
): string | null {
  const instanceId = allocateNodeId(ctx, schema.id)
  const nodeInstance = createNodeInstanceFromRegistry(ctx.schemaLookup, schema.id, instanceId)
  if (!nodeInstance) {
    return null
  }

  const structure = buildBlockStructureForSpawn(definition, schema, ctx.spawnCatalog)
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

  return {
    ...scene,
    nodes: [...scene.nodes, ...plan.nodes],
    connections: [...connections, ...plan.connections],
  }
}
