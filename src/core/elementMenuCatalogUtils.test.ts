import { describe, expect, it } from 'vitest'

import {
  buildAutomaticTypeTags,
  buildElementMenuEntries,
  ELEMENT_MENU_ALL_TYPE_TAG_ID,
  filterAndSortElementMenuEntries,
  filterElementMenuEntriesByTypeTag,
  identifyElementEntryTypeTag,
  matchesElementMenuQuery,
  sortElementMenuEntries,
} from './elementMenuCatalogUtils'

describe('elementMenuCatalogUtils', () => {
  const entries = buildElementMenuEntries({
    presetStructures: [{ id: 'slot-a', name: 'Zeta Slot', schemaId: 'z-type' }],
    catalogStructures: [{ id: 'cat-is', name: 'Beta IS', schemaId: 'beta-schema' }],
    catalogParameters: [
      { id: 'p1', name: 'rate', type: 'float', defaultValue: '1' },
      { id: 'p2', name: 'count', type: 'integer', defaultValue: '0' },
    ],
    includeCatalogStructures: true,
    includeCatalogParameters: true,
  })

  it('matchesElementMenuQuery filtra por nome e schemaId', () => {
    const beta = entries.find((entry) => entry.label === 'Beta IS')

    expect(beta).toBeDefined()
    expect(matchesElementMenuQuery(beta!, 'beta-schema')).toBe(true)
    expect(matchesElementMenuQuery(beta!, 'inexistente')).toBe(false)
  })

  it('sortElementMenuEntries ordena A-Z por label', () => {
    const sorted = sortElementMenuEntries(entries, 'az').map((entry) => entry.label)

    expect(sorted).toEqual(['Beta IS', 'count', 'rate', 'Zeta Slot'])
  })

  it('sortElementMenuEntries ordena por tipo', () => {
    const sorted = sortElementMenuEntries(entries, 'tipo').map((entry) => entry.sortTipo)

    expect(sorted[0]).toBe('Internal_Structure')
    expect(sorted.filter((tipo) => tipo === 'Parâmetro').length).toBe(2)
    expect(sorted[sorted.length - 1]).toBe('Slot')
  })

  it('sortElementMenuEntries agrupa parâmetros por tipo de parâmetro', () => {
    const sorted = sortElementMenuEntries(entries, 'parameter-type')
    const paramLabels = sorted
      .filter((entry) => entry.kind === 'catalog-parameter')
      .map((entry) => entry.label)

    expect(paramLabels).toEqual(['rate', 'count'])
    expect(sorted[sorted.length - 1].kind).not.toBe('catalog-parameter')
  })

  it('filterAndSortElementMenuEntries devolve vazio para query sem match', () => {
    expect(filterAndSortElementMenuEntries(entries, 'zzzz', 'az')).toEqual([])
  })

  it('identifyElementEntryTypeTag resolve collectionType do registry', () => {
    expect(
      identifyElementEntryTypeTag('catalog-structure', {
        schemaId: 'Emitter',
        schemaRegistry: {
          Emitter: {
            id: 'Emitter',
            title: 'Emitter',
            parameters: [],
            internalStructures: [],
            nomenclature: { group: '', collection: '', collectionType: 'Emitter' },
          },
        },
      }),
    ).toBe('Emitter')
  })

  it('buildAutomaticTypeTags cria tag Todos quando ha mais de um tipo', () => {
    const tags = buildAutomaticTypeTags(entries)

    expect(tags[0]).toEqual({ id: ELEMENT_MENU_ALL_TYPE_TAG_ID, label: 'Todos' })
    expect(tags.some((tag) => tag.label === 'float')).toBe(true)
  })

  it('filterElementMenuEntriesByTypeTag filtra por typeTag', () => {
    const onlyFloat = filterElementMenuEntriesByTypeTag(entries, 'type:float')

    expect(onlyFloat.every((entry) => entry.typeTag === 'float')).toBe(true)
    expect(onlyFloat).toHaveLength(1)
  })
})
