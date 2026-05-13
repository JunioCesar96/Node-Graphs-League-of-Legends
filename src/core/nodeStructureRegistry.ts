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

const modules = import.meta.glob<{ default: unknown }>('../nodeStructures/**/*.json', { eager: true })

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
  schemaNodeKindBySchemaId: Record<string, 'module' | 'base'>
  schemaBaseParameterCatalogBySchemaId: Record<string, NodeParameterDefinition[]>
  schemaBaseInternalStructureCatalogBySchemaId: Record<string, InternalStructureDefinition[]>
} {
  const registry: Record<string, NodeSchemaDefinition> = {}
  const packFolderBySchemaId: Record<string, string> = {}
  const structureSubfolderBySchemaId: Record<string, string> = {}
  const pathBySchemaId: Record<string, string> = {}
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
    const myGroupN = nomenclatureGroupNumberFromLabel(schema.nomenclature?.group)
    if (myGroupN === null) {
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
      const otherSeg = pathSegmentsUnderNodeStructures(otherPath)
      if (otherSeg.length !== 3) {
        continue
      }
      if (packFolderFromModulePath(otherPath) !== pack) {
        continue
      }
      const otherG = nomenclatureGroupNumberFromLabel(otherSchema.nomenclature?.group)
      if (otherG !== myGroupN) {
        continue
      }

      candidates.push({
        id: `catalog-is-${otherId}`,
        name: otherSchema.title,
        schemaId: otherId,
      })
    }

    candidates.sort((a, b) => a.name.localeCompare(b.name))
    schemaBaseInternalStructureCatalogBySchemaId[schemaId] = candidates
  }

  validateInternalStructureRefs(registry)
  return {
    registry,
    packFolderBySchemaId,
    structureSubfolderBySchemaId,
    pathBySchemaId,
    schemaNodeKindBySchemaId,
    schemaBaseParameterCatalogBySchemaId,
    schemaBaseInternalStructureCatalogBySchemaId,
  }
}

const {
  registry: builtRegistry,
  packFolderBySchemaId: builtPackMap,
  structureSubfolderBySchemaId: builtStructureSubfolderMap,
  schemaNodeKindBySchemaId: builtNodeKindMap,
  schemaBaseParameterCatalogBySchemaId: builtBaseParamCatalog,
  schemaBaseInternalStructureCatalogBySchemaId: builtBaseISCatalog,
} = buildRegistry()

export const schemaRegistry: Record<string, NodeSchemaDefinition> = builtRegistry

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

  return {
    id: instanceId,
    schema: schemaClone,
    values: schemaClone.parameters.map((parameter) => ({
      parameterId: parameter.id,
      value: parameter.defaultValue,
    })),
  }
}

export function createNodeInstance(schemaId: string, instanceId: string): NodeInstance | null {
  return createNodeInstanceFromRegistry(schemaRegistry, schemaId, instanceId)
}
