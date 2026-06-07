import {
  buildSyncedBlockCatalogFromRitualInstances,
  collectBlockInstancesFromRitualCode,
  parseRitualCodeToBlockSchemas,
  resolveBlockBuildRootSchema,
} from './blockAutoBuildFromRitualCode'
import { enrichAutoBuildPlanWithCatalogParameters } from './blockAutoBuild'
import { blockDefinitionInstanceKey } from './blockDefinitionSchemaResolve'
import { resolveSchemaIdForBlockDefinition } from './blockDefinitionJson'
import { buildBlockSpawnCatalog } from './blockSpawnCatalog'
import {
  planBlockHierarchySpawnFromInstances,
  planBlockHierarchySpawnFromInstancesAsync,
  mergeBlockHierarchyIntoScene,
} from './blockHierarchySpawn'
import type { ClassGroupStackParseResult } from './classGroupRitualStackParser'
import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  emptyCanvasScene,
  type CanvasScene,
} from './canvasScene'
import type { BlockParameterJsonDocument } from './blockParameterJson'
import type { NodeSchemaDefinition } from './nodeSchema'
import { applyLightModeToScene } from './sceneLightMode'
import { applyHideLinkedChildrenForVfxEmitterNodes } from './vfxEmitterLinkedChildrenVisibility'

import type {
  CodeToBlockSceneProgress,
  CodeToBlockSceneProgressKind,
  CodeToBlockSceneResult,
} from './codeToBlockScene'

const LAYOUT_ORIGIN_X = 120
const LAYOUT_ORIGIN_Y = 120

const PARAM_PROGRESS_YIELD_BATCH = 25
const BLOCK_PROGRESS_YIELD_BATCH = 1

export type BuildCodeToBlockSceneHooks = {
  onProgress?: (progress: CodeToBlockSceneProgress) => void
  shouldCancel?: () => boolean
  /** Quando definido, cede à UI entre lotes (thread principal). Omitir no Web Worker. */
  yieldUi?: () => Promise<void>
}

function buildProgressSnapshot(input: {
  completed: number
  total: number
  currentLabel: string
  currentKind: CodeToBlockSceneProgressKind
  blockTotal: number
  parameterTotal: number
  blocksDone: number
  parametersDone: number
}): CodeToBlockSceneProgress {
  return { ...input }
}

import { blockParameterCatalogKey } from './blockSpawnCatalog'

function mergeRitualParseIntoSchemaLookup(
  parse: ClassGroupStackParseResult,
  schemaLookup: Record<string, NodeSchemaDefinition>,
): Record<string, NodeSchemaDefinition> {
  const merged: Record<string, NodeSchemaDefinition> = { ...schemaLookup }
  for (const parsed of parse.registry.values()) {
    const id = parsed.id.trim()
    if (!id) {
      continue
    }
    merged[id] = parsed
  }
  return merged
}

function resolveInstanceSchemaId(
  instanceSchemaId: string,
  blockName: string,
  schemaLookup: Record<string, NodeSchemaDefinition>,
): string | null {
  const preferred = instanceSchemaId.trim()
  if (preferred && schemaLookup[preferred]) {
    return preferred
  }
  return resolveSchemaIdForBlockDefinition(blockName, schemaLookup)
}

