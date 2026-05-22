import { describe, expect, it } from 'vitest'

import {
  buildWirelessDisplayByNode,
  isRetractedElementPulsing,
  isWirelessPortPulsing,
  type WirelessPortPulseTarget,
} from '@/core/connectionDisplay'
import { elementViewKeyForEmbed } from '@/core/elementViewState'

describe('buildWirelessDisplayByNode', () => {
  it('inclui routing em cada ligação do slot', () => {
    const display = buildWirelessDisplayByNode(
      [
        {
          id: 'a:slot->b',
          fromNodeId: 'a',
          fromInternalStructureId: 'slot',
          toNodeId: 'b',
          routing: 'rigid',
        },
      ],
      [
        {
          id: 'a',
          node: { schema: { id: 'x', title: 'A', parameters: [], internalStructures: [] }, values: [] },
          position: { x: 0, y: 0 },
        },
        {
          id: 'b',
          node: { schema: { id: 'y', title: 'B', parameters: [], internalStructures: [] }, values: [] },
          position: { x: 0, y: 0 },
        },
      ],
    )

    expect(display.get('a')?.outputs.get('slot')?.routing).toBe('rigid')
    expect(display.get('b')?.input?.routing).toBe('rigid')
  })
})

describe('connectionDisplay pulse', () => {
  const embedKey = elementViewKeyForEmbed('emb1')

  it('isRetractedElementPulsing matches retractedElementViewKey', () => {
    const pulse: WirelessPortPulseTarget = {
      connectionId: 'link-1',
      portKind: 'input',
      retractedElementViewKey: embedKey,
    }
    expect(isRetractedElementPulsing(pulse, embedKey)).toBe(true)
    expect(isRetractedElementPulsing(pulse, elementViewKeyForEmbed('other'))).toBe(false)
    expect(isRetractedElementPulsing(null, embedKey)).toBe(false)
  })

  it('isWirelessPortPulsing ignores slot pulse when retractedElementViewKey is set', () => {
    const pulse: WirelessPortPulseTarget = {
      connectionId: 'link-1',
      portKind: 'output',
      outputSlotId: 'slot-a',
      retractedElementViewKey: embedKey,
    }
    expect(isWirelessPortPulsing(pulse, 'link-1', 'output', 'slot-a')).toBe(false)
  })
})
