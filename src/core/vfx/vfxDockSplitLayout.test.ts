import { describe, expect, it } from 'vitest'

import {
  clampVfxDockTimelineHeight,
  resolveDefaultVfxDockTimelineHeight,
  VFX_DOCK_SPLIT_HANDLE_HEIGHT,
} from './vfxDockSplitLayout'

describe('vfxDockSplitLayout', () => {
  it('limita altura da timeline entre mínimo da barra de transporte e espaço do workspace', () => {
    const height = clampVfxDockTimelineHeight({
      requestedHeight: 500,
      splitHeight: 400,
      minTimelineHeight: 80,
      minWorkspaceHeight: 140,
      handleHeight: VFX_DOCK_SPLIT_HANDLE_HEIGHT,
    })

    expect(height).toBe(400 - 140 - VFX_DOCK_SPLIT_HANDLE_HEIGHT)
  })

  it('não permite timeline abaixo do mínimo da barra de transporte', () => {
    const height = clampVfxDockTimelineHeight({
      requestedHeight: 40,
      splitHeight: 600,
      minTimelineHeight: 80,
    })

    expect(height).toBe(80)
  })

  it('resolve altura inicial padrão proporcional ao painel', () => {
    const height = resolveDefaultVfxDockTimelineHeight(500, 72)
    expect(height).toBeGreaterThanOrEqual(72)
    expect(height).toBeLessThan(500)
  })
})
