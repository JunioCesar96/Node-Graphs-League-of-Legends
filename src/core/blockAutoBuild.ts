import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'

import { resolveBlockDisplayName } from './blockDefinitionJson'

import {

  blockDefinitionInstanceKey,

  mergeSchemaRegistryWithSceneNodes,

  resolveSchemaIdForBlockDefinitionContext,

} from './blockDefinitionSchemaResolve'

import {

  buildBlockCatalogFromViewCodeText,

  buildBlockCatalogFromRitualInstances,

  collectBlockInstancesFromMainSceneExport,

  collectBlockInstancesFromRitualCode,

  collectBlockInstancesFromRitualParse,

  parseRitualCodeToBlockSchemas,

  prepareSceneForRitualBlockExport,

  resolveRootSchemaFromParse,

  synchronizeParameterDocumentsWithBlockDefinitions,

} from './blockAutoBuildFromRitualCode'

import { prepareClassGroupRitualParse, resolveBlockBuildRootSchema } from './ritualCodePrepare'

import type { BlockParameterJsonDocument } from './blockParameterJson'

import { collectParameterDocumentsForDefinitionTree } from './blockStructureFromDefinition'

import type { BlockInspectorDraft } from './blockSchema'

import {

  buildBlockInspectorDraftFromNode,

  defaultBlockTypeForCanvasNode,

} from './blockTokenCodegen'

import { hydrateScene, type CanvasNode, type CanvasScene } from './canvasScene'

import { emitNodeRitualViewCodeText } from './nodeCodeEditorBinding'

import {
  findParsedSchemaInRegistry,
  MAIN_SCHEMA_ID,
  type ClassGroupStackParseResult,
  type MutableClassGroupSchema,
} from './classGroupRitualStackParser'

import type { NodeSchemaDefinition } from './nodeSchema'



export type BlockAutoBuildNodeResult = {

  nodeId: string

  schemaTitle: string

  parameterCount: number

  blockId?: string

  errors: string[]

}



export type BlockAutoBuildPlan = {

  parameterDocuments: BlockParameterJsonDocument[]

  blockDocuments: BlockDefinitionJsonDocument[]

  nodeResults: BlockAutoBuildNodeResult[]

  errors: string[]

}



export type BlockAutoBuildFromViewCodeResult = {

  plan: BlockAutoBuildPlan

  exportedText: string

  exportNodeId: string

  exportWarnings: string[]

}



function findMainNodes(scene: CanvasScene): CanvasNode[] {

  return scene.nodes.filter((entry) => entry.node.schema.id === MAIN_SCHEMA_ID)

}



export function resolveBlockBuildExportNodeId(
  scene: CanvasScene,
  preferredNodeId?: string | null,
): string | null {
  if (preferredNodeId?.trim()) {
    const node = scene.nodes.find((entry) => entry.id === preferredNodeId.trim())
    if (node) {
      return node.id
    }
  }

  return findAutoBuildRootNodes(scene)[0]?.id ?? null
}



function findAutoBuildRootNodes(scene: CanvasScene): CanvasNode[] {

  const mainNodes = findMainNodes(scene)

  if (mainNodes.length > 0) {

    return mainNodes

  }



  if (scene.nodes.length === 0) {

    return []

  }



  const nodesWithIncoming = new Set(scene.connections.map((connection) => connection.toNodeId))

  const hierarchyRoots = scene.nodes.filter((node) => !nodesWithIncoming.has(node.id))



  if (hierarchyRoots.length > 0) {

    return [hierarchyRoots[0]!]

  }



  return [scene.nodes[0]!]

}



