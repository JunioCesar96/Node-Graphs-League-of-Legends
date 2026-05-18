/**
 * Filtro do menu «+ Elemento»: estruturas internas válidas por `pathHierarchySteps` + `collection`.
 * Filho válido: `pathHierarchySteps` do candidato contém `type ===` collection do pai;
 * nível da collection do filho = nível do pai + 1 (#2→#3), ou aninhado #3→#3 (embed).
 */

import type {
  InternalStructureDefinition,
  NodeSchemaDefinition,
  NomenclaturePathSegment,
} from '@/core/nodeSchema'

/**
 * `pack/entidade.json` na raiz do pack (pasta mãe) — instância convertida, não template base.
 * `pack/pack_Type/Type.json` — template em subpasta (candidato a «+ Elemento»).
 */
export function isNodeStructurePackSubfolderPath(relativePath: string): boolean {
  const segments = relativePath.replace(/\\/g, '/').split('/').filter(Boolean)
  return segments.length === 3
}

/** JSON na raiz do pack (`pack/entidade.json`). */
export function isNodeStructurePackRootPath(relativePath: string): boolean {
  const segments = relativePath.replace(/\\/g, '/').split('/').filter(Boolean)
  return segments.length === 2
}

export function isPackRootSchemaId(
  schemaId: string,
  jsonRelativePathBySchemaId: Record<string, string> | undefined,
): boolean {
  if (!jsonRelativePathBySchemaId) {
    return false
  }
  const rel = jsonRelativePathBySchemaId[schemaId]?.trim()
  if (!rel) {
    return false
  }
  return isNodeStructurePackRootPath(rel)
}

export function isPackSubfolderSchemaId(
  schemaId: string,
  jsonRelativePathBySchemaId: Record<string, string> | undefined,
): boolean {
  if (!jsonRelativePathBySchemaId) {
    return true
  }
  const rel = jsonRelativePathBySchemaId[schemaId]?.trim()
  if (!rel) {
    return false
  }
  return isNodeStructurePackSubfolderPath(rel)
}

/** Extrai o número após `#` em labels tipo `#2 Root Entry (TypeName)`. */
export function nomenclatureCollectionLevel(collection: string | undefined): number | null {
  if (typeof collection !== 'string') {
    return null
  }
  const m = /^#\s*(\d+)/.exec(collection.trim())
  if (!m) {
    return null
  }
  const n = Number.parseInt(m[1]!, 10)
  return Number.isFinite(n) ? n : null
}

export function pathStepsContainCollectionType(
  steps: readonly NomenclaturePathSegment[] | undefined,
  parentCollection: string,
): boolean {
  const parent = parentCollection.trim()
  if (!parent || !steps?.length) {
    return false
  }
  return steps.some((s) => s.type.trim() === parent)
}

function lastPathStep(
  steps: readonly NomenclaturePathSegment[] | undefined,
): NomenclaturePathSegment | undefined {
  if (!steps?.length) {
    return undefined
  }
  return steps[steps.length - 1]
}

/**
 * Nome de exibição no catálogo / slot dinâmico: `title` ou `id` do schema filho (base),
 * nunca o último segmento de `pathHierarchySteps`.
 */
export function internalStructureDisplayNameFromChildSchema(childSchema: NodeSchemaDefinition): string {
  const title = childSchema.title.trim()
  if (title) {
    return title
  }
  return childSchema.id
}

/**
 * Rótulo alternativo pelo último `pathHierarchySteps.id` (ex.: Idle1), quando difere do id/título base.
 */
export function internalStructurePathHierarchyLabelFromChildSchema(
  childSchema: NodeSchemaDefinition,
): string | null {
  const lastId = lastPathStep(childSchema.nomenclature?.pathHierarchySteps)?.id.trim()
  if (!lastId) {
    return null
  }
  const base = internalStructureDisplayNameFromChildSchema(childSchema)
  if (lastId === base) {
    return null
  }
  return lastId
}

/** Rótulo do menu module: último `pathHierarchySteps.id` (ex.: Attack1). */
export function internalStructureMenuLabelFromPathHierarchySteps(
  childSchema: NodeSchemaDefinition,
): string {
  const lastId = lastPathStep(childSchema.nomenclature?.pathHierarchySteps)?.id.trim()
  if (lastId) {
    return lastId
  }
  return internalStructureDisplayNameFromChildSchema(childSchema)
}

/**
 * Verifica se `childSchema` é filho hierárquico directo de `parentSchema` no ritual convertido.
 */
