import { describe, expect, it } from 'vitest'

import { humanizeVfxPropRitualText, ritualTextNeedsHumanize } from './humanizeVfxPropRitualText'

const propHashOnly = `#PROP_text
type: string = "PROP"
version: u32 = 3
linked: list[string] = {}
entries: map[hash,embed] = {
    0x13caaf55 = 0x45cd899f {
        0x868eb76a: list[pointer] = {
            0x09cde442 {
                0x3d25b8ce: string = "Staff"
                0x3c6468f4: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_Q_trail.tex"
                0xfa784eab: u8 = 4
            }
        }
        0xecf1c6bc: string = "Lux_Base_W_mis_return"
        0xe7638138: string = "Characters/Lux/Skins/Skin0/Particles/Lux_Base_W_mis_return"
        0xfd01a9d3: f32 = 5000
    }
}
`

describe('humanizeVfxPropRitualText', () => {
  it('detecta PROP com hashes por resolver', () => {
    expect(ritualTextNeedsHumanize(propHashOnly)).toBe(true)
    expect(ritualTextNeedsHumanize('emitterName: string = "x"')).toBe(false)
  })

  it('converte campos, tipos e chave do mapa para nomes legíveis', () => {
    const { text, changed } = humanizeVfxPropRitualText(propHashOnly)
    expect(changed).toBe(true)
    expect(text).toContain('"Characters/Lux/Skins/Skin0/Particles/Lux_Base_W_mis_return" = VfxSystemDefinitionData {')
    expect(text).toContain('complexEmitterDefinitionData: list[pointer]')
    expect(text).toContain('VfxEmitterDefinitionData {')
    expect(text).toContain('emitterName: string = "Staff"')
    expect(text).toContain('texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_Q_trail.tex"')
    expect(text).toContain('particleName: string = "Lux_Base_W_mis_return"')
    expect(text).toContain('visibilityRadius: f32 = 5000')
    expect(text).not.toMatch(/0x3d25b8ce:/)
    expect(text).not.toMatch(/0x45cd899f\s*\{/)
  })
})
