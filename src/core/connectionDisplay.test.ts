import { describe, expect, it } from 'vitest'

import {
  isRetractedElementPulsing,
  isWirelessPortPulsing,
  type WirelessPortPulseTarget,
} from '@/core/connectionDisplay'
import { elementViewKeyForEmbed } from '@/core/elementViewState'

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
