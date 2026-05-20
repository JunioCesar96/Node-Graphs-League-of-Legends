import { resolveCollectionTypeForSlot } from '@/core/collectionTypeLinking'
import type { ElementMenuCatalogScope } from '@/core/elementMenuScopeCatalog'
import { internalStructureDisplayNameFromChildSchema } from '@/core/pathHierarchyInternalStructures'
import type { InternalStructureDefinition, NodeParameterDefinition, NodeSchemaDefinition } from '@/core/nodeSchema'

export type ElementMenuOrganizationMode = 'az' | 'tipo' | 'parameter-type'

export const ELEMENT_MENU_ALL_TYPE_TAG_ID = '__all__'

export type ElementMenuTypeTag = {
  id: string
  label: string
}

export type ElementMenuEntryKind =
  | 'catalog-parameter'
  | 'catalog-list-embed'
  | 'catalog-embed'
  | 'catalog-list-pointer'
  | 'catalog-pointer'

export type ElementMenuPickAction =
  | 'append-parameter'
  | 'append-list-embed-catalog'
  | 'append-embed-catalog'
  | 'append-list-pointer-catalog'
  | 'append-pointer-catalog'

export type ElementMenuCatalogLabelMode = 'base' | 'path-hierarchy'

export type ElementMenuEntry = {
  id: string
  kind: ElementMenuEntryKind
  label: string
  meta: string
  searchText: string
  sortTipo: string
  /** Tipo semântico para tags automáticas (collectionType, parameter.type ou Slot). */
  typeTag: string
  /** Variante de rótulo para estruturas do catálogo (base vs pathHierarchy). */
  catalogLabelMode?: ElementMenuCatalogLabelMode
  /** Origem no pack: raiz do pack (module) vs subpasta (base). */
  catalogScope?: ElementMenuCatalogScope
  parameterType?: string
  onPick: ElementMenuPickAction
  listEmbedId?: string
  listPointerId?: string
  embedId?: string
  pointerId?: string
  structure?: InternalStructureDefinition
  parameter?: NodeParameterDefinition
}

export type BuildElementMenuEntriesInput = {
  catalogParameters?: readonly NodeParameterDefinition[]
  listEmbedCatalog?: readonly {
    listEmbedId: string
    listEmbedTitle: string
    structure: InternalStructureDefinition
  }[]
  embedCatalog?: readonly {
    embedId: string
    embedTitle: string
    structure: InternalStructureDefinition
  }[]
  pointerCatalog?: readonly {
    pointerId: string
    pointerTitle: string
    structure: InternalStructureDefinition
  }[]
  listPointerCatalog?: readonly {
    listPointerId: string
    listPointerTitle: string
    structure: InternalStructureDefinition
  }[]
  includeCatalogParameters: boolean
  includeListEmbedCatalog?: boolean
  includeEmbedCatalog?: boolean
  includeListPointerCatalog?: boolean
  includePointerCatalog?: boolean
  schemaRegistry?: Record<string, NodeSchemaDefinition>
  catalogScope?: ElementMenuCatalogScope
}

export function identifyElementEntryTypeTag(
  kind: ElementMenuEntryKind,
  options: {
    parameterType?: string
    schemaId?: string
    schemaRegistry?: Record<string, NodeSchemaDefinition>
  },
): string {
  if (kind === 'catalog-parameter' && options.parameterType) {
    return options.parameterType
  }

  const schemaId = options.schemaId?.trim()
  if (schemaId && options.schemaRegistry) {
    const collectionType = resolveCollectionTypeForSlot(schemaId, options.schemaRegistry)
    if (collectionType) {
      return collectionType
    }
  }

  if (schemaId) {
    return schemaId
  }

  return 'Outro'
}

export function buildAutomaticTypeTags(entries: readonly ElementMenuEntry[]): ElementMenuTypeTag[] {
  const uniqueLabels = new Set<string>()

  for (const entry of entries) {
    const label = entry.typeTag.trim()
    if (label) {
      uniqueLabels.add(label)
    }
  }

  const sorted = Array.from(uniqueLabels).sort((labelA, labelB) => labelA.localeCompare(labelB))

  if (sorted.length === 0) {
    return []
  }

  const tags = sorted.map((label) => ({
    id: `type:${label}`,
    label,
  }))

  if (tags.length <= 1) {
    return tags
  }

  return [{ id: ELEMENT_MENU_ALL_TYPE_TAG_ID, label: 'Todos' }, ...tags]
}

function isAllTypeTagFilter(activeTypeTagId: string | null): boolean {
  return !activeTypeTagId || activeTypeTagId === ELEMENT_MENU_ALL_TYPE_TAG_ID
}

