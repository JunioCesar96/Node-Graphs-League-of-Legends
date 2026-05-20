import { describe, expect, it } from 'vitest'

import {
  buildAutomaticTypeTags,
  buildElementMenuEntries,
  catalogStructureMenuLabel,
  ELEMENT_MENU_ALL_TYPE_TAG_ID,
  filterAndSortElementMenuEntries,
  filterElementMenuEntriesByTypeTag,
  identifyElementEntryTypeTag,
  matchesElementMenuQuery,
  sortElementMenuEntries,
} from './elementMenuCatalogUtils'

describe('elementMenuCatalogUtils', () => {
  const entries = buildElementMenuEntries({
    catalogParameters: [
      { id: 'p1', name: 'rate', type: 'float', defaultValue: '1' },
      { id: 'p2', name: 'count', type: 'integer', defaultValue: '0' },
    ],
    includeCatalogParameters: true,
  })

  it('catalogStructureMenuLabel usa title do schema em vez do pathHierarchy', () => {
    expect(
      catalogStructureMenuLabel(
        { id: 'cat', name: 'Idle1', schemaId: 'SequencerClipData' },
        {
          SequencerClipData: {
            id: 'SequencerClipData',
            title: 'SequencerClipData',
            parameters: [],
            internalStructures: [],
          },
        },
      ),
    ).toBe('SequencerClipData')
  })

  it('matchesElementMenuQuery filtra por nome e tipo', () => {
    const rate = entries.find((entry) => entry.label === 'rate')

    expect(rate).toBeDefined()
    expect(matchesElementMenuQuery(rate!, 'float')).toBe(true)
    expect(matchesElementMenuQuery(rate!, 'inexistente')).toBe(false)
  })

  it('sortElementMenuEntries ordena A-Z por label', () => {
    const sorted = sortElementMenuEntries(entries, 'az').map((entry) => entry.label)

    expect(sorted).toEqual(['count', 'rate'])
  })

  it('sortElementMenuEntries ordena por tipo', () => {
    const sorted = sortElementMenuEntries(entries, 'tipo').map((entry) => entry.sortTipo)

    expect(sorted.every((tipo) => tipo === 'Parâmetro')).toBe(true)
  })

  it('sortElementMenuEntries agrupa parâmetros por tipo de parâmetro', () => {
    const sorted = sortElementMenuEntries(entries, 'parameter-type')
    const paramLabels = sorted
      .filter((entry) => entry.kind === 'catalog-parameter')
      .map((entry) => entry.label)

    expect(paramLabels).toEqual(['rate', 'count'])
  })

  it('filterAndSortElementMenuEntries devolve vazio para query sem match', () => {
    expect(filterAndSortElementMenuEntries(entries, 'zzzz', 'az')).toEqual([])
  })

  it('identifyElementEntryTypeTag resolve collectionType do registry para embed', () => {
    expect(
      identifyElementEntryTypeTag('catalog-embed', {
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

  it('entrada LIST_EMBED no menu usa título do campo e estrutura interna na meta', () => {
    const listEntries = buildElementMenuEntries({
      includeCatalogParameters: false,
      includeListEmbedCatalog: true,
      listEmbedCatalog: [
        {
          listEmbedId: 'skin-idle-particles',
          listEmbedTitle: 'idleParticlesEffects',
          structure: {
            id: 'catalog-0',
            name: 'SkinCharacterDataProperties_CharacterIdleEffect',
            schemaId: 'skin-character-data-properties-character-idle-effect',
          },
        },
      ],
    })

    const listEmbedEntry = listEntries.find((entry) => entry.kind === 'catalog-list-embed')
    expect(listEmbedEntry?.label).toBe('idleParticlesEffects')
    expect(listEmbedEntry?.meta).toContain('LIST_EMBED')
    expect(listEmbedEntry?.meta).toContain('SkinCharacterDataProperties_CharacterIdleEffect')
    expect(listEmbedEntry?.sortTipo).toBe('LIST_EMBED')
  })

  it('entrada catalog-embed usa título do campo e meta com tipo filho', () => {
    const embedEntries = buildElementMenuEntries({
      includeCatalogParameters: false,
      includeEmbedCatalog: true,
      embedCatalog: [
        {
          embedId: 'tpl-loadscreen',
          embedTitle: 'Loadscreen',
          structure: { id: 'cat', name: 'CensoredImage', schemaId: 'censored-image' },
        },
      ],
    })

    const embedEntry = embedEntries.find((entry) => entry.kind === 'catalog-embed')
    expect(embedEntry?.label).toBe('Loadscreen')
    expect(embedEntry?.meta).toContain('EMBED')
    expect(embedEntry?.meta).toContain('CensoredImage')
    expect(embedEntry?.sortTipo).toBe('EMBED')
    expect(embedEntry?.onPick).toBe('append-embed-catalog')
  })

  it('não gera entradas preset-slot nem catalog-structure', () => {
    const all = buildElementMenuEntries({
      includeCatalogParameters: true,
      catalogParameters: [{ id: 'p', name: 'x', type: 'string', defaultValue: '' }],
    })
    expect(all.some((e) => e.kind === 'preset-slot' || e.kind === 'catalog-structure')).toBe(false)
  })
})