export function isChildStructureByPathHierarchy(
  parentSchema: NodeSchemaDefinition,
  childSchema: NodeSchemaDefinition,
): boolean {
  const parentCollection = parentSchema.nomenclature?.collection?.trim() ?? ''
  const childCollection = childSchema.nomenclature?.collection?.trim() ?? ''
  const childSteps = childSchema.nomenclature?.pathHierarchySteps

  if (!parentCollection || !childCollection || !childSteps?.length) {
    return false
  }

  if (!pathStepsContainCollectionType(childSteps, parentCollection)) {
    return false
  }

  const parentLevel = nomenclatureCollectionLevel(parentCollection)
  const childLevel = nomenclatureCollectionLevel(childCollection)

  if (parentLevel === null || childLevel === null) {
    return false
  }

  if (childLevel === parentLevel + 1) {
    const lastChild = lastPathStep(childSteps)
    return lastChild?.type.trim() === childCollection
  }

  if (childLevel === parentLevel) {
    const lastChild = lastPathStep(childSteps)
    return lastChild?.type.trim() === childCollection
  }

  return false
}

/**
 * Lista candidatos a estrutura interna para um nó base (mesmo registo / pack).
 */
export function listInternalStructureCandidatesForBase(
  parentSchema: NodeSchemaDefinition,
  registry: Record<string, NodeSchemaDefinition>,
  options?: {
    packSchemaIds?: readonly string[]
    jsonRelativePathBySchemaId?: Record<string, string>
  },
): InternalStructureDefinition[] {
  const pathById = options?.jsonRelativePathBySchemaId
  const ids =
    options?.packSchemaIds ??
    Object.keys(registry).filter((id) => id !== parentSchema.id)

  const out: InternalStructureDefinition[] = []

  for (const otherId of ids) {
    if (otherId === parentSchema.id) {
      continue
    }
    if (!isPackSubfolderSchemaId(otherId, pathById)) {
      continue
    }
    const other = registry[otherId]
    if (!other) {
      continue
    }
    if (!isChildStructureByPathHierarchy(parentSchema, other)) {
      continue
    }
    out.push({
      id: `catalog-is-${otherId}`,
      name: internalStructureDisplayNameFromChildSchema(other),
      schemaId: otherId,
    })
  }

  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

/**
 * Candidatos do catálogo **module**: todos os JSON na raiz do pack cujo `pathHierarchySteps`
 * é filho hierárquico de `parentSchema`, com nome = último `pathHierarchySteps.id`.
 */
export function listInternalStructureCandidatesForModuleParent(
  parentSchema: NodeSchemaDefinition,
  registry: Record<string, NodeSchemaDefinition>,
  options?: {
    packSchemaIds?: readonly string[]
    jsonRelativePathBySchemaId?: Record<string, string>
    schemaNodeKindBySchemaId?: Record<string, 'module' | 'base'>
    packFolderBySchemaId?: Record<string, string>
  },
): InternalStructureDefinition[] {
  const pathById = options?.jsonRelativePathBySchemaId
  const parentPack = options?.packFolderBySchemaId?.[parentSchema.id]
  const ids = options?.packSchemaIds ?? Object.keys(registry)
  const out: InternalStructureDefinition[] = []

  for (const otherId of ids) {
    if (otherId === parentSchema.id) {
      continue
    }
    if (!isPackRootSchemaId(otherId, pathById)) {
      continue
    }
    if (options?.schemaNodeKindBySchemaId?.[otherId] !== 'module') {
      continue
    }
    if (parentPack && options?.packFolderBySchemaId?.[otherId] !== parentPack) {
      continue
    }
    const other = registry[otherId]
    if (!other) {
      continue
    }
    if (!isChildStructureByPathHierarchy(parentSchema, other)) {
      continue
    }
    out.push({
      id: `catalog-module-is-${otherId}`,
      name: internalStructureMenuLabelFromPathHierarchySteps(other),
      schemaId: otherId,
    })
  }

  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

/**
 * Filtra catálogo de estruturas internas para o nó base `parentSchema`.
 */
export function filterInternalStructuresByPathHierarchy(
  parentSchema: NodeSchemaDefinition | undefined,
  catalog: readonly InternalStructureDefinition[],
  registry: Record<string, NodeSchemaDefinition>,
  jsonRelativePathBySchemaId?: Record<string, string>,
): InternalStructureDefinition[] {
  if (!parentSchema?.nomenclature?.collection?.trim()) {
    return [...catalog]
  }

  return catalog.filter((item) => {
    if (!isPackSubfolderSchemaId(item.schemaId, jsonRelativePathBySchemaId)) {
      return false
    }
    const target = registry[item.schemaId]
    if (!target) {
      return false
    }
    return isChildStructureByPathHierarchy(parentSchema, target)
  })
}
