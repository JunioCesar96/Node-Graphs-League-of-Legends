import { describe, expect, it } from 'vitest'

import {
  convertRitualTextClassGroup,
  convertRitualTextJadeFxEditor,
  convertRitualTextToNodeSchemas,
} from '@/core/convertRitualTextToNodeStructures'
import {
  VFX_JADE_EMITTER_ROOT_COLLECTION,
  VFX_JADE_SYSTEM_ROOT_COLLECTION,
  VFX_JADE_SYSTEM_ROOT_GROUP,
} from '@/core/vfxJadeNomenclature'

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
    expect(system!.internalStructures.length).toBe(1)
    expect(system!.internalStructures[0]!.schemaId).toBe(emitter!.id)
    expect(emitter!.parameters.some((p) => p.name === 'particleLifetime')).toBe(true)

    expect(system!.nomenclature).toEqual({
      group: VFX_JADE_SYSTEM_ROOT_GROUP,
      collection: VFX_JADE_SYSTEM_ROOT_COLLECTION,
      collectionType: 'VFX',
    })

    expect(emitter!.nomenclature).toEqual({
      group: VFX_JADE_SYSTEM_ROOT_GROUP,
      collection: VFX_JADE_EMITTER_ROOT_COLLECTION,
      collectionType: 'Emitter',
    })
  })
})

describe('convertRitualTextJadeFxEditor', () => {
  it('rejeita texto sem bloco VfxSystemDefinitionData', () => {
    const text = `
BankUnit {
  id: string = "a"
}
`.trim()

    const out = convertRitualTextJadeFxEditor(text)
    expect(out.ok).toBe(false)
    if (out.ok) {
      return
    }
    expect(out.error.length).toBeGreaterThan(20)
    expect(out.error).toMatch(/Class Group/i)
  })

  it('aceita mesmo VFX que o fluxo combinado quando há sistemas parseados', () => {
    const text = `"DATA/T" = VfxSystemDefinitionData {
particleName: string = "X"
"Vfx_e" = VfxEmitterDefinitionData {
emitterName: string = "e"
}
}
`.trim()

    const out = convertRitualTextJadeFxEditor(text)
    expect(out.ok).toBe(true)
  })
})

describe('convertRitualTextClassGroup', () => {
  it('converte só por blocos tipo { … }, sem obrigar VFX', () => {
    const text = `
ParticleFlag {
count: i32 = 2
}
`.trim()

    const out = convertRitualTextClassGroup(text)
    expect(out.ok).toBe(true)
    if (!out.ok) {
      return
    }
    expect(out.schemas.length).toBeGreaterThanOrEqual(1)
    expect(out.schemas.some((s) => /particle/i.test(s.id) || /particle/i.test(s.title))).toBe(true)
  })
})
