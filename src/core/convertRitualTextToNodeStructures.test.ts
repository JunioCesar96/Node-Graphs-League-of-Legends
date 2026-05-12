import { describe, expect, it } from 'vitest'

import { convertRitualTextToNodeSchemas } from '@/core/convertRitualTextToNodeStructures'

describe('convertRitualTextToNodeSchemas (VFX Jade)', () => {
  it('prioriza Particle Editor Jade quando há VfxSystemDefinitionData', () => {
    const text = `
"DATA/Test/Particle" = VfxSystemDefinitionData {
particleName: string = "MyFx"
"Vfx_emitter_one" = VfxEmitterDefinitionData {
emitterName: string = "spark"
birthScale0: embed = ValueVector3 {
constantValue: vec3 = { 1, 2, 3 }
}
particleLifetime: embed = ValueFloat {
constantValue: f32 = 1.25
}
}
}
`.trim()

    const out = convertRitualTextToNodeSchemas(text)

    expect(out.ok).toBe(true)
    if (!out.ok) {
      return
    }

    expect(out.schemas.length).toBeGreaterThanOrEqual(2)

    const system = out.schemas.find((s) => s.id.startsWith('vfx-sys-'))

    const emitter = out.schemas.find((s) => s.id.startsWith('vfx-em-'))

    expect(system).toBeDefined()
    expect(emitter).toBeDefined()
    expect(system!.entities.length).toBe(1)
    expect(system!.entities[0]!.schemaId).toBe(emitter!.id)
    expect(emitter!.parameters.some((p) => p.name === 'particleLifetime')).toBe(true)
  })
})
