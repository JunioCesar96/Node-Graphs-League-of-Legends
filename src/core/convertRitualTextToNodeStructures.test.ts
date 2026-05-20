import { describe, expect, it } from 'vitest'

import {
  convertRitualTextClassGroup,
  convertRitualTextJadeFxEditor,
  convertRitualTextToNodeSchemas,
} from '@/core/convertRitualTextToNodeStructures'
import { filterInternalStructuresByPathHierarchy } from '@/core/pathHierarchyInternalStructures'

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
      group: '',
      collection: '',
      collectionType: 'VFX',
    })

    expect(emitter!.nomenclature).toEqual({
      group: '',
      collection: '',
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
    const flag = out.schemas.find((s) => s.title === 'ParticleFlag')
    expect(flag?.nomenclature?.pathHierarchy).toBe('ParticleFlag')
    expect(flag?.nomenclature?.collection).toContain('ParticleFlag')
  })

  it('nomeclatura + filtro Elemento: #2 Root Entry (SkinCharacterDataProperties) → só #3 Embed Block', () => {
    const text = `
entries: map[hash,embed] = {
  "Characters/Zac/Skins/Skin0" = SkinCharacterDataProperties {
    SkinAudioProperties: embed = SkinAudioProperties {
      TagEventList: list[string] = {
        "Zac"
      }
    }
  }
}
`.trim()

    const out = convertRitualTextClassGroup(text)
    expect(out.ok).toBe(true)
    if (!out.ok) {
      return
    }

    const skin = out.schemas.find((s) => s.title === 'SkinCharacterDataProperties')
    const audio = out.schemas.find((s) => s.title === 'SkinAudioProperties')

    expect(skin?.nomenclature?.group).toBe('#2 Entidades')
    expect(skin?.nomenclature?.pathHierarchy).toBe('main > entries:Characters/Zac/Skins/Skin0')

    const audioEmbed = skin!.embed?.find((block) => block.title === 'SkinAudioProperties')
    expect(audioEmbed).toBeDefined()
    expect(audioEmbed!.internalStructures.some((ref) => ref.schemaId === audio!.id)).toBe(true)
    expect(audio?.nomenclature?.collection).toBe('#3 Embed Block')
  })
})

describe('convertRitualTextToNodeSchemas (genérico + Class Group)', () => {
  it('sem VFX, aplica nomeclatura Class Group ao ritobin genérico', () => {
    const text = `
ParticleFlag {
  count: i32 = 2
}
`.trim()

    const out = convertRitualTextToNodeSchemas(text)
    expect(out.ok).toBe(true)
    if (!out.ok) {
      return
    }
    const flag = out.schemas.find((s) => s.title === 'ParticleFlag')
    expect(flag?.nomenclature?.group).toBe('#2 Entidades')
  })
})
