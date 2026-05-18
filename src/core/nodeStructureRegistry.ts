import type {
  InternalStructureDefinition,
  NodeInstance,
  NodeParameterDefinition,
  NodeSchemaDefinition,
} from './nodeSchema'
import {
  nodeParameterDefinitionFromJsonStub,
  nomenclatureGroupNumberFromLabel,
  nodeSchemaFromStructureJson,
} from './nodeStructureJson'
import {
  internalStructureDisplayNameFromChildSchema,
  isChildStructureByPathHierarchy,
  isNodeStructurePackSubfolderPath,
} from './pathHierarchyInternalStructures'
import {
  linked_parameter_values_apply_to_instance,
  translateDiskLinkedPairsToCanvas,
} from './linked_parameter_values'
import { hydrateInstanceHashStringFields } from './hashString'

const modules = import.meta.glob<{ default: unknown }>('../nodeStructures/**/*.json', { eager: true })

function isStructureJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Alinha `required_parameter` do JSON com ids em `parameters` e com stubs do catálogo base (mesma pasta).
 * O `nodeSchemaFromStructureJson` só conhece `parameters` inline; sem isto, obrigatórios só-stub eram perdidos.
 */
function mergeRequiredParameterIdsFromStructureJson(
  schema: NodeSchemaDefinition,
  raw: unknown,
  stubCatalog: NodeParameterDefinition[],
): NodeSchemaDefinition {
  if (!isStructureJsonRecord(raw) || !('required_parameter' in raw)) {
    return schema
  }

  const rawReq = raw.required_parameter
  if (rawReq !== undefined && !Array.isArray(rawReq)) {
    return schema
  }

  const inlineIds = new Set(schema.parameters.map((parameter) => parameter.id))
  const catalogIds = new Set(stubCatalog.map((parameter) => parameter.id))
  const allowed = new Set([...inlineIds, ...catalogIds])

  if (Array.isArray(rawReq) && rawReq.length === 0) {
    return { ...schema, required_parameter: [] }
  }

  if (!Array.isArray(rawReq)) {
    return schema
  }

  const resolved: string[] = []
  for (const item of rawReq) {
    if (typeof item !== 'string' || !allowed.has(item)) {
      continue
    }
    if (!resolved.includes(item)) {
      resolved.push(item)
    }
  }

  if (resolved.length === 0) {
    return schema
  }

  return { ...schema, required_parameter: resolved }
}

function mergeLinkedParameterValuesFromStructureJson(
  schema: NodeSchemaDefinition,
  raw: unknown,
  stubCatalog: NodeParameterDefinition[],
): NodeSchemaDefinition {
  if (!isStructureJsonRecord(raw) || !('linked_parameter_values' in raw)) {
    return schema
  }

  const rawLinks = raw.linked_parameter_values
  if (rawLinks !== undefined && !Array.isArray(rawLinks)) {
    return schema
  }

  const inlineIds = new Set(schema.parameters.map((parameter) => parameter.id))
  const catalogIds = new Set(stubCatalog.map((parameter) => parameter.id))
  const allowed = new Set([...inlineIds, ...catalogIds])

  if (Array.isArray(rawLinks) && rawLinks.length === 0) {
    return { ...schema, linked_parameter_values: [] }
  }

  if (!Array.isArray(rawLinks)) {
    return schema
  }

  const pairs: Array<readonly [string, string]> = []
  for (const item of rawLinks) {
    if (!Array.isArray(item) || item.length !== 2) {
      continue
    }
    const x = item[0]
    const y = item[1]
    if (typeof x !== 'string' || typeof y !== 'string' || x === y) {
      continue
    }
    if (!allowed.has(x) || !allowed.has(y)) {
      continue
    }
    const norm = x <= y ? ([x, y] as const) : ([y, x] as const)
    if (!pairs.some(([a, b]) => a === norm[0] && b === norm[1])) {
      pairs.push(norm)
    }
  }

  const used = new Set<string>()
  const filtered: Array<readonly [string, string]> = []
  for (const [a, b] of pairs) {
    if (used.has(a) || used.has(b)) {
      continue
    }
    used.add(a)
    used.add(b)
    filtered.push([a, b])
  }

  if (filtered.length === 0) {
    return { ...schema, linked_parameter_values: [] }
  }

  return { ...schema, linked_parameter_values: filtered }
}

