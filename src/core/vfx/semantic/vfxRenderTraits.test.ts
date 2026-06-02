import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseRitualVfxCatalog } from '../ritualParseVfx'
import { getComposablePipeline } from './vfxRenderStrategy'

const luxFixturePath = join(dirname(fileURLToPath(import.meta.url)), '../../../../_lux_q_hoop.fixture.md')

function loadLuxQMis() {
  return parseRitualVfxCatalog(readFileSync(luxFixturePath, 'utf8')).entries[0]!.system
}

describe('resolveComposablePipeline', () => {
  it('Lux rays: BeamExtruded + preserveScale', () => {
    const rays = loadLuxQMis().emitters.find((e) => e.name === 'rays')!
    const pipeline = getComposablePipeline(rays)
    expect(pipeline.traits).toContain('BeamExtruded')
    expect(pipeline.geometry).toContain('preserveScale')
    expect(pipeline.geometryKind).toBe('plane')
  })

  it('Lux Trail5: TrailRibbon', () => {
    const trail = loadLuxQMis().emitters.find((e) => e.name === 'Trail5')!
    const pipeline = getComposablePipeline(trail)
    expect(pipeline.traits).toContain('TrailRibbon')
    expect(pipeline.material).toContain('uvScrollMult')
  })

  it('fire_ring_red: flipbook + ground remap strategies', () => {
    const hoop1 = loadLuxQMis().emitters.find((e) => e.name === 'hoop1')!
    const pipeline = getComposablePipeline({
      ...hoop1,
      name: 'fire_ring_red',
      isGroundLayer: true,
      primitiveKind: 'arbitrary_quad',
      birthScale0: { constant: [300, 1, 1], dynamics: null },
      numFrames: 20,
      texDiv: [5, 4],
    })
    expect(pipeline.scaleTransform).toBe('remapFlipbookSquare')
    expect(pipeline.geometry).toContain('groundQuadRemapFlipbookSquare')
    expect(pipeline.material).toContain('flipbookUv')
  })
})