function collectSubtreeFromRoots(scene: CanvasScene, rootNodes: readonly CanvasNode[]): CanvasNode[] {

  if (rootNodes.length === 0) {

    return []

  }



  const orderedIds: string[] = []

  const seen = new Set<string>()



  for (const root of rootNodes) {

    const queue: string[] = [root.id]



    while (queue.length > 0) {

      const currentId = queue.shift()!

      if (seen.has(currentId)) {

        continue

      }

      seen.add(currentId)

      orderedIds.push(currentId)



      for (const connection of scene.connections) {

        if (connection.fromNodeId === currentId && !seen.has(connection.toNodeId)) {

          queue.push(connection.toNodeId)

        }

      }

    }

  }



  const byId = new Map(scene.nodes.map((node) => [node.id, node]))

  return orderedIds.map((id) => byId.get(id)).filter((node): node is CanvasNode => node !== undefined)

}



export function collectMainSubtreeNodes(scene: CanvasScene): CanvasNode[] {

  return collectSubtreeFromRoots(scene, findAutoBuildRootNodes(scene))

}



function sanitizeDraftBlockName(canvasNode: CanvasNode, blockName: string): string {

  const trimmed = blockName.trim()

  if (!trimmed.includes('_')) {

    return trimmed

  }



  const humanized = resolveBlockDisplayName(trimmed)

  if (humanized && !humanized.includes('_')) {

    return humanized

  }



  return defaultBlockTypeForCanvasNode(canvasNode).blockTitle

}



export function buildAutoExposedDraft(scene: CanvasScene, canvasNode: CanvasNode): BlockInspectorDraft {

  const draft = buildBlockInspectorDraftFromNode(scene, canvasNode)

  return {

    ...draft,

    blockName: sanitizeDraftBlockName(canvasNode, draft.blockName),

    entries: draft.entries.map((entry) => ({ ...entry, exposed: true })),

  }

}



function parameterCatalogKey(doc: BlockParameterJsonDocument): string {

  return `${doc.block.trim()}::${doc.parameterName.trim()}`

}

function mergeBlockDocumentParameters(

  current: BlockDefinitionJsonDocument,

  incoming: BlockDefinitionJsonDocument,

): BlockDefinitionJsonDocument {

  if (current.id !== incoming.id) {

    return current

  }



  const mergedParameters = [...new Set([...current.parameters, ...incoming.parameters])]
  const mergedHeaderSlots = mergeHeaderSlots(current.headerSlots, incoming.headerSlots)

  const parametersUnchanged =
    mergedParameters.length === current.parameters.length &&
    mergedParameters.every((entry, index) => entry === current.parameters[index])
  const headerSlotsUnchanged =
    mergedHeaderSlots.length === current.headerSlots.length &&
    mergedHeaderSlots.every((entry, index) => entry === current.headerSlots[index])

  if (parametersUnchanged && headerSlotsUnchanged) {

    return current

  }



  return {

    ...current,

    headerSlots: mergedHeaderSlots,

    parameters: mergedParameters,

  }

}

function parseHeaderSlot(
  descriptor: string,
): { direction: 'in' | 'out'; types: string[] } | null {
  const trimmed = descriptor.trim()
  const outMatch = /^(?:output|out)\[(.+)\]$/i.exec(trimmed)
  if (outMatch) {
    return {
      direction: 'out',
      types: outMatch[1].split(',').map((entry) => entry.trim()).filter(Boolean),
    }
  }
  const inMatch = /^(?:input|in)\[(.+)\]$/i.exec(trimmed)
  if (inMatch) {
    return {
      direction: 'in',
      types: inMatch[1].split(',').map((entry) => entry.trim()).filter(Boolean),
    }
  }
  return null
}