export function filterElementMenuEntriesByTypeTag(
  entries: readonly ElementMenuEntry[],
  activeTypeTagId: string | null,
  _catalogScope?: ElementMenuCatalogScope,
): ElementMenuEntry[] {
  if (isAllTypeTagFilter(activeTypeTagId)) {
    return [...entries]
  }

  const prefix = 'type:'
  const label = activeTypeTagId.startsWith(prefix)
    ? activeTypeTagId.slice(prefix.length)
    : activeTypeTagId

  return entries.filter((entry) => entry.typeTag === label)
}

function sortTipoForKind(kind: ElementMenuEntryKind): string {
  if (kind === 'catalog-list-embed') {
    return 'LIST_EMBED'
  }

  if (kind === 'catalog-embed') {
    return 'EMBED'
  }

  if (kind === 'catalog-pointer') {
    return 'POINTER'
  }

  if (kind === 'catalog-list-pointer') {
    return 'LIST_POINTER'
  }

  return 'Parâmetro'
}

export function catalogStructureMenuLabel(
  structure: InternalStructureDefinition,
  schemaRegistry?: Record<string, NodeSchemaDefinition>,
): string {
  const schemaId = structure.schemaId.trim()
  const fromRegistry = schemaId && schemaRegistry?.[schemaId]
  if (fromRegistry) {
    return internalStructureDisplayNameFromChildSchema(fromRegistry)
  }
  const name = structure.name.trim()
  if (name && name !== schemaId) {
    return name
  }
  return schemaId || structure.name
}

export function buildElementMenuEntries(input: BuildElementMenuEntriesInput): ElementMenuEntry[] {
  const entries: ElementMenuEntry[] = []
  const registry = input.schemaRegistry
  const scope = input.catalogScope

  if (input.includeEmbedCatalog && input.embedCatalog) {
    for (const pick of input.embedCatalog) {
      const schemaId = pick.structure.schemaId.trim()
      const childSchema = schemaId && registry?.[schemaId]
      const childLabel = childSchema
        ? catalogStructureMenuLabel(pick.structure, registry)
        : pick.structure.name
      const label = pick.embedTitle
      const meta = `EMBED · ${childLabel}`
      const typeTag = identifyElementEntryTypeTag('catalog-embed', {
        schemaId: pick.structure.schemaId,
        schemaRegistry: registry,
      })

      entries.push({
        id: `embed-catalog:${pick.embedId}:${schemaId}:${pick.structure.id}`,
        kind: 'catalog-embed',
        label,
        meta,
        searchText: `${label} ${pick.embedTitle} ${childLabel} ${schemaId} EMBED ${typeTag}`.toLowerCase(),
        sortTipo: sortTipoForKind('catalog-embed'),
        typeTag,
        catalogScope: scope,
        embedId: pick.embedId,
        onPick: 'append-embed-catalog',
        structure: pick.structure,
      })
    }
  }

  if (input.includePointerCatalog && input.pointerCatalog) {
    for (const pick of input.pointerCatalog) {
      const schemaId = pick.structure.schemaId.trim()
      const childSchema = schemaId && registry?.[schemaId]
      const childLabel = childSchema
        ? catalogStructureMenuLabel(pick.structure, registry)
        : pick.structure.name
      const label = pick.pointerTitle
      const meta = `POINTER · ${childLabel}`
      const typeTag = identifyElementEntryTypeTag('catalog-pointer', {
        schemaId: pick.structure.schemaId,
        schemaRegistry: registry,
      })

      entries.push({
        id: `pointer-catalog:${pick.pointerId}:${schemaId}:${pick.structure.id}`,
        kind: 'catalog-pointer',
        label,
        meta,
        searchText: `${label} ${pick.pointerTitle} ${childLabel} ${schemaId} POINTER ${typeTag}`.toLowerCase(),
        sortTipo: sortTipoForKind('catalog-pointer'),
        typeTag,
        catalogScope: scope,
        pointerId: pick.pointerId,
        onPick: 'append-pointer-catalog',
        structure: pick.structure,
      })
    }
  }

  if (input.includeListPointerCatalog && input.listPointerCatalog) {
    for (const pick of input.listPointerCatalog) {
      const schemaId = pick.structure.schemaId.trim()
      const childSchema = schemaId && registry?.[schemaId]
      const childLabel = childSchema
        ? catalogStructureMenuLabel(pick.structure, registry)
        : pick.structure.name
      const label = pick.listPointerTitle
      const meta = `LIST_POINTER · ${childLabel}`
      const typeTag = identifyElementEntryTypeTag('catalog-list-pointer', {
        schemaId: pick.structure.schemaId,
        schemaRegistry: registry,
      })

      entries.push({
        id: `list-pointer-catalog:${pick.listPointerId}:${schemaId}:${pick.structure.id}`,
        kind: 'catalog-list-pointer',
        label,
        meta,
        searchText:
          `${label} ${pick.listPointerTitle} ${childLabel} ${schemaId} LIST_POINTER ${typeTag}`.toLowerCase(),
        sortTipo: sortTipoForKind('catalog-list-pointer'),
        typeTag,
        catalogScope: scope,
        listPointerId: pick.listPointerId,
        onPick: 'append-list-pointer-catalog',
        structure: pick.structure,
      })
    }
  }

  if (input.includeListEmbedCatalog && input.listEmbedCatalog) {
    for (const pick of input.listEmbedCatalog) {
      const schemaId = pick.structure.schemaId.trim()
      const childSchema = schemaId && registry?.[schemaId]
      const childLabel = childSchema
        ? catalogStructureMenuLabel(pick.structure, registry)
        : pick.structure.name
      const label = pick.listEmbedTitle
      const meta = `LIST_EMBED · ${childLabel}`
      const typeTag = identifyElementEntryTypeTag('catalog-list-embed', {
        schemaId: pick.structure.schemaId,
        schemaRegistry: registry,
      })

      entries.push({
        id: `list-embed-catalog:${pick.listEmbedId}:${schemaId}:${pick.structure.id}`,
        kind: 'catalog-list-embed',
        label,
        meta,
        searchText: `${label} ${pick.listEmbedTitle} ${childLabel} ${schemaId} LIST_EMBED ${typeTag}`.toLowerCase(),
        sortTipo: sortTipoForKind('catalog-list-embed'),
        typeTag,
        catalogScope: scope,
        listEmbedId: pick.listEmbedId,
        onPick: 'append-list-embed-catalog',
        structure: pick.structure,
      })
    }
  }

  if (input.includeCatalogParameters && input.catalogParameters) {
    for (const parameter of input.catalogParameters) {
      const meta = `novo parâmetro · ${parameter.type}`
      const typeTag = identifyElementEntryTypeTag('catalog-parameter', {
        parameterType: parameter.type,
      })
      entries.push({
        id: `catalog-param:${parameter.type}:${parameter.name}:${parameter.defaultValue}`,
        kind: 'catalog-parameter',
        label: parameter.name,
        meta,
        searchText: `${parameter.name} ${parameter.type} ${typeTag} parâmetro`.toLowerCase(),
        sortTipo: sortTipoForKind('catalog-parameter'),
        typeTag,
        catalogScope: scope,
        parameterType: parameter.type,
        onPick: 'append-parameter',
        parameter,
      })
    }
  }

  return entries
}