function mergeHashStringFromStructureJson(
  schema: NodeSchemaDefinition,
  raw: unknown,
  stubCatalog: NodeParameterDefinition[],
): NodeSchemaDefinition {
  if (!isStructureJsonRecord(raw) || !('hashStringParameterId' in raw)) {
    return schema
  }

  const idRaw = raw.hashStringParameterId
  if (idRaw === undefined || idRaw === null) {
    return schema
  }

  if (typeof idRaw !== 'string') {
    console.warn(`[nodeStructures] hashStringParameterId inválido em "${schema.id}", ignorado`)
    return schema
  }

  const id = idRaw.trim()
  if (id.length === 0) {
    const next: NodeSchemaDefinition = { ...schema }
    delete next.hashString
    delete next.hashStringParameterId
    return next
  }

  const inlineIds = new Set(schema.parameters.map((parameter) => parameter.id))
  const catalogIds = new Set(stubCatalog.map((parameter) => parameter.id))
  const allowed = new Set([...inlineIds, ...catalogIds])

  if (!allowed.has(id)) {
    console.warn(`[nodeStructures] hashStringParameterId "${id}" desconhecido em "${schema.id}", ignorado`)
    return schema
  }

  const def =
    schema.parameters.find((parameter) => parameter.id === id) ??
    stubCatalog.find((parameter) => parameter.id === id)

  if (!def || def.type !== 'string') {
    console.warn(`[nodeStructures] hashStringParameterId "${id}" não é string em "${schema.id}", ignorado`)
    return schema
  }

  const hashFromFile = typeof raw.hashString === 'string' ? raw.hashString : def.defaultValue

  return {
    ...schema,
    hashStringParameterId: id,
    hashString: hashFromFile,
  }
}

function pathSegmentsUnderNodeStructures(modulePath: string): string[] {
  const normalized = modulePath.replace(/\\/g, '/')
  const marker = 'nodeStructures/'
  const idx = normalized.indexOf(marker)
  if (idx === -1) {
    return []
  }
  const rest = normalized.slice(idx + marker.length)
  return rest.split('/').filter(Boolean)
}

function packFolderFromModulePath(modulePath: string): string {
  const segments = pathSegmentsUnderNodeStructures(modulePath)
  if (segments.length < 2) {
    return 'unknown'
  }
  return segments[0] ?? 'unknown'
}

/** Primeiro directório dentro do pack (ex. `title_Emitter`); `''` se o JSON está na raiz do pack. */
function structureSubfolderFromModulePath(modulePath: string): string {
  const segments = pathSegmentsUnderNodeStructures(modulePath)
  if (segments.length <= 2) {
    return ''
  }
  return segments[1] ?? ''
}

function modulePathDirectoryPrefix(modulePath: string): string {
  const normalized = modulePath.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/')
  return idx === -1 ? '' : `${normalized.slice(0, idx + 1)}`
}

/**
 * Subpastas tipo `pack_CollectionType`: o único JSON de estrutura de nó é `{collectionType}.json`.
 * Os outros ficheiros são apenas definições de parâmetro e não entram no registry.
 */
function collectionTypeStemFromPackSubfolder(packFolder: string, subfolderName: string): string | null {
  const prefix = `${packFolder}_`
  if (!subfolderName.startsWith(prefix)) {
    return null
  }
  const stem = subfolderName.slice(prefix.length).trim()
  return stem.length > 0 ? stem : null
}