function mergeHeaderSlots(current: string[], incoming: string[]): string[] {
  const source = [...current, ...incoming]
  const inTypes: string[] = []
  const outTypes: string[] = []
  const passthrough: string[] = []

  const pushUnique = (target: string[], value: string) => {
    if (!target.includes(value)) {
      target.push(value)
    }
  }

  for (const descriptor of source) {
    const parsed = parseHeaderSlot(descriptor)
    if (!parsed) {
      pushUnique(passthrough, descriptor)
      continue
    }
    const target = parsed.direction === 'in' ? inTypes : outTypes
    for (const type of parsed.types) {
      pushUnique(target, type)
    }
  }

  const merged: string[] = []
  if (inTypes.length > 0) {
    merged.push(`in[${inTypes.join(',')}]`)
  }
  if (outTypes.length > 0) {
    merged.push(`out[${outTypes.join(',')}]`)
  }
  for (const descriptor of passthrough) {
    pushUnique(merged, descriptor)
  }
  return merged
}



function mergeCatalogSliceIntoPlan(

  plan: {

    parameterDocuments: BlockParameterJsonDocument[]

    blockDocuments: BlockDefinitionJsonDocument[]

    errors: string[]

  },

  slice: {

    parameterDocuments: BlockParameterJsonDocument[]

    blockDocuments: BlockDefinitionJsonDocument[]

    warnings: string[]

    errors: string[]

  },

  seenBlockKeys: Set<string>,

  seenParamKeys: Set<string>,

): void {

  for (const error of slice.errors) {

    plan.errors.push(error)

  }



  for (const blockDoc of slice.blockDocuments) {

    const existingIndex = plan.blockDocuments.findIndex((entry) => entry.id === blockDoc.id)
    if (existingIndex >= 0) {
      plan.blockDocuments[existingIndex] = mergeBlockDocumentParameters(
        plan.blockDocuments[existingIndex]!,
        blockDoc,
      )
      const key = blockDefinitionInstanceKey(blockDoc)
      seenBlockKeys.add(key)
      continue
    }

    const key = blockDefinitionInstanceKey(blockDoc)

    if (seenBlockKeys.has(key)) {

      continue

    }

    seenBlockKeys.add(key)

    plan.blockDocuments.push(blockDoc)

  }



  for (const paramDoc of slice.parameterDocuments) {

    const key = parameterCatalogKey(paramDoc)

    if (seenParamKeys.has(key)) {

      continue

    }

    seenParamKeys.add(key)

    plan.parameterDocuments.push(paramDoc)

  }

}



/**

 * Auto build via «Ver código League bin» → parse Class Group → JSON em `blockStructures/`.

 */