export function filterElementMenuEntriesByCatalogScope(
  entries: readonly ElementMenuEntry[],
  catalogScope: ElementMenuCatalogScope,
): ElementMenuEntry[] {
  return entries.filter((entry) => entry.catalogScope === catalogScope)
}

export function matchesElementMenuQuery(entry: ElementMenuEntry, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return entry.searchText.includes(normalizedQuery)
}

export function sortElementMenuEntries(
  entries: readonly ElementMenuEntry[],
  organization: ElementMenuOrganizationMode,
): ElementMenuEntry[] {
  const sorted = [...entries]

  if (organization === 'tipo') {
    return sorted.sort((entryA, entryB) => {
      const tipoCompare = entryA.sortTipo.localeCompare(entryB.sortTipo)
      if (tipoCompare !== 0) {
        return tipoCompare
      }

      return entryA.label.localeCompare(entryB.label)
    })
  }

  if (organization === 'parameter-type') {
    return sorted.sort((entryA, entryB) => {
      const isParamA = entryA.kind === 'catalog-parameter'
      const isParamB = entryB.kind === 'catalog-parameter'

      if (isParamA && !isParamB) {
        return -1
      }

      if (!isParamA && isParamB) {
        return 1
      }

      if (isParamA && isParamB) {
        const typeCompare = (entryA.parameterType ?? '').localeCompare(entryB.parameterType ?? '')
        if (typeCompare !== 0) {
          return typeCompare
        }
      }

      return entryA.label.localeCompare(entryB.label)
    })
  }

  return sorted.sort((entryA, entryB) => entryA.label.localeCompare(entryB.label))
}

export function filterAndSortElementMenuEntries(
  entries: readonly ElementMenuEntry[],
  query: string,
  organization: ElementMenuOrganizationMode,
  activeTypeTagId: string | null = null,
  catalogScope?: ElementMenuCatalogScope,
): ElementMenuEntry[] {
  const byType = filterElementMenuEntriesByTypeTag(entries, activeTypeTagId, catalogScope)
  const byQuery = byType.filter((entry) => matchesElementMenuQuery(entry, query))

  return sortElementMenuEntries(byQuery, organization)
}