function isNodeStructureJsonCandidate(modulePath: string): boolean {
  const segments = pathSegmentsUnderNodeStructures(modulePath)
  if (segments.length < 2) {
    return false
  }

  // `pack/schema.json` na raiz do pack
  if (segments.length === 2) {
    return true
  }

  // Só um nível de subpasta: `pack/subpasta/ficheiro.json`
  if (segments.length !== 3) {
    return false
  }

  const pack = segments[0] ?? ''
  const subfolder = segments[1] ?? ''
  const fileName = segments[2] ?? ''
  const collectionStem = collectionTypeStemFromPackSubfolder(pack, subfolder)
  if (!collectionStem) {
    return false
  }

  const m = /^(.+)\.json$/i.exec(fileName)
  if (!m) {
    return false
  }

  const fileStem = m[1] ?? ''
  return fileStem.localeCompare(collectionStem, undefined, { sensitivity: 'base' }) === 0
}

function validateInternalStructureRefs(registry: Record<string, NodeSchemaDefinition>): void {
  for (const schema of Object.values(registry)) {
    for (const structure of schema.internalStructures) {
      if (!registry[structure.schemaId]) {
        console.warn(
          `[nodeStructures] schema "${schema.id}" referencia Internal_Structure inválida: "${structure.schemaId}"`,
        )
      }
    }
  }
}

