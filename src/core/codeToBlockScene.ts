import {
  buildBlockCatalogFromRitualInstances,
  collectBlockInstancesFromRitualCode,
  parseRitualCodeToBlockSchemas,
  resolveBlockBuildRootSchema,
} from './blockAutoBuildFromRitualCode'
import { blockDefinitionInstanceKey } from './blockDefinitionSchemaResolve'
import { resolveSchemaIdForBlockDefinition } from './blockDefinitionJson'
import { buildBlockSpawnCatalog } from './blockSpawnCatalog'
import { planBlockHierarchySpawn, mergeBlockHierarchyIntoScene } from './blockHierarchySpawn'
import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  emptyCanvasScene,
  type CanvasScene,
} from './canvasScene'
import type { NodeSchemaDefinition } from './nodeSchema'

const LAYOUT_ORIGIN_X = 120
const LAYOUT_ORIGIN_Y = 120

export type CodeToBlockSceneResult =
  | { ok: true; scene: CanvasScene; rootNodeId: string; warnings: string[] }
  | { ok: false; error: string }

export function codeToBlockScene(
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

  const catalog = buildBlockCatalogFromRitualInstances(instances)
  const warnings = [...parse.warnings, ...catalog.warnings]

  if (catalog.errors.length > 0) {
    return { ok: false, error: catalog.errors.join('\n') }
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

  const schemaId = resolveSchemaIdForBlockDefinition(rootDocument.blockName, schemaLookup)
  if (!schemaId) {
    return {
      ok: false,
      error: `Schema não encontrado para o bloco "${rootDocument.blockName}". Adicione o tipo ao pack de schemas.`,
    }
  }

  const schema = schemaLookup[schemaId]
  if (!schema) {
    return { ok: false, error: `Schema "${schemaId}" indisponível no registo.` }
  }

  const spawnCatalog = buildBlockSpawnCatalog(catalog)
  const baseScene: CanvasScene = {
    ...emptyCanvasScene,
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT,
  }

  const plan = planBlockHierarchySpawn(
    rootDocument,
    schema,
    schemaLookup,
    baseScene,
    { x: LAYOUT_ORIGIN_X, y: LAYOUT_ORIGIN_Y },
    spawnCatalog,
  )

  if (!plan) {
    return { ok: false, error: 'Não foi possível instanciar a hierarquia de blocos na cena.' }
  }

  const scene = mergeBlockHierarchyIntoScene(baseScene, plan)

  return {
    ok: true,
    scene,
    rootNodeId: plan.rootNodeId,
    warnings,
  }
}
