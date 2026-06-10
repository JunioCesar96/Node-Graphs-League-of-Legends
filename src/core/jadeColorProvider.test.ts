import { describe, expect, it } from 'vitest'

import { buildRitobinColorPresentations } from '@jade/lib/colorProvider'

const range = {
  startLineNumber: 1,
  startColumn: 20,
  endLineNumber: 1,
  endColumn: 40,
}

describe('buildRitobinColorPresentations', () => {
  it('inclui rgb, hsl, hex e vec4', () => {
    const presentations = buildRitobinColorPresentations(
      { red: 1, green: 0, blue: 0, alpha: 0.5 },
      range,
    )

    expect(presentations).toHaveLength(4)
    expect(presentations[0]?.label).toBe('rgba(255, 0, 0, 0.5)')
    expect(presentations[1]?.label).toMatch(/^hsla?\(/)
    expect(presentations[2]?.label).toBe('#ff000080')
    expect(presentations[3]?.label).toBe('{ 1, 0, 0, 0.5 }')
  })

  it('omite alpha em rgb/hex quando opaco', () => {
    const presentations = buildRitobinColorPresentations(
      { red: 0, green: 1, blue: 0, alpha: 1 },
      range,
    )

    expect(presentations[0]?.label).toBe('rgb(0, 255, 0)')
    expect(presentations[2]?.label).toBe('#00ff00')
    expect(presentations[3]?.label).toBe('{ 0, 1, 0, 1 }')
  })
})
