/**
 * Filtro do menu «+ Elemento»: estruturas internas válidas para o contexto (`pathHierarchySteps`).
 * Nome lógico legado do doc: `elemente_pathHierarchy_internalStructures`.
 */

import type {
  InternalStructureDefinition,
  NodeSchemaDefinition,
  NomenclaturePathSegment,
} from '@/core/nodeSchema'
import { VFX_JADE_EMITTER_EMBED_COLLECTION, VFX_JADE_SYSTEM_ROOT_COLLECTION } from '@/core/vfxJadeNomenclature'

/** Sub-estruturas `#3` habituais sob VFX / embeds aninhados (UI + registo do catálogo). */
export const NESTABLE_STRUCTURE_COLLECTIONS: readonly string[] = [
  VFX_JADE_EMITTER_EMBED_COLLECTION,
  '#3 Collection Block',
  '#3 Pointer Node',
  '#3 Graph Link',
]

/**
 * Último `type` da pilha → `nomenclature.collection` permitida nos schemas candidatos.
 */
export const PATH_HIERARCHY_CONTEXT_TO_ALLOWED_COLLECTIONS: Readonly<
  Record<string, readonly string[]>
> = {
  [VFX_JADE_SYSTEM_ROOT_COLLECTION]: NESTABLE_STRUCTURE_COLLECTIONS,
  '#2 Root Entry (SkinCharacterDataProperties)': ['#3 Embed Block'],
  [VFX_JADE_EMITTER_EMBED_COLLECTION]: NESTABLE_STRUCTURE_COLLECTIONS,
  '#3 Collection Block': NESTABLE_STRUCTURE_COLLECTIONS,
}

export function filterInternalStructuresByPathHierarchy(
  steps: readonly NomenclaturePathSegment[] | undefined,
  catalog: readonly InternalStructureDefinition[],
  registry: Record<string, NodeSchemaDefinition>,
): InternalStructureDefinition[] {
  if (!steps?.length) {
    return [...catalog]
  }
  const contextType = steps[steps.length - 1]!.type.trim()
  const allowed = PATH_HIERARCHY_CONTEXT_TO_ALLOWED_COLLECTIONS[contextType]
  if (!allowed?.length) {
    return [...catalog]
  }
  const allowedSet = new Set(allowed.map((c) => c.trim()))
  return catalog.filter((item) => {
    const target = registry[item.schemaId]
    const coll = target?.nomenclature?.collection?.trim() ?? ''
    if (!coll) {
      return false
    }
    return allowedSet.has(coll)
  })
}