export function buildBlockAutoBuildPlanFromViewCode(

  scene: CanvasScene,

  schemaRegistry?: Record<string, NodeSchemaDefinition>,

  options?: { rootNodeId?: string },

): BlockAutoBuildFromViewCodeResult {

  const nodeId = resolveBlockBuildExportNodeId(scene, options?.rootNodeId)

  if (!nodeId) {

    return {

      plan: {

        parameterDocuments: [],

        blockDocuments: [],

        nodeResults: [],

        errors: ['NO_NODES'],

      },

      exportedText: '',

      exportNodeId: '',

      exportWarnings: [],

    }

  }



  const canvasNode = scene.nodes.find((entry) => entry.id === nodeId)

  const subtreeNodes = collectMainSubtreeNodes(scene)

  const effectiveRegistry = mergeSchemaRegistryWithSceneNodes(

    schemaRegistry ?? {},

    subtreeNodes.length > 0 ? subtreeNodes : canvasNode ? [canvasNode] : [],

  )



  const hydratedScene = hydrateScene(scene)

  const exported = emitNodeRitualViewCodeText(hydratedScene, effectiveRegistry, nodeId)

  if (!exported.ok) {

    return {

      plan: {

        parameterDocuments: [],

        blockDocuments: [],

        nodeResults: [],

        errors: [`VIEW_CODE_EXPORT: ${exported.error}`],

      },

      exportedText: '',

      exportNodeId: nodeId,

      exportWarnings: [],

    }

  }



  if (!exported.text.trim()) {

    return {

      plan: {

        parameterDocuments: [],

        blockDocuments: [],

        nodeResults: [],

        errors: ['EMPTY_CODE'],

      },

      exportedText: exported.text,

      exportNodeId: nodeId,

      exportWarnings: exported.warnings,

    }

  }



  if (!canvasNode) {

    return {

      plan: {

        parameterDocuments: [],

        blockDocuments: [],

        nodeResults: [],

        errors: ['NO_NODES'],

      },

      exportedText: exported.text,

      exportNodeId: nodeId,

      exportWarnings: exported.warnings,

    }

  }



  const slice = buildBlockCatalogFromViewCodeText(

    exported.text,

    hydratedScene,

    canvasNode,

    exported.warnings,

  )

  const schemaTitle = canvasNode.node.schema.title.trim() || nodeId

  const nodeErrors = [...slice.errors]

  if (slice.blockDocuments.length === 0 && nodeErrors.length === 0) {

    nodeErrors.push('Nenhum bloco gerado a partir do código ritual')

  }



  const parameterDocuments: BlockParameterJsonDocument[] = []

  const blockDocuments: BlockDefinitionJsonDocument[] = []

  const errors: string[] = []

  const seenBlockKeys = new Set<string>()

  const seenParamKeys = new Set<string>()



  mergeCatalogSliceIntoPlan(

    { parameterDocuments, blockDocuments, errors },

    slice,

    seenBlockKeys,

    seenParamKeys,

  )



  const parse = parseRitualCodeToBlockSchemas(exported.text)

  const rootSchema = resolveRootSchemaFromParse(parse, canvasNode)

  if (rootSchema) {

    const instances = collectBlockInstancesFromRitualParse(parse, rootSchema, hydratedScene, canvasNode)

    const synchronizedParameters = synchronizeParameterDocumentsWithBlockDefinitions(

      blockDocuments,

      parameterDocuments,

      instances,

    )

    parameterDocuments.length = 0

    parameterDocuments.push(...synchronizedParameters)

  }



  if (schemaRegistry && blockDocuments.length > 0) {

    const enriched = enrichAutoBuildPlanWithCatalogParameters(

      parameterDocuments,

      blockDocuments,

      schemaRegistry,

      subtreeNodes.length > 0 ? subtreeNodes : [canvasNode],

    )

    const existing = new Set(parameterDocuments.map(parameterCatalogKey))

    for (const doc of enriched.documents) {

      const key = parameterCatalogKey(doc)

      if (!existing.has(key)) {

        existing.add(key)

        parameterDocuments.push(doc)

      }

    }

    errors.push(...enriched.errors)

  }



  if (slice.warnings.length > 0) {

    errors.push(...slice.warnings.map((warning) => `Export: ${warning}`))

  }



  const plan: BlockAutoBuildPlan = {

    parameterDocuments,

    blockDocuments,

    nodeResults: [

      {

        nodeId,

        schemaTitle,

        parameterCount: parameterDocuments.length,

        blockId: blockDocuments[0]?.id,

        errors: nodeErrors,

      },

    ],

    errors,

  }



  return {

    plan,

    exportedText: exported.text,

    exportNodeId: nodeId,

    exportWarnings: exported.warnings,

  }

}



