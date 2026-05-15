import type { InternalStructureDefinition, NodeParameterDefinition } from '@/core/nodeSchema'

export type ElementMenuOrganizationMode = 'az' | 'tipo' | 'parameter-type'

export type ElementMenuEntryKind = 'preset-slot' | 'catalog-structure' | 'catalog-parameter'

export type ElementMenuPickAction = 'create-element' | 'append-structure' | 'append-parameter'

export type ElementMenuEntry = {
  id: string
  kind: ElementMenuEntryKind
  label: string
  meta: string
  searchText: string
  sortTipo: string
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

  for (const structure of input.presetStructures) {
    const meta = structure.schemaId
    entries.push({
      id: `preset:${structure.id}`,
      kind: 'preset-slot',
      label: structure.name,
      meta,
      searchText: `${structure.name} ${meta} Slot`.toLowerCase(),
      sortTipo: sortTipoForKind('preset-slot'),
      onPick: 'create-element',
      structure,
    })
  }

  if (input.includeCatalogStructures && input.catalogStructures) {
    for (const structure of input.catalogStructures) {
      const meta = `Internal_Structure · ${structure.schemaId}`
      entries.push({
        id: `catalog-is:${structure.schemaId}:${structure.name}`,
        kind: 'catalog-structure',
        label: structure.name,
        meta,
        searchText: `${structure.name} ${structure.schemaId} Internal_Structure`.toLowerCase(),
        sortTipo: sortTipoForKind('catalog-structure'),
        onPick: 'append-structure',
        structure,
      })
    }
  }

  if (input.includeCatalogParameters && input.catalogParameters) {
    for (const parameter of input.catalogParameters) {
      const meta = `novo parâmetro · ${parameter.type}`
      entries.push({
        id: `catalog-param:${parameter.type}:${parameter.name}:${parameter.defaultValue}`,
        kind: 'catalog-parameter',
        label: parameter.name,
        meta,
        searchText: `${parameter.name} ${parameter.type} parâmetro`.toLowerCase(),
        sortTipo: sortTipoForKind('catalog-parameter'),
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
): ElementMenuEntry[] {
  return sortElementMenuEntries(
    entries.filter((entry) => matchesElementMenuQuery(entry, query)),
    organization,
  )
}