function buildRegistry(): {
  registry: Record<string, NodeSchemaDefinition>
  packFolderBySchemaId: Record<string, string>
  structureSubfolderBySchemaId: Record<string, string>
  pathBySchemaId: Record<string, string>
  /** Caminho relativo a `src/nodeStructures/` até ao `.json` do corpo do nó (ex.: `importado/importado_VFX/VFX.json`). */
  jsonRelativePathBySchemaId: Record<string, string>
  schemaNodeKindBySchemaId: Record<string, 'module' | 'base'>
  schemaBaseParameterCatalogBySchemaId: Record<string, NodeParameterDefinition[]>
  schemaBaseInternalStructureCatalogBySchemaId: Record<string, InternalStructureDefinition[]>
} {
  const registry: Record<string, NodeSchemaDefinition> = {}
  const packFolderBySchemaId: Record<string, string> = {}
  const structureSubfolderBySchemaId: Record<string, string> = {}
  const pathBySchemaId: Record<string, string> = {}
  const jsonRelativePathBySchemaId: Record<string, string> = {}
  const schemaNodeKindBySchemaId: Record<string, 'module' | 'base'> = {}

  for (const [path, mod] of Object.entries(modules)) {
    if (!isNodeStructureJsonCandidate(path)) {
      continue
    }

    const parsed = nodeSchemaFromStructureJson(mod.default)
    if (!parsed) {
      console.warn(`[nodeStructures] estrutura inválida ignorada (${path})`)
      continue
    }

    const packFolder = packFolderFromModulePath(path)
    const subfolder = structureSubfolderFromModulePath(path)
    const existing = registry[parsed.id]
    if (existing) {
      console.warn(`[nodeStructures] id duplicado "${parsed.id}", sobrescrito (${path})`)
    }
    registry[parsed.id] = parsed
    packFolderBySchemaId[parsed.id] = packFolder
    structureSubfolderBySchemaId[parsed.id] = subfolder
    pathBySchemaId[parsed.id] = path
    jsonRelativePathBySchemaId[parsed.id] = pathSegmentsUnderNodeStructures(path).join('/')

    const segments = pathSegmentsUnderNodeStructures(path)
    schemaNodeKindBySchemaId[parsed.id] =
      segments.length === 2 ? 'module' : 'base'
  }

  const schemaBaseParameterCatalogBySchemaId: Record<string, NodeParameterDefinition[]> = {}
  const schemaBaseInternalStructureCatalogBySchemaId: Record<string, InternalStructureDefinition[]> = {}

  for (const schemaId of Object.keys(registry)) {
    const modulePath = pathBySchemaId[schemaId]
    if (!modulePath) {
      continue
    }
    const segments = pathSegmentsUnderNodeStructures(modulePath)
    if (segments.length !== 3) {
      continue
    }

    const dirPrefix = modulePathDirectoryPrefix(modulePath)
    const dirNorm = dirPrefix.replace(/\\/g, '/')
    const stubs: NodeParameterDefinition[] = []

    for (const [otherPath, otherMod] of Object.entries(modules)) {
      const otherNorm = otherPath.replace(/\\/g, '/')
      if (!otherNorm.startsWith(dirNorm)) {
        continue
      }
      if (otherNorm === modulePath.replace(/\\/g, '/')) {
        continue
      }
      const stub = nodeParameterDefinitionFromJsonStub(otherMod.default)
      if (stub) {
        stubs.push(stub)
      }
    }

    stubs.sort((a, b) => a.name.localeCompare(b.name))
    schemaBaseParameterCatalogBySchemaId[schemaId] = stubs
  }

  for (const schemaId of Object.keys(registry)) {
    const modulePath = pathBySchemaId[schemaId]
    if (!modulePath) {
      continue
    }
    const segments = pathSegmentsUnderNodeStructures(modulePath)
    if (segments.length !== 3) {
      continue
    }

    const pack = packFolderFromModulePath(modulePath)
    const schema = registry[schemaId]
    if (!schema.nomenclature?.collection?.trim()) {
      schemaBaseInternalStructureCatalogBySchemaId[schemaId] = []
      continue
    }

    const candidates: InternalStructureDefinition[] = []
    for (const [otherId, otherSchema] of Object.entries(registry)) {
      if (otherId === schemaId) {
        continue
      }
      const otherPath = pathBySchemaId[otherId]
      if (!otherPath) {
        continue
      }
      const otherRel = jsonRelativePathBySchemaId[otherId] ?? ''
      if (!isNodeStructurePackSubfolderPath(otherRel)) {
        continue
      }
      if (packFolderFromModulePath(otherPath) !== pack) {
        continue
      }
      if (!isChildStructureByPathHierarchy(schema, otherSchema)) {
        continue
      }

      candidates.push({
        id: `catalog-is-${otherId}`,
        name: internalStructureDisplayNameFromChildSchema(otherSchema),
        schemaId: otherId,
      })
    }

    candidates.sort((a, b) => a.name.localeCompare(b.name))
    schemaBaseInternalStructureCatalogBySchemaId[schemaId] = candidates
  }

  for (const schemaId of Object.keys(registry)) {
    const modulePath = pathBySchemaId[schemaId]
    if (!modulePath) {
      continue
    }
    const mod = modules[modulePath]
    if (!mod) {
      continue
    }
    const catalog = schemaBaseParameterCatalogBySchemaId[schemaId] ?? []
    registry[schemaId] = mergeRequiredParameterIdsFromStructureJson(registry[schemaId]!, mod.default, catalog)
    registry[schemaId] = mergeLinkedParameterValuesFromStructureJson(registry[schemaId]!, mod.default, catalog)
    registry[schemaId] = mergeHashStringFromStructureJson(registry[schemaId]!, mod.default, catalog)
  }

  validateInternalStructureRefs(registry)
  return {
    registry,
    packFolderBySchemaId,
    structureSubfolderBySchemaId,
    pathBySchemaId,
    jsonRelativePathBySchemaId,
    schemaNodeKindBySchemaId,
    schemaBaseParameterCatalogBySchemaId,
    schemaBaseInternalStructureCatalogBySchemaId,
  }
}

const {
  registry: builtRegistry,
  packFolderBySchemaId: builtPackMap,
  structureSubfolderBySchemaId: builtStructureSubfolderMap,
  jsonRelativePathBySchemaId: builtJsonRelPathMap,
  schemaNodeKindBySchemaId: builtNodeKindMap,
  schemaBaseParameterCatalogBySchemaId: builtBaseParamCatalog,
  schemaBaseInternalStructureCatalogBySchemaId: builtBaseISCatalog,
} = buildRegistry()

export const schemaRegistry: Record<string, NodeSchemaDefinition> = builtRegistry

/** Caminho relativo a `src/nodeStructures/` até ao ficheiro JSON do schema (só estruturas estáticas do bundle). */
export const schemaJsonRelativePathBySchemaId: Record<string, string> = builtJsonRelPathMap

/** Pasta imediata sob `src/nodeStructures/` onde o JSON foi carregado (ex.: `default`). */
export const schemaPackFolderBySchemaId: Record<string, string> = builtPackMap