export function buildBlockAutoBuildPlan(

  scene: CanvasScene,

  schemaRegistry?: Record<string, NodeSchemaDefinition>,

): BlockAutoBuildPlan {

  const subtreeNodes = collectMainSubtreeNodes(scene)

  if (subtreeNodes.length === 0) {

    return {

      parameterDocuments: [],

      blockDocuments: [],

      nodeResults: [],

      errors: ['NO_NODES'],

    }

  }



  const effectiveRegistry = mergeSchemaRegistryWithSceneNodes(schemaRegistry ?? {}, subtreeNodes)

  const preparedScene = prepareSceneForRitualBlockExport(hydrateScene(scene))



  const parameterDocuments: BlockParameterJsonDocument[] = []

  const blockDocuments: BlockDefinitionJsonDocument[] = []

  const nodeResults: BlockAutoBuildNodeResult[] = []

  const errors: string[] = []

  const seenBlockKeys = new Set<string>()

  const seenParamKeys = new Set<string>()



  for (const canvasNode of subtreeNodes) {

    const schemaTitle = canvasNode.node.schema.title.trim() || canvasNode.id

    const exported = emitNodeRitualViewCodeText(preparedScene, effectiveRegistry, canvasNode.id)

    if (!exported.ok) {

      const nodeErrors = [exported.error]

      errors.push(`${schemaTitle} (${canvasNode.id}): ${nodeErrors.join('; ')}`)

      nodeResults.push({

        nodeId: canvasNode.id,

        schemaTitle,

        parameterCount: 0,

        errors: nodeErrors,

      })

      continue

    }



    const slice = buildBlockCatalogFromViewCodeText(

      exported.text,

      preparedScene,

      canvasNode,

      exported.warnings,

    )

    const nodeErrors = [...slice.errors]

    if (slice.blockDocuments.length === 0 && slice.errors.length === 0) {

      nodeErrors.push('Nenhum bloco gerado a partir do código ritual')

    }



    mergeCatalogSliceIntoPlan(

      { parameterDocuments, blockDocuments, errors },

      slice,

      seenBlockKeys,

      seenParamKeys,

    )



    if (nodeErrors.length > 0) {

      errors.push(`${schemaTitle} (${canvasNode.id}): ${nodeErrors.join('; ')}`)

    }



    nodeResults.push({

      nodeId: canvasNode.id,

      schemaTitle,

      parameterCount: slice.parameterDocuments.length,

      blockId: slice.blockDocuments[0]?.id,

      errors: nodeErrors,

    })

  }



  const rootNodes = findAutoBuildRootNodes(scene)

  if (rootNodes[0]) {

    const mainInstances = collectBlockInstancesFromMainSceneExport(

      preparedScene,

      effectiveRegistry,

      rootNodes[0],

    )

    const finalized = synchronizeParameterDocumentsWithBlockDefinitions(

      blockDocuments,

      parameterDocuments,

      mainInstances,

    )

    parameterDocuments.length = 0

    parameterDocuments.push(...finalized)

  }



  if (schemaRegistry && blockDocuments.length > 0) {

    const enriched = enrichAutoBuildPlanWithCatalogParameters(

      parameterDocuments,

      blockDocuments,

      schemaRegistry,

      subtreeNodes,

    )

    const existing = new Set(parameterDocuments.map(parameterCatalogKey))

    for (const doc of enriched.documents) {

      const key = parameterCatalogKey(doc)

      if (!existing.has(key)) {

        existing.add(key)

        parameterDocuments.push(doc)

      }

    }

    errors.push(...enriched.errors)

  }



  return {

    parameterDocuments,

    blockDocuments,

    nodeResults,

    errors,

  }

}

/**
 * Auto build a partir do texto ritual no editor (sem cena):
 * parse Class Group → JSON de blocos/parâmetros em `blockStructures/`.
 */
