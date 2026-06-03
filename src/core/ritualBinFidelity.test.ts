import { describe, expect, it } from 'vitest'

import {
  applyBoundFieldNameCasing,
  buildFieldNameMapFromBoundRitual,
  formatPreviewWithMapEntryKey,
  isPlaceholderProbabilityTableNode,
  mergeProbabilityTableListsFromBound,
  parseProbabilityTableEntries,
  extractRootTypeName,
  reorderRitualExportToBoundFieldOrder,
  resolveParticleMapEntryKeyFromRitual,
} from './ritualBinFidelity'
import type { CanvasNode } from '@/core/canvasScene'

function makeProbabilityTableNode(keyTimes: string, keyValues: string): CanvasNode {
  return {
    id: 'pt-1',
    position: { x: 0, y: 0 },
    node: {
      schema: {
        id: 'vfx-probability-table-data',
        title: 'VfxProbabilityTableData',
        parameters: [
          {
            id: 'pt_parameter_keyTimes',
            name: 'keyTimes',
            type: 'listF32',
            defaultValue: '0\n1',
          },
          {
            id: 'pt_parameter_keyValues',
            name: 'keyValues',
            type: 'listF32',
            defaultValue: '1\n1.5',
          },
        ],
        internalStructures: [],
        nomenclature: { group: '', collection: '', collectionType: 'VfxProbabilityTableData' },
      },
      values: [
        { parameterId: 'pt_parameter_keyTimes', value: keyTimes },
        { parameterId: 'pt_parameter_keyValues', value: keyValues },
      ],
    },
  }
}

describe('isPlaceholderProbabilityTableNode', () => {
  it('compacta apenas listas vazias', () => {
    const node = makeProbabilityTableNode('', '')
    expect(isPlaceholderProbabilityTableNode(node)).toBe(true)
  })

  it('não compacta tabela com 0/1 + 1/1.5 (dados reais no bin)', () => {
    const node = makeProbabilityTableNode('0\n1', '1\n1.5')
    expect(isPlaceholderProbabilityTableNode(node)).toBe(false)
  })

  it('não compacta tabela com keyValues 0 e 1', () => {
    const node = makeProbabilityTableNode('0\n1', '0\n1')
    expect(isPlaceholderProbabilityTableNode(node)).toBe(false)
  })
})

describe('buildFieldNameMapFromBoundRitual', () => {
  it('mapeia camelCase do bin', () => {
    const map = buildFieldNameMapFromBoundRitual('particleLinger: option[f32] = {\n    10.6\n}')
    expect(map.get('particlelinger')).toBe('particleLinger')
  })
})

describe('applyBoundFieldNameCasing', () => {
  it('substitui PascalCase pelo bin', () => {
    const map = buildFieldNameMapFromBoundRitual('lifetime: option[f32] = { 1 }')
    map.set('lifetime', 'lifetime')
    const out = applyBoundFieldNameCasing('Lifetime: option[f32] = {\n    1\n}', map)
    expect(out).toContain('lifetime: option[f32]')
    expect(out).not.toContain('Lifetime:')
  })
})

describe('mergeProbabilityTableListsFromBound', () => {
  it('substitui tabelas expandidas por {} do bin', () => {
    const bound = `
dynamics: pointer = VfxAnimatedVector3fVariableData {
    probabilityTables: list[pointer] = {
        VfxProbabilityTableData {}
        VfxProbabilityTableData {
            keyTimes: list[f32] = { 0, 1 }
            keyValues: list[f32] = { 0, 1 }
        }
        VfxProbabilityTableData {}
    }
}
`.trim()

    const exported = `
Dynamics: pointer = VfxAnimatedVector3fVariableData {
    ProbabilityTables: list[pointer] = {
        VfxProbabilityTableData {
            KeyTimes: list[f32] = { 0, 1 }
            KeyValues: list[f32] = { 1, 1.5 }
        }
        VfxProbabilityTableData {
            KeyTimes: list[f32] = { 0, 1 }
            KeyValues: list[f32] = { 1, 1.5 }
        }
        VfxProbabilityTableData {
            KeyTimes: list[f32] = { 0, 1 }
            KeyValues: list[f32] = { 1, 1.5 }
        }
    }
}
`.trim()

    const merged = mergeProbabilityTableListsFromBound(exported, bound)
    expect(merged).toContain('VfxProbabilityTableData {}')
    expect(merged).toContain('keyValues: list[f32] = { 0, 1 }')
    expect(merged.match(/VfxProbabilityTableData \{\}/g)?.length).toBe(2)
  })
})

describe('resolveParticleMapEntryKeyFromRitual', () => {
  it('prefere particlePath sobre particleName', () => {
    const text = `
particleName: string = "Zac_Base_Q_tar"
particlePath: string = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_tar"
`.trim()
    expect(resolveParticleMapEntryKeyFromRitual(text)).toBe(
      'Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_tar',
    )
  })

  it('usa particleName quando particlePath está vazio', () => {
    const text = 'particleName: string = "Only_Name"'
    expect(resolveParticleMapEntryKeyFromRitual(text)).toBe('Only_Name')
  })
})

describe('formatPreviewWithMapEntryKey', () => {
  it('substitui # Preview pela chave do mapa', () => {
    const preview = '# Preview: VfxSystemDefinitionData\nVfxSystemDefinitionData {\n    flags: u16 = 1\n}\n'
    const out = formatPreviewWithMapEntryKey(preview, 'Characters/Zac/Particle')
    expect(out).toContain('"Characters/Zac/Particle" = VfxSystemDefinitionData {')
    expect(out).not.toContain('# Preview:')
  })
})

describe('extractRootTypeName', () => {
  it('não confunde embed interno com tipo raiz', () => {
    const text = `VfxSystemDefinitionData {
    rate: embed = ValueFloat {
        constantValue: f32 = 1
    }
}`
    expect(extractRootTypeName(text)).toBe('VfxSystemDefinitionData')
  })
})

describe('reorderRitualExportToBoundFieldOrder', () => {
  it('move flags e particleName para o fim como no bin', () => {
    const bound = `
VfxSystemDefinitionData {
    complexEmitterDefinitionData: list[pointer] = {
        VfxEmitterDefinitionData {
            rate: embed = ValueFloat {}
        }
    }
    particleName: string = "Zac_Base_Q_tar"
    flags: u16 = 198
}
`.trim()

    const exported = `
VfxSystemDefinitionData {
    flags: u16 = 198
    particleName: string = "Zac_Base_Q_tar"
    complexEmitterDefinitionData: list[pointer] = {
        VfxEmitterDefinitionData {
            rate: embed = ValueFloat {}
        }
    }
}
`.trim()

    const reordered = reorderRitualExportToBoundFieldOrder(exported, bound)
    const flagsIndex = reordered.indexOf('flags:')
    const complexIndex = reordered.indexOf('complexEmitterDefinitionData:')
    expect(complexIndex).toBeGreaterThanOrEqual(0)
    expect(flagsIndex).toBeGreaterThan(complexIndex)
  })
})

describe('parseProbabilityTableEntries', () => {
  it('parseia blocos vazios e cheios', () => {
    const body = `
        VfxProbabilityTableData {}
        VfxProbabilityTableData {
            keyTimes: list[f32] = { 0, 1 }
        }
    `
    const entries = parseProbabilityTableEntries(body)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toBe('VfxProbabilityTableData {}')
    expect(entries[1]).toContain('keyTimes')
  })
})
