import { describe, expect, it } from 'vitest'

import {
  buildAutomaticTypeTags,
  buildElementMenuEntries,
  catalogStructureAppendName,
  catalogStructureMenuLabel,
  ELEMENT_MENU_ALL_TYPE_TAG_ID,
  filterAndSortElementMenuEntries,
  filterElementMenuEntriesByTypeTag,
  identifyElementEntryTypeTag,
  matchesElementMenuQuery,
  sortElementMenuEntries,
} from './elementMenuCatalogUtils'
import type { ElementMenuCatalogScope } from './elementMenuScopeCatalog'

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

  it('Todos oculta rotulo pathHierarchy; tipo especifico mostra base e path', () => {
    const sequencerRegistry = {
      SequencerClipData: {
        id: 'SequencerClipData',
        title: 'SequencerClipData',
        parameters: [],
        internalStructures: [],
        nomenclature: {
          group: '#3 Internal Structures',
          collection: '#3 Collection Block',
          collectionType: 'SequencerClipData',
          pathHierarchySteps: [
            { id: 'entries', type: '#1 Root Entry' },
            { id: 'Characters/Zac/Animations/Skin0', type: '#2 Root Entry (AnimationGraphData)' },
            { id: 'Idle1', type: '#3 Collection Block' },
          ],
        },
      },
    }
    const dualEntries = buildElementMenuEntries({
      presetStructures: [],
      catalogStructures: [{ id: 'cat-is', name: 'Idle1', schemaId: 'SequencerClipData' }],
      includeCatalogStructures: true,
      includeCatalogParameters: false,
      schemaRegistry: sequencerRegistry,
    })

    const allVisible = filterElementMenuEntriesByTypeTag(dualEntries, ELEMENT_MENU_ALL_TYPE_TAG_ID)
    expect(allVisible.map((e) => e.label)).toEqual(['SequencerClipData'])

    const byType = filterElementMenuEntriesByTypeTag(dualEntries, 'type:SequencerClipData')
    expect(byType.map((e) => e.label).sort()).toEqual(['Idle1', 'SequencerClipData'])

    const pathEntry = byType.find((e) => e.catalogLabelMode === 'path-hierarchy')!
    expect(catalogStructureAppendName(pathEntry, sequencerRegistry)).toBe('Idle1')
    const baseEntry = byType.find((e) => e.catalogLabelMode === 'base')!
    expect(catalogStructureAppendName(baseEntry, sequencerRegistry)).toBe('SequencerClipData')
  })

  it('module scope com Todos mostra rotulo pathHierarchySteps.id como filtro por tipo', () => {
    const sequencerRegistry = {
      SequencerClipData: {
        id: 'SequencerClipData',
        title: 'SequencerClipData',
        parameters: [],
        internalStructures: [],
        nomenclature: {
          group: '#3 Internal Structures',
          collection: '#3 Collection Block',
          collectionType: 'SequencerClipData',
          pathHierarchySteps: [
            { id: 'entries', type: '#1 Root Entry' },
            { id: 'Characters/Zac/Animations/Skin0', type: '#2 Root Entry (AnimationGraphData)' },
            { id: 'Idle1', type: '#3 Collection Block' },
          ],
        },
      },
    }
    const moduleScoped = buildElementMenuEntries({
      presetStructures: [],
      catalogStructures: [{ id: 'cat-is', name: 'Idle1', schemaId: 'SequencerClipData' }],
      includeCatalogStructures: true,
      includeCatalogParameters: false,
      schemaRegistry: sequencerRegistry,
      catalogScope: 'module',
    })
    const moduleAll = filterElementMenuEntriesByTypeTag(
      moduleScoped,
      ELEMENT_MENU_ALL_TYPE_TAG_ID,
      'module',
    )
    expect(moduleAll.map((e) => e.label)).toEqual(['Idle1'])

    const baseScoped = buildElementMenuEntries({
      presetStructures: [],
      catalogStructures: [{ id: 'cat-is', name: 'Idle1', schemaId: 'SequencerClipData' }],
      includeCatalogStructures: true,
      includeCatalogParameters: false,
      schemaRegistry: sequencerRegistry,
      catalogScope: 'base',
    })
    const baseAll = filterElementMenuEntriesByTypeTag(
      baseScoped,
      ELEMENT_MENU_ALL_TYPE_TAG_ID,
      'base',
    )
    expect(baseAll.map((e) => e.label)).toEqual(['SequencerClipData'])
  })

  it('filterAndSortElementMenuEntries repassa catalogScope ao filtro de tipo', () => {
    const idleEffectRegistry = {
      'skin-character-data-properties-character-idle-effect': {
        id: 'skin-character-data-properties-character-idle-effect',
        title: 'SkinCharacterDataProperties_CharacterIdleEffect',
        parameters: [],
        internalStructures: [],
        nomenclature: {
          group: '#3 Internal Structures',
          collection: '#3 Collection Block',
          collectionType: 'SkinCharacterDataProperties_CharacterIdleEffect',
          pathHierarchySteps: [
            { id: 'entries', type: '#1 Root Entry' },
            { id: 'Characters/Zac/Skins/Skin0', type: '#2 Root Entry (SkinCharacterDataProperties)' },
            { id: 'idleParticlesEffects:0', type: '#3 Collection Block' },
          ],
        },
      },
    }
    const entries = buildElementMenuEntries({
      presetStructures: [],
      catalogStructures: [
        {
          id: 'cat',
          name: 'idleParticlesEffects:0',
          schemaId: 'skin-character-data-properties-character-idle-effect',
        },
      ],
      includeCatalogStructures: true,
      includeCatalogParameters: false,
      schemaRegistry: idleEffectRegistry,
      catalogScope: 'module',
    })

    const sorted = filterAndSortElementMenuEntries(
      entries,
      '',
      'az',
      ELEMENT_MENU_ALL_TYPE_TAG_ID,
      'module' satisfies ElementMenuCatalogScope,
    )
    expect(sorted.map((e) => e.label)).toEqual(['idleParticlesEffects:0'])
  })

  it('entrada LIST_EMBED no menu usa título do campo e estrutura interna na meta', () => {
    const entries = buildElementMenuEntries({
      presetStructures: [],
      includeCatalogStructures: false,
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

    const listEmbedEntry = entries.find((entry) => entry.kind === 'catalog-list-embed')
    expect(listEmbedEntry?.label).toBe('idleParticlesEffects')
    expect(listEmbedEntry?.meta).toContain('LIST_EMBED')
    expect(listEmbedEntry?.meta).toContain('SkinCharacterDataProperties_CharacterIdleEffect')
    expect(listEmbedEntry?.sortTipo).toBe('LIST_EMBED')
  })
})