export function buildBlockAutoBuildPlanFromRitualCode(
  ritualText: string,
  schemaRegistry?: Record<string, NodeSchemaDefinition>,
  options?: { rootBlockName?: string },
): BlockAutoBuildPlan {
  const trimmed = ritualText.trim()
  if (!trimmed) {
    return {
      parameterDocuments: [],
      blockDocuments: [],
      nodeResults: [],
      errors: ['EMPTY_CODE'],
    }
  }

  const prepared = prepareClassGroupRitualParse(trimmed)
  if (!prepared.ok) {
    return {
      parameterDocuments: [],
      blockDocuments: [],
      nodeResults: [],
      errors: [prepared.error],
    }
  }

  const parse = prepared.parse
  const rootSchema = resolveBlockBuildRootSchema(parse, options?.rootBlockName)
  if (!rootSchema) {
    return {
      parameterDocuments: [],
      blockDocuments: [],
      nodeResults: [],
      errors: ['Não foi possível identificar o tipo raiz no ritual.'],
    }
  }

  const instances = collectBlockInstancesFromRitualCode(parse, rootSchema)
  const catalog = buildBlockCatalogFromRitualInstances(instances)
  const schemaTitle = rootSchema.title.trim() || 'Ritual'
  const nodeErrors = [...catalog.errors]

  if (catalog.blockDocuments.length === 0 && nodeErrors.length === 0) {
    nodeErrors.push('Nenhum bloco gerado a partir do código ritual')
  }

  const parameterDocuments: BlockParameterJsonDocument[] = []
  const blockDocuments: BlockDefinitionJsonDocument[] = []
  const errors: string[] = []
  const seenBlockKeys = new Set<string>()
  const seenParamKeys = new Set<string>()

  mergeCatalogSliceIntoPlan(
    { parameterDocuments, blockDocuments, errors },
    catalog,
    seenBlockKeys,
    seenParamKeys,
  )

  const synchronizedParameters = synchronizeParameterDocumentsWithBlockDefinitions(
    blockDocuments,
    parameterDocuments,
    instances,
  )
  parameterDocuments.length = 0
  parameterDocuments.push(...synchronizedParameters)

  if (nodeErrors.length > 0) {
    errors.push(`${schemaTitle} (editor): ${nodeErrors.join('; ')}`)
  }

  if (schemaRegistry && blockDocuments.length > 0) {
    const enriched = enrichAutoBuildPlanWithCatalogParameters(
      parameterDocuments,
      blockDocuments,
      schemaRegistry,
    )
    const existing = new Set(parameterDocuments.map(parameterCatalogKey))
    for (const doc of enriched.documents) {
      const key = parameterCatalogKey(doc)
      if (!existing.has(key)) {
        existing.add(key)
        parameterDocuments.push(doc)
      }
    }
    errors.push(...enriched.errors)
  }

  return {
    parameterDocuments,
    blockDocuments,
    nodeResults: [
      {
        nodeId: '__code_editor__',
        schemaTitle,
        parameterCount: parameterDocuments.length,
        blockId: blockDocuments[0]?.id,
        errors: nodeErrors,
      },
    ],
    errors,
  }
}

export function enrichAutoBuildPlanWithCatalogParameters(

  parameterDocuments: readonly BlockParameterJsonDocument[],

  blockDocuments: readonly BlockDefinitionJsonDocument[],

  schemaRegistry: Record<string, NodeSchemaDefinition>,

  sceneNodes: readonly CanvasNode[] = [],

): { documents: BlockParameterJsonDocument[]; errors: string[] } {

  const existingKeys = new Set(parameterDocuments.map(parameterCatalogKey))

  const documents: BlockParameterJsonDocument[] = []

  const errors: string[] = []

  const processedRoots = new Set<string>()

  const visitedInstances = new Set<string>()



  for (const blockDoc of blockDocuments) {

    if (!blockDoc.parameters?.length) {

      continue

    }



    const instanceKey = blockDefinitionInstanceKey(blockDoc)

    if (!instanceKey || processedRoots.has(instanceKey)) {

      continue

    }

    processedRoots.add(instanceKey)



    if (

      !resolveSchemaIdForBlockDefinitionContext(blockDoc.blockName, schemaRegistry, {

        sceneNodes,

      })

    ) {

      continue

    }



    const collected = collectParameterDocumentsForDefinitionTree(

      blockDoc,

      schemaRegistry,

      visitedInstances,

      { sceneNodes },

    )

    for (const doc of collected) {

      const key = parameterCatalogKey(doc)

      if (existingKeys.has(key)) {

        continue

      }

      existingKeys.add(key)

      documents.push(doc)

    }

  }



  return { documents, errors }

}