/**
 * Subpasta imediata sob o pack (`title/title_Emitter/…` → `title_Emitter`; raiz do pack → `''`).
 * `temp` mantém-se como valor para filtragem mas não entra nas etiquetas da paleta.
 */
export const schemaStructureSubfolderBySchemaId: Record<string, string> = builtStructureSubfolderMap

/** JSON na raiz do pack (`pack/ficheiro.json`) → módulo; subpasta `pack/pack_Type/Type.json` → base. */
export const schemaNodeKindBySchemaId: Record<string, 'module' | 'base'> = builtNodeKindMap

/**
 * Para nós base: parâmetros reutilizáveis a partir de `*.json` na mesma pasta (stubs), exceto o corpo `{type}.json`.
 */
export const schemaBaseParameterCatalogBySchemaId: Record<string, NodeParameterDefinition[]> =
  builtBaseParamCatalog

/**
 * Para nós base: outros nós base no mesmo pack com o mesmo número em `nomenclature.group` (`#2 …`).
 */
export const schemaBaseInternalStructureCatalogBySchemaId: Record<string, InternalStructureDefinition[]> =
  builtBaseISCatalog

export function createNodeInstanceFromRegistry(
  registry: Record<string, NodeSchemaDefinition>,
  schemaId: string,
  instanceId: string,
): NodeInstance | null {
  const schema = registry[schemaId]

  if (!schema) {
    return null
  }

  const schemaClone = structuredClone(schema)
  const catalog = schemaBaseParameterCatalogBySchemaId[schemaId] ?? []
  const requiredList = schemaClone.required_parameter ?? []
  const linkedPairs = schemaClone.linked_parameter_values ?? []
  const linkedIdSet = new Set(linkedPairs.flatMap(([a, b]) => [a, b]))

  for (const reqId of requiredList) {
    if (schemaClone.parameters.some((parameter) => parameter.id === reqId)) {
      continue
    }
    const stub = catalog.find((parameter) => parameter.id === reqId)
    if (stub) {
      schemaClone.parameters.push(structuredClone(stub))
    }
  }

  for (const linkId of linkedIdSet) {
    if (schemaClone.parameters.some((parameter) => parameter.id === linkId)) {
      continue
    }
    const stub = catalog.find((parameter) => parameter.id === linkId)
    if (stub) {
      schemaClone.parameters.push(structuredClone(stub))
    }
  }

  const hashListId = schemaClone.hashStringParameterId
  if (typeof hashListId === 'string' && hashListId.length > 0) {
    if (!schemaClone.parameters.some((parameter) => parameter.id === hashListId)) {
      const stub = catalog.find((parameter) => parameter.id === hashListId)
      if (stub) {
        schemaClone.parameters.push(structuredClone(stub))
      }
    }
  }

  const instance: NodeInstance = {
    id: instanceId,
    schema: schemaClone,
    values: schemaClone.parameters.map((parameter) => ({
      parameterId: parameter.id,
      value: parameter.defaultValue,
    })),
  }

  if (schemaClone.required_parameter !== undefined) {
    instance.required_parameter = [...schemaClone.required_parameter]
  }

  if (schemaClone.linked_parameter_values !== undefined) {
    const canvasLinks = translateDiskLinkedPairsToCanvas(
      schemaClone.linked_parameter_values,
      instance,
      catalog,
    )
    if (
      schemaClone.linked_parameter_values.length > 0 &&
      canvasLinks.length === 0
    ) {
      return hydrateInstanceHashStringFields(instance, catalog)
    }
    return hydrateInstanceHashStringFields(
      linked_parameter_values_apply_to_instance(
        instance,
        canvasLinks,
        schemaClone.linked_parameter_values,
        catalog,
      ),
      catalog,
    )
  }

  return hydrateInstanceHashStringFields(instance, catalog)
}

export function createNodeInstance(schemaId: string, instanceId: string): NodeInstance | null {
  return createNodeInstanceFromRegistry(schemaRegistry, schemaId, instanceId)
}
