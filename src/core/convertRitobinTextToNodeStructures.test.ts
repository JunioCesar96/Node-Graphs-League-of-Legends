import { describe, expect, it } from 'vitest'

import { convertRitobinStructureTextToNodeSchemas, slugifyStructureId } from '@/core/convertRitobinTextToNodeStructures'

describe('convertRitobinStructureTextToNodeSchemas', () => {
  it('transforma linha só com `Tipo { … }` e campos simples num schema', () => {
    const text = `
BankUnit {
  Name: string = "Vo"
}
`.trim()

    const out = convertRitobinStructureTextToNodeSchemas(text)

    expect(out.ok).toBe(true)
    if (!out.ok) {
      return
    }

    const bankUnit = out.schemas.find((s) => s.title === 'BankUnit')

    expect(bankUnit).toBeDefined()
    expect(bankUnit!.parameters.some((p) => p.name === 'Name')).toBe(true)
    expect(slugifyStructureId('BankUnit')).toBeTruthy()
  })

  it('falha de forma útil quando não há structs no formato esperado', () => {
    const out = convertRitobinStructureTextToNodeSchemas(`apenas texto sem structs isolados`)

    expect(out.ok).toBe(false)
    if (out.ok) {
      throw new Error('expected failure')
    }
    expect(typeof out.error).toBe('string')
  })

  it('entries: map com "chave" = Tipo e list2[embed] com blocos anónimos', () => {
    const text = `
entries: map[hash,embed] = {
  "Characters/Zac/Skins/Skin0" = SkinCharacterDataProperties {
    SkinClassification: u32 = 1
    SkinAudioProperties: embed = SkinAudioProperties {
      BankUnits: list2[embed] = {
        BankUnit {
          Name: string = "Zac_Base_VO"
          VoiceOver: bool = true
        }
        BankUnit {
          Name: string = "Zac_Base_SFX"
          VoiceOver: bool = false
        }
      }
    }
  }
}
`.trim()

    const out = convertRitobinStructureTextToNodeSchemas(text)

    expect(out.ok).toBe(true)
    if (!out.ok) {
      return
    }

    const skin = out.schemas.find((s) => s.title === 'SkinCharacterDataProperties')
    const audio = out.schemas.find((s) => s.title === 'SkinAudioProperties')
    const bank = out.schemas.find((s) => s.title === 'BankUnit')

    expect(skin).toBeDefined()
    expect(audio).toBeDefined()
    expect(bank).toBeDefined()
    expect(skin!.internalStructures.some((x) => x.name === 'SkinAudioProperties')).toBe(true)
    const bankUnits = audio!.listEmbed?.find((block) => block.title === 'BankUnits')
    expect(bankUnits).toBeDefined()
    expect(bankUnits!.internalStructures).toHaveLength(2)
    expect(bankUnits!.internalStructures.every((x) => x.name === 'BankUnit' && x.schemaId === bank!.id)).toBe(
      true,
    )

    expect(out.classGroupPathBySchemaId?.[skin!.id]?.length).toBe(2)
    expect(out.classGroupPathBySchemaId?.[skin!.id]?.[0]!.id).toBe('entries')
    expect(out.classGroupPathBySchemaId?.[skin!.id]?.[1]!.id).toBe('Characters/Zac/Skins/Skin0')
    expect(out.rootSchemaIds).toContain(skin!.id)
    expect(out.rootSchemaIds).not.toContain(bank!.id)

    const voiceOver = bank!.parameters.find((p) => p.name === 'VoiceOver')
    expect(voiceOver?.type).toBe('bool')
    expect(voiceOver?.defaultValue).toBe('true')
  })
})
