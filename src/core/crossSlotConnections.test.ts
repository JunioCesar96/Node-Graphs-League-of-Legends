import { describe, expect, it } from 'vitest'

import {
  classifyAddonOutputToBlockInput,
  classifyAddonSlotConnectionExtended,
  classifyBlockOutputToAddonInput,
} from './crossSlotConnections'
import type { AddonSlotEndpoint } from './addonSlotConnections'
import type { BlockSlotEndpoint } from './blockSlotConnections'

function addonEp(
  nodeId: string,
  name: string,
  direction: 'input' | 'output',
  type: string,
): AddonSlotEndpoint {
  return {
    nodeId,
    slotId: `addon:${name}:${direction}`,
    slotName: name,
    direction,
    type,
  }
}

function blockEp(
  nodeId: string,
  slotId: string,
  direction: 'input' | 'output',
  types: string[],
  parameterId?: string,
): BlockSlotEndpoint {
  return {
    nodeId,
    slotId,
    direction,
    types,
    kind: parameterId ? 'parameter' : 'header',
    parameterId,
  }
}

describe('crossSlotConnections', () => {
  it('addon↔addon compatível com mesmo tipo', () => {
    expect(
      classifyAddonSlotConnectionExtended(
        addonEp('a', 'out', 'output', 'string'),
        addonEp('b', 'in', 'input', 'string'),
      ).kind,
    ).toBe('compatible')
  })

  it('addon↔addon forçado com tipos diferentes', () => {
    const result = classifyAddonSlotConnectionExtended(
      addonEp('a', 'out', 'output', 'string'),
      addonEp('b', 'in', 'input', 'number'),
    )
    expect(result.kind).toBe('forced')
    if (result.kind === 'forced') {
      expect(result.outputType).toBe('string')
      expect(result.inputType).toBe('number')
    }
  })

  it('bloco f32 → addon number compatível', () => {
    expect(
      classifyBlockOutputToAddonInput(
        blockEp('b1', 'block:out', 'output', ['f32']),
        addonEp('a1', 'value', 'input', 'number'),
      ).kind,
    ).toBe('compatible')
  })

  it('bloco string → addon number forçado', () => {
    expect(
      classifyBlockOutputToAddonInput(
        blockEp('b1', 'block:out', 'output', ['string']),
        addonEp('a1', 'value', 'input', 'number'),
      ).kind,
    ).toBe('forced')
  })

  it('addon boolean → bloco bool compatível', () => {
    expect(
      classifyAddonOutputToBlockInput(
        addonEp('a1', 'flag', 'output', 'boolean'),
        blockEp('b1', 'block:in', 'input', ['bool']),
      ).kind,
    ).toBe('compatible')
  })

  it('header Preview → addon code compatível', () => {
    expect(
      classifyBlockOutputToAddonInput(
        blockEp('b1', 'block-header:VfxEmitterDefinitionData:1', 'output', [
          'VfxEmitterDefinitionDataPreview',
        ]),
        addonEp('a1', 'code', 'input', 'code'),
      ).kind,
    ).toBe('compatible')
  })

  it('addon code → addon code compatível', () => {
    expect(
      classifyAddonSlotConnectionExtended(
        addonEp('a', 'out', 'output', 'code'),
        addonEp('b', 'code', 'input', 'code'),
      ).kind,
    ).toBe('compatible')
  })

  it('addon u8 → bloco u8 compatível', () => {
    expect(
      classifyAddonOutputToBlockInput(
        addonEp('a1', 'value', 'output', 'u8'),
        blockEp('b1', 'block:in', 'input', ['u8']),
      ).kind,
    ).toBe('compatible')
  })

  it('addon vec3 → bloco vec3 compatível', () => {
    expect(
      classifyAddonOutputToBlockInput(
        addonEp('a1', 'value', 'output', 'vec3'),
        blockEp('b1', 'block:in', 'input', ['vec3']),
      ).kind,
    ).toBe('compatible')
  })

  it('addon u8 → bloco f32 forçado', () => {
    expect(
      classifyAddonOutputToBlockInput(
        addonEp('a1', 'value', 'output', 'u8'),
        blockEp('b1', 'block:in', 'input', ['f32']),
      ).kind,
    ).toBe('forced')
  })
})