/** Pipeline completo Code To Node Block — reutilizável na thread principal ou em Web Worker. */
export async function buildCodeToBlockScene(
  ritualText: string,
  schemaLookup: Record<string, NodeSchemaDefinition>,
  options?: { rootBlockName?: string } & BuildCodeToBlockSceneHooks,
): Promise<CodeToBlockSceneResult> {
  const report = (progress: CodeToBlockSceneProgress) => {
    options?.onProgress?.(progress)
  }

  const cancelled = () => options?.shouldCancel?.() ?? false
  const yieldUi = options?.yieldUi

  const trimmed = ritualText.trim()
  if (!trimmed) {
    return { ok: false, error: 'O editor de código está vazio.' }
  }

  report(
    buildProgressSnapshot({
      completed: 0,
      total: 1,
      currentLabel: 'A analisar código ritual…',
      currentKind: 'phase',
      blockTotal: 0,
      parameterTotal: 0,
      blocksDone: 0,
      parametersDone: 0,
    }),
  )

  if (yieldUi) {
    await yieldUi()
    if (cancelled()) {
      return { ok: false, error: 'Operação cancelada pelo utilizador.' }
    }
  }

  const parse = parseRitualCodeToBlockSchemas(trimmed)
  const rootSchema = resolveBlockBuildRootSchema(parse, options?.rootBlockName)
  if (!rootSchema) {
    return {
      ok: false,
      error: 'Não foi possível identificar o tipo raiz no ritual (Class Group).',
    }
  }

  const instances = collectBlockInstancesFromRitualCode(parse, rootSchema)
  if (instances.length === 0) {
    return { ok: false, error: 'Nenhum bloco reconhecido no ritual.' }
  }

  const mergedSchemaLookup = mergeRitualParseIntoSchemaLookup(parse, schemaLookup)
  let catalog = buildSyncedBlockCatalogFromRitualInstances(instances, parse.warnings)
  const warnings = [...catalog.warnings]

  if (catalog.errors.length > 0) {
    return { ok: false, error: catalog.errors.join('\n') }
  }

  const blockTotal = catalog.blockDocuments.length
  const parameterTotal = catalog.parameterDocuments.length
  const instanceTotal = instances.length
  const total = 1 + parameterTotal + blockTotal + instanceTotal
  let completed = 1
  let parametersDone = 0
  let blocksDone = 0

  report(
    buildProgressSnapshot({
      completed,
      total,
      currentLabel: 'Código analisado',
      currentKind: 'phase',
      blockTotal,
      parameterTotal,
      blocksDone,
      parametersDone,
    }),
  )

  if (yieldUi) {
    await yieldUi()
    if (cancelled()) {
      return { ok: false, error: 'Operação cancelada pelo utilizador.' }
    }
  }

  for (let index = 0; index < catalog.parameterDocuments.length; index += 1) {
    const paramDoc = catalog.parameterDocuments[index]!
    completed += 1
    parametersDone += 1
    report(
      buildProgressSnapshot({
        completed,
        total,
        currentLabel: `${paramDoc.block.trim()} · ${paramDoc.parameterName.trim()}`,
        currentKind: 'parameter',
        blockTotal,
        parameterTotal,
        blocksDone,
        parametersDone,
      }),
    )

    if (yieldUi && index % PARAM_PROGRESS_YIELD_BATCH === 0) {
      await yieldUi()
      if (cancelled()) {
        return { ok: false, error: 'Operação cancelada pelo utilizador.' }
      }
    }
  }

  for (let index = 0; index < catalog.blockDocuments.length; index += 1) {
    const blockDoc = catalog.blockDocuments[index]!
    completed += 1
    blocksDone += 1
    report(
      buildProgressSnapshot({
        completed,
        total,
        currentLabel: `${blockDoc.blockName.trim()} (${blockDoc.name.trim()})`,
        currentKind: 'block',
        blockTotal,
        parameterTotal,
        blocksDone,
        parametersDone,
      }),
    )

    if (yieldUi && index % BLOCK_PROGRESS_YIELD_BATCH === 0) {
      await yieldUi()
      if (cancelled()) {
        return { ok: false, error: 'Operação cancelada pelo utilizador.' }
      }
    }
  }

  if (catalog.blockDocuments.length > 0) {
    const enriched = enrichAutoBuildPlanWithCatalogParameters(
      catalog.parameterDocuments,
      catalog.blockDocuments,
      mergedSchemaLookup,
    )
    const existing = new Set(catalog.parameterDocuments.map(blockParameterCatalogKey))
    const parameterDocuments = [...catalog.parameterDocuments]
    for (const doc of enriched.documents) {
      const key = blockParameterCatalogKey(doc)
      if (!existing.has(key)) {
        existing.add(key)
        parameterDocuments.push(doc)
      }
    }
    catalog = {
      ...catalog,
      parameterDocuments,
    }
    if (enriched.errors.length > 0) {
      warnings.push(...enriched.errors)
    }
  }

  const rootInstance = instances[0]!
  const rootDocument = catalog.blockDocuments.find(
    (document) =>
      blockDefinitionInstanceKey(document) ===
      blockDefinitionInstanceKey({
        blockName: rootInstance.blockName,
        source: { nodeId: rootInstance.nodeId },
      }),
  )

  if (!rootDocument) {
    return {
      ok: false,
      error: `Definição de bloco não gerada para "${rootInstance.blockName}".`,
    }
  }

  const schemaId = resolveInstanceSchemaId(rootInstance.schemaId, rootDocument.blockName, mergedSchemaLookup)
  if (!schemaId) {
    return {
      ok: false,
      error: `Schema não encontrado para o bloco "${rootDocument.blockName}". Adicione o tipo ao pack de schemas.`,
    }
  }

  if (!mergedSchemaLookup[schemaId]) {
    return { ok: false, error: `Schema "${schemaId}" indisponível no registo.` }
  }

  const spawnCatalog = buildBlockSpawnCatalog(catalog)
  const baseScene: CanvasScene = {
    ...emptyCanvasScene,
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT,
  }

  let spawnReported = 0

  const plan = yieldUi
    ? await planBlockHierarchySpawnFromInstancesAsync(
        instances,
        mergedSchemaLookup,
        baseScene,
        { x: LAYOUT_ORIGIN_X, y: LAYOUT_ORIGIN_Y },
        spawnCatalog,
        {
          shouldCancel: cancelled,
          yieldUi,
          onInstanceProgress: (spawnProgress) => {
            spawnReported += 1
            completed = 1 + parameterTotal + blockTotal + spawnReported
            report(
              buildProgressSnapshot({
                completed,
                total,
                currentLabel: `${spawnProgress.blockName.trim()} (${spawnProgress.displayName.trim()})`,
                currentKind: 'block',
                blockTotal,
                parameterTotal,
                blocksDone: blockTotal,
                parametersDone: parameterTotal,
              }),
            )
          },
        },
      )
    : planBlockHierarchySpawnFromInstances(
        instances,
        mergedSchemaLookup,
        baseScene,
        { x: LAYOUT_ORIGIN_X, y: LAYOUT_ORIGIN_Y },
        spawnCatalog,
      )

  if (cancelled()) {
    return { ok: false, error: 'Operação cancelada pelo utilizador.' }
  }

  if (!plan) {
    return { ok: false, error: 'Não foi possível instanciar a hierarquia de blocos na cena.' }
  }

  const scene = applyHideLinkedChildrenForVfxEmitterNodes(
    applyLightModeToScene(mergeBlockHierarchyIntoScene(baseScene, plan), {
      initBlockIndices: true,
      initMainEntriesVfxIndex: true,
    }),
  )

  const spawnedBlockIds = new Set(
    plan.nodes.filter((node) => node.blockViewActive).map((node) => node.id),
  )
  const missingBlocks = catalog.blockDocuments.filter(
    (document) => !spawnedBlockIds.has(document.source.nodeId),
  )
  if (missingBlocks.length > 0) {
    warnings.push(
      ...missingBlocks.slice(0, 20).map(
        (document) =>
          `${document.blockName} (${document.name}): bloco no catálogo mas não instanciado na hierarquia.`,
      ),
    )
    if (missingBlocks.length > 20) {
      warnings.push(
        `… e mais ${String(missingBlocks.length - 20)} bloco(s) não instanciado(s) na hierarquia.`,
      )
    }
  }

  report(
    buildProgressSnapshot({
      completed: total,
      total,
      currentLabel: 'Concluído',
      currentKind: 'phase',
      blockTotal,
      parameterTotal,
      blocksDone: blockTotal,
      parametersDone: parameterTotal,
    }),
  )

  return {
    ok: true,
    scene,
    rootNodeId: plan.rootNodeId,
    warnings,
  }
}

