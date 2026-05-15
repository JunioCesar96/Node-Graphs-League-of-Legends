import { resolveCollectionTypeForSlot } from '@/core/collectionTypeLinking'
import type { InternalStructureDefinition, NodeParameterDefinition, NodeSchemaDefinition } from '@/core/nodeSchema'

export type ElementMenuOrganizationMode = 'az' | 'tipo' | 'parameter-type'

export const ELEMENT_MENU_ALL_TYPE_TAG_ID = '__all__'

export type ElementMenuTypeTag = {
  id: string
  label: string
}

export type ElementMenuEntryKind = 'preset-slot' | 'catalog-structure' | 'catalog-parameter'

export type ElementMenuPickAction = 'create-element' | 'append-structure' | 'append-parameter'

export type ElementMenuEntry = {
  id: string
  kind: ElementMenuEntryKind
  label: string
  meta: string
  searchText: string
  sortTipo: string
  /** Tipo semântico para tags automáticas (collectionType, parameter.type ou Slot). */
  typeTag: string
  parameterType?: string
  onPick: ElementMenuPickAction
  structure?: InternalStructureDefinition
  parameter?: NodeParameterDefinition
}

export type BuildElementMenuEntriesInput = {
  presetStructures: readonly InternalStructureDefinition[]
  catalogStructures?: readonly InternalStructureDefinition[]
  catalogParameters?: readonly NodeParameterDefinition[]
  includeCatalogStructures: boolean
  includeCatalogParameters: boolean
  schemaRegistry?: Record<string, NodeSchemaDefinition>
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

  if (kind === 'preset-slot') {
    return 'Slot'
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

  return kind === 'catalog-structure' ? 'Internal_Structure' : 'Outro'
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

export function filterElementMenuEntriesByTypeTag(
  entries: readonly ElementMenuEntry[],
  activeTypeTagId: string | null,
): ElementMenuEntry[] {
  if (!activeTypeTagId || activeTypeTagId === ELEMENT_MENU_ALL_TYPE_TAG_ID) {
    return [...entries]
  }

  const prefix = 'type:'
  const label = activeTypeTagId.startsWith(prefix)
    ? activeTypeTagId.slice(prefix.length)
    : activeTypeTagId

  return entries.filter((entry) => entry.typeTag === label)
}

function sortTipoForKind(kind: ElementMenuEntryKind): string {
  if (kind === 'preset-slot') {
    return 'Slot'
  }

  if (kind === 'catalog-structure') {
    return 'Internal_Structure'
  }

  return 'Parâmetro'
}

export function buildElementMenuEntries(input: BuildElementMenuEntriesInput): ElementMenuEntry[] {
  const entries: ElementMenuEntry[] = []
  const registry = input.schemaRegistry

  for (const structure of input.presetStructures) {
    const meta = structure.schemaId
    const typeTag = identifyElementEntryTypeTag('preset-slot', {
      schemaId: structure.schemaId,
      schemaRegistry: registry,
    })
    entries.push({
      id: `preset:${structure.id}`,
      kind: 'preset-slot',
      label: structure.name,
      meta,
      searchText: `${structure.name} ${meta} ${typeTag} Slot`.toLowerCase(),
      sortTipo: sortTipoForKind('preset-slot'),
      typeTag,
      onPick: 'create-element',
      structure,
    })
  }

  if (input.includeCatalogStructures && input.catalogStructures) {
    for (const structure of input.catalogStructures) {
      const meta = `Internal_Structure · ${structure.schemaId}`
      const typeTag = identifyElementEntryTypeTag('catalog-structure', {
        schemaId: structure.schemaId,
        schemaRegistry: registry,
      })
      entries.push({
        id: `catalog-is:${structure.schemaId}:${structure.name}`,
        kind: 'catalog-structure',
        label: structure.name,
        meta,
        searchText: `${structure.name} ${structure.schemaId} ${typeTag} Internal_Structure`.toLowerCase(),
        sortTipo: sortTipoForKind('catalog-structure'),
        typeTag,
        onPick: 'append-structure',
        structure,
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
        parameterType: parameter.type,
        onPick: 'append-parameter',
        parameter,
      })
    }
  }

  return entries
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
): ElementMenuEntry[] {
  const byType = filterElementMenuEntriesByTypeTag(entries, activeTypeTagId)
  const byQuery = byType.filter((entry) => matchesElementMenuQuery(entry, query))

  return sortElementMenuEntries(byQuery, organization)
}