/** Variante síncrona (testes / API legada) — spawn síncrono, sem ceder à UI. */
export function buildCodeToBlockSceneSync(
  ritualText: string,
  schemaLookup: Record<string, NodeSchemaDefinition>,
  options?: { rootBlockName?: string },
): CodeToBlockSceneResult {
  const trimmed = ritualText.trim()
  if (!trimmed) {
    return { ok: false, error: 'O editor de código está vazio.' }
  }

  const parse = parseRitualCodeToBlockSchemas(trimmed)
  const rootSchema = resolveBlockBuildRootSchema(parse, options?.rootBlockName)
  if (!rootSchema) {
    return {
      ok: false,
      error: 'Não foi possível identificar o tipo raiz no ritual (Class Group).',
    }
  }

  const instances = collectBlockInstancesFromRitualCode(parse, rootSchema)
  if (instances.length === 0) {
    return { ok: false, error: 'Nenhum bloco reconhecido no ritual.' }
  }

  const mergedSchemaLookup = mergeRitualParseIntoSchemaLookup(parse, schemaLookup)
  let catalog = buildSyncedBlockCatalogFromRitualInstances(instances, parse.warnings)
  const warnings = [...catalog.warnings]

  if (catalog.errors.length > 0) {
    return { ok: false, error: catalog.errors.join('\n') }
  }

  if (catalog.blockDocuments.length > 0) {
    const enriched = enrichAutoBuildPlanWithCatalogParameters(
      catalog.parameterDocuments,
      catalog.blockDocuments,
      mergedSchemaLookup,
    )
    const existing = new Set(catalog.parameterDocuments.map(blockParameterCatalogKey))
    const parameterDocuments = [...catalog.parameterDocuments]
    for (const doc of enriched.documents) {
      const key = blockParameterCatalogKey(doc)
      if (!existing.has(key)) {
        existing.add(key)
        parameterDocuments.push(doc)
      }
    }
    catalog = {
      ...catalog,
      parameterDocuments,
    }
    if (enriched.errors.length > 0) {
      warnings.push(...enriched.errors)
    }
  }

  const rootInstance = instances[0]!
  const rootDocument = catalog.blockDocuments.find(
    (document) =>
      blockDefinitionInstanceKey(document) ===
      blockDefinitionInstanceKey({
        blockName: rootInstance.blockName,
        source: { nodeId: rootInstance.nodeId },
      }),
  )

  if (!rootDocument) {
    return {
      ok: false,
      error: `Definição de bloco não gerada para "${rootInstance.blockName}".`,
    }
  }

  const schemaId = resolveInstanceSchemaId(rootInstance.schemaId, rootDocument.blockName, mergedSchemaLookup)
  if (!schemaId) {
    return {
      ok: false,
      error: `Schema não encontrado para o bloco "${rootDocument.blockName}". Adicione o tipo ao pack de schemas.`,
    }
  }

  if (!mergedSchemaLookup[schemaId]) {
    return { ok: false, error: `Schema "${schemaId}" indisponível no registo.` }
  }

  const spawnCatalog = buildBlockSpawnCatalog(catalog)
  const baseScene: CanvasScene = {
    ...emptyCanvasScene,
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT,
  }

  const plan = planBlockHierarchySpawnFromInstances(
    instances,
    mergedSchemaLookup,
    baseScene,
    { x: LAYOUT_ORIGIN_X, y: LAYOUT_ORIGIN_Y },
    spawnCatalog,
  )

  if (!plan) {
    return { ok: false, error: 'Não foi possível instanciar a hierarquia de blocos na cena.' }
  }

  const scene = applyHideLinkedChildrenForVfxEmitterNodes(
    applyLightModeToScene(mergeBlockHierarchyIntoScene(baseScene, plan), {
      initBlockIndices: true,
      initMainEntriesVfxIndex: true,
    }),
  )

  const spawnedBlockIds = new Set(
    plan.nodes.filter((node) => node.blockViewActive).map((node) => node.id),
  )
  const missingBlocks = catalog.blockDocuments.filter(
    (document) => !spawnedBlockIds.has(document.source.nodeId),
  )
  if (missingBlocks.length > 0) {
    warnings.push(
      ...missingBlocks.slice(0, 20).map(
        (document) =>
          `${document.blockName} (${document.name}): bloco no catálogo mas não instanciado na hierarquia.`,
      ),
    )
    if (missingBlocks.length > 20) {
      warnings.push(
        `… e mais ${String(missingBlocks.length - 20)} bloco(s) não instanciado(s) na hierarquia.`,
      )
    }
  }

  return {
    ok: true,
    scene,
    rootNodeId: plan.rootNodeId,
    warnings,
  }
}
