import { describe, expect, it } from 'vitest'

import {
  findParsedSchemaInRegistry,
  normalizeStandaloneClassGroupRitual,
  parseClassGroupRitualWithStack,
  schemasFromClassGroupStackParse,
} from '@/core/classGroupRitualStackParser'
import { parseListStringString } from '@/core/listStringValue'
import { convertRitobinStructureTextToNodeSchemas } from '@/core/convertRitobinTextToNodeStructures'
import { segmentsToPathHierarchyIdString } from '@/core/pathHierarchy'
import { filterInternalStructuresByPathHierarchy } from '@/core/pathHierarchyInternalStructures'
import { convertRitualTextClassGroup } from '@/core/convertRitualTextToNodeStructures'

describe('parseClassGroupRitualWithStack', () => {
  it('aninhamento embed 5+ níveis: pathHierarchySteps sem tecto fixo #4', () => {
    const text = `
entries: map[hash,embed] = {
  "Root/Key" = Level0 {
    f1: embed = Level1 {
      f2: embed = Level2 {
        f3: embed = Level3 {
          f4: embed = Level4 {
            depth: u32 = 1
          }
        }
      }
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const deepest = findParsedSchemaInRegistry(parsed.registry,'level4')
    const steps = parsed.classGroupPathBySchemaId.get('level4')

    expect(deepest).toBeDefined()
    expect(deepest!.parameters.some((p) => p.name === 'depth')).toBe(true)
    expect(steps?.length).toBeGreaterThanOrEqual(6)
    expect(segmentsToPathHierarchyIdString(steps!)).toMatch(/entries/)
    expect(segmentsToPathHierarchyIdString(steps!)).toMatch(/f4/)
  })

  it('rgba entre chavetas vira parâmetro no schema embed SkinMeshDataProperties', () => {
    const text = `
entries: map[hash,embed] = {
  "Characters/Zac/Skins/Skin0" = SkinCharacterDataProperties {
    SkinMeshProperties: embed = SkinMeshDataProperties {
      FresnelColor: rgba = { 20, 77, 26, 255 }
      ReflectionFresnelColor: rgba = { 153, 153, 153, 255 }
      ReflectionFresnel: f32 = 0.6
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const mesh = findParsedSchemaInRegistry(parsed.registry,'skin-mesh-data-properties')
    expect(mesh).toBeDefined()
    const fresnelColor = mesh!.parameters.find((p) => p.name === 'FresnelColor')
    const reflectionColor = mesh!.parameters.find((p) => p.name === 'ReflectionFresnelColor')
    expect(fresnelColor?.type).toBe('rgba')
    expect(fresnelColor?.id).toBe('SkinMeshDataProperties_parameter_FresnelColor')
    expect(fresnelColor?.defaultValue).toBe('0.078, 0.302, 0.102, 1')
    expect(reflectionColor?.type).toBe('rgba')
    expect(reflectionColor?.defaultValue).toBe('0.6, 0.6, 0.6, 1')
    expect(mesh!.parameters.some((p) => p.name === 'ReflectionFresnel')).toBe(true)
  })

  it('dois itens list[embed] do mesmo tipo geram schemas parseados distintos', () => {
    const text = `
SkinMeshDataProperties {
  MaterialOverride: list[embed] = {
    ListItemDup {
      name: string = "first"
    }
    ListItemDup {
      name: string = "second"
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const mesh = findParsedSchemaInRegistry(parsed.registry, 'skin-mesh-data-properties')
    expect(mesh).toBeDefined()
    const byName = new Map<string, (typeof parsed.registry extends Map<string, infer S> ? S : never)>()
    for (const schema of parsed.registry.values()) {
      if (schema.title !== 'ListItemDup') {
        continue
      }
      const name = schema.parameters.find((p) => p.name === 'name')?.defaultValue
      if (name === 'first' || name === 'second') {
        byName.set(name, schema)
      }
    }
    expect(byName.size).toBe(2)
    const instances = [...byName.values()]
    expect(instances[0]!.id).not.toBe(instances[1]!.id)
  })

  it('duas entradas map[hash,embed] do mesmo tipo geram schemas parseados distintos', () => {
    const text = `
entries: map[hash,embed] = {
  "key1" = SampleType {
    name: string = "first"
  }
  "key2" = SampleType {
    name: string = "second"
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const samples = [...parsed.registry.values()].filter((s) => s.title === 'SampleType')
    expect(samples).toHaveLength(2)
    expect(samples[0]!.id).not.toBe(samples[1]!.id)
    const names = samples.map((s) => s.parameters.find((p) => p.name === 'name')?.defaultValue)
    expect(names).toContain('first')
    expect(names).toContain('second')
  })

  it('link escalar vira parâmetro type link com caminho preservado', () => {
    const text = `
entries: map[hash,embed] = {
  "Characters/Zac/Skins/Skin0" = SkinCharacterDataProperties {
    mContextualActionData: link = "Characters/Zac/CAC/Zac_Base"
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const skin = findParsedSchemaInRegistry(parsed.registry,'skin-character-data-properties')
    expect(skin).toBeDefined()
    const param = skin!.parameters.find((p) => p.name === 'mContextualActionData')
    expect(param?.type).toBe('link')
    expect(param?.defaultValue).toBe('Characters/Zac/CAC/Zac_Base')
  })

  it('mtx44 Transform vira parâmetro type mtx44 com translação preservada', () => {
    const text = `
entries: map[hash,embed] = {
  0xa2fa6a01 = VfxSystemDefinitionData {
    Transform: mtx44 = {
      1, 0, 0, 0
      0, 1, 0, 0
      0, 0, 1, 0
      0, 15.5, -42.1, 1
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const vfx = [...parsed.registry.values()].find((s) => s.title === 'VfxSystemDefinitionData')
    expect(vfx).toBeDefined()
    const transform = vfx!.parameters.find((p) => p.name === 'Transform')
    expect(transform?.type).toBe('mtx44')
    expect(transform?.defaultValue).toBe('1, 0, 0, 0 0, 1, 0, 0 0, 0, 1, 0 0, 15.5, -42.1, 1')
  })

  it('bool e flag true/false viram parâmetros com tipos bool e flag', () => {
    const text = `
entries: map[hash,embed] = {
  "Characters/Zac/Skins/Skin0" = SkinCharacterDataProperties {
    SkinAudioProperties: embed = SkinAudioProperties {
      BankUnits: list2[embed] = {
        BankUnit {
          Name: string = "Zac_Base_VO"
          VoiceOver: bool = true
        }
        BankUnit {
          Name: string = "Zac_Base_SFX"
          Enabled: bool = false
          IsSingleParticle: flag = true
        }
      }
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const banksByName = new Map<string, (typeof parsed.registry extends Map<string, infer S> ? S : never)>()
    for (const schema of parsed.registry.values()) {
      if (schema.title !== 'BankUnit') {
        continue
      }
      const name = schema.parameters.find((p) => p.name === 'Name')?.defaultValue
      if (name === 'Zac_Base_VO' || name === 'Zac_Base_SFX') {
        banksByName.set(name, schema)
      }
    }
    expect(banksByName.size).toBe(2)
    for (const schema of banksByName.values()) {
      expect(schema.id).toMatch(/^bank-unit__/)
    }
    expect(banksByName.get('Zac_Base_VO')!.id).not.toBe(banksByName.get('Zac_Base_SFX')!.id)

    const voBank = banksByName.get('Zac_Base_VO')!
    const sfxBank = banksByName.get('Zac_Base_SFX')!
    const voiceOver = voBank.parameters.find((p) => p.name === 'VoiceOver')
    const enabled = sfxBank.parameters.find((p) => p.name === 'Enabled')
    const singleParticle = sfxBank.parameters.find((p) => p.name === 'IsSingleParticle')

    expect(voiceOver?.type).toBe('bool')
    expect(voiceOver?.defaultValue).toBe('true')
    expect(enabled?.type).toBe('bool')
    expect(enabled?.defaultValue).toBe('false')
    expect(singleParticle?.type).toBe('flag')
    expect(singleParticle?.defaultValue).toBe('true')
  })

  it('campos escalares ficam no pai; BankUnit não é entidade raiz', () => {
    const text = `
entries: map[hash,embed] = {
  "Characters/Zac/Skins/Skin0" = SkinCharacterDataProperties {
    armorMaterial: string = "Flesh"
    flags: u32 = 198
    SkinAudioProperties: embed = SkinAudioProperties {
      BankUnits: list2[embed] = {
        BankUnit {
          Name: string = "Zac_Base_VO"
        }
      }
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const skin = findParsedSchemaInRegistry(parsed.registry,'skin-character-data-properties')

    expect(skin).toBeDefined()
    expect(skin!.parameters.some((p) => p.name === 'armorMaterial')).toBe(true)
    expect(skin!.parameters.some((p) => p.name === 'flags')).toBe(true)
    expect(parsed.rootSchemaIds.has('main')).toBe(true)
    expect(parsed.rootSchemaIds.has('skin-character-data-properties')).toBe(false)
    expect(parsed.rootSchemaIds.has('bank-unit')).toBe(false)

    const schemas = schemasFromClassGroupStackParse(parsed)
    expect(schemas.some((s) => s.id === 'main')).toBe(true)
    expect(
      schemas.some(
        (s) =>
          s.id === 'skin-character-data-properties' ||
          s.id.startsWith('skin-character-data-properties__'),
      ),
    ).toBe(true)
  })

  it('preâmbulo PROP + entries: map → nó Main com type, version, linked e mapHashEmbed entries', () => {
    const text = `
#PROP_text
type: string = "PROP"
version: u32 = 3
linked: list[string] = {
    "DATA/Characters/Zac/Zac.bin"
}
entries: map[hash,embed] = {
  "Characters/Zac/Skins/Skin0" = SkinCharacterDataProperties {
    armorMaterial: string = "Flesh"
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const main = findParsedSchemaInRegistry(parsed.registry,'main')
    const skin = findParsedSchemaInRegistry(parsed.registry,'skin-character-data-properties')

    expect(main).toBeDefined()
    expect(main!.title).toBe('Main')
    expect(main!.parameters.some((p) => p.name === 'type' && p.defaultValue === 'PROP')).toBe(true)
    expect(main!.parameters.some((p) => p.name === 'version' && p.defaultValue === '3')).toBe(true)
    expect(main!.parameters.some((p) => p.name === 'linked')).toBe(true)

    const entriesParam = main!.parameters.find((p) => p.name === 'entries')
    expect(entriesParam?.type).toBe('mapHashEmbed')
    expect(entriesParam?.defaultValue).toContain('skin-character-data-properties')

    expect(parsed.rootSchemaIds.has('main')).toBe(true)
    expect(parsed.rootSchemaIds.has('skin-character-data-properties')).toBe(false)
    expect(skin).toBeDefined()

    const path = skin ? parsed.classGroupPathBySchemaId.get(skin.id) : undefined
    expect(path?.[0]?.id).toBe('main')
    expect(path?.[1]?.id).toBe('entries:Characters/Zac/Skins/Skin0')

    const schemas = schemasFromClassGroupStackParse(parsed)
    expect(schemas.some((s) => s.id === 'main')).toBe(true)
    expect(
      schemas.some(
        (s) =>
          s.id === 'skin-character-data-properties' ||
          s.id.startsWith('skin-character-data-properties__'),
      ),
    ).toBe(true)
  })

  it('linked list[string] com 15 entradas não é truncado a 480 caracteres', () => {
    const paths = Array.from(
      { length: 15 },
      (_, i) => `"DATA/Characters/Zac/Zac${i}/Zac${i}.bin"`,
    )
    const text = `
#PROP_text
type: string = "PROP"
version: u32 = 3
linked: list[string] = {
    ${paths.join('\n    ')}
}
entries: map[hash,embed] = {}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const main = findParsedSchemaInRegistry(parsed.registry, 'main')
    const linked = main?.parameters.find((p) => p.name === 'linked')

    expect(linked).toBeDefined()
    expect(linked!.defaultValue.length).toBeGreaterThan(480)
    expect(parseListStringString(linked!.defaultValue)).toHaveLength(15)
  })

  it('list2[embed]: BankUnits → list2Embed[] com instâncias, não listEmbed[]', () => {
    const text = `
entries: map[hash,embed] = {
  "Characters/Zac/Skins/Skin0" = SkinCharacterDataProperties {
    SkinAudioProperties: embed = SkinAudioProperties {
      BankUnits: list2[embed] = {
        BankUnit {
          Name: string = "A"
        }
        BankUnit {
          Name: string = "B"
        }
      }
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const audio = findParsedSchemaInRegistry(parsed.registry,'skin-audio-properties')
    expect(audio).toBeDefined()
    const bankUnits = audio!.list2Embed?.find((block) => block.title === 'BankUnits')
    expect(bankUnits).toBeDefined()
    expect(bankUnits!.instances).toHaveLength(2)
    expect(audio!.listEmbed?.find((block) => block.title === 'BankUnits')).toBeUndefined()
  })

  it('list[pointer]: listPointer[] com catálogo; filho VfxEmitter', () => {
    const text = `
entries: map[hash,embed] = {
  "Vfx/Key" = VfxSystemDefinitionData {
    particleLifetime: f32 = 1
    ComplexEmitterDefinitionData: list[pointer] = {
      VfxEmitterDefinitionData {
        EmitterName: string = "Ring"
      }
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const vfx = findParsedSchemaInRegistry(parsed.registry,'vfx-system-definition-data')
    const emitter = findParsedSchemaInRegistry(parsed.registry,'vfx-emitter-definition-data')

    expect(vfx).toBeDefined()
    expect(emitter).toBeDefined()
    expect(vfx!.parameters.some((p) => p.name === 'particleLifetime')).toBe(true)
    const listPtr = vfx!.listPointer.find((b) => b.title === 'ComplexEmitterDefinitionData')
    expect(listPtr).toBeDefined()
    expect(listPtr!.internalStructures.some((c) => c.schemaId === emitter!.id)).toBe(true)
    expect(listPtr!.slots).toHaveLength(1)
    expect(listPtr!.slots![0]!.schemaId).toBe(emitter!.id)
    expect(listPtr!.slots![0]!.name).toBe('VfxEmitterDefinitionData')
  })

  it('mFlags não gera schema órfão; fica em parameters do pai', () => {
    const text = `
entries: map[hash,embed] = {
  "A" = AnimationGraphData {
    mFlags: u16 = 0
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const anim = findParsedSchemaInRegistry(parsed.registry,'animation-graph-data')
    const schemas = schemasFromClassGroupStackParse(parsed)

    expect(anim!.parameters.some((p) => p.name === 'mFlags')).toBe(true)
    expect(schemas.some((s) => /mflags/i.test(s.id) && s.parameters.length === 1 && s.parameters[0]!.name === 'mFlags')).toBe(
      false,
    )
  })

  it('list[vec2] e list[vec3] primitivos com blocos { }', () => {
    const text = `
entries: map[hash,embed] = {
  "K" = VfxEmitterDefinitionData {
    Scales: list[vec2] = {
      { 1, 0 }
      { 0, 1 }
    }
    Offsets: list[vec3] = {
      { 0, 1, 2 }
      { 3, 4, 5 }
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const emitter = findParsedSchemaInRegistry(parsed.registry,'vfx-emitter-definition-data')
    const scales = emitter!.parameters.find((p) => p.name === 'Scales')
    const offsets = emitter!.parameters.find((p) => p.name === 'Offsets')
    expect(scales?.type).toBe('listVector2')
    expect(scales?.defaultValue).toBe('1, 0\n0, 1')
    expect(offsets?.type).toBe('listVector3')
    expect(offsets?.defaultValue).toBe('0, 1, 2\n3, 4, 5')
  })

  it('list[vec4] aninhado em VfxAnimatedColorVariableData (Times + Values)', () => {
    const text = `
entries: map[hash,embed] = {
  "Vfx" = VfxEmitterDefinitionData {
    Color: embed = ValueColor {
      Dynamics: pointer = VfxAnimatedColorVariableData {
        times: list[f32] = { 0 0.5 1 }
        values: list[vec4] = {
          { 1, 1, 1, 1 }
          { 1, 1, 1, 0 }
        }
      }
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const anim = findParsedSchemaInRegistry(parsed.registry,'vfx-animated-color-variable-data')
    const values = anim!.parameters.find((p) => p.name === 'values')
    expect(values?.type).toBe('listVector4')
    expect(values?.defaultValue).toBe('1, 1, 1, 1\n1, 1, 1, 0')
  })

  it('list[vec4] primitivo vira parâmetro listVector4 com blocos { }', () => {
    const text = `
entries: map[hash,embed] = {
  "K" = VfxEmitterDefinitionData {
    Values: list[vec4] = {
      { 1, 1, 1, 1 }
      { 1, 1, 1, 1 }
      { 1, 1, 1, 0 }
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const emitter = findParsedSchemaInRegistry(parsed.registry,'vfx-emitter-definition-data')

    const param = emitter!.parameters.find((p) => p.name === 'Values')
    expect(param).toBeDefined()
    expect(param!.type).toBe('listVector4')
    expect(param!.defaultValue).toBe('1, 1, 1, 1\n1, 1, 1, 1\n1, 1, 1, 0')
    expect(emitter!.internalStructures.length).toBe(0)
  })

  it('entrada map com chave hash 0x… é parseada (VfxSystem + mSubmeshesToDraw)', () => {
    const text = `
entries: map[hash,embed] = {
  0x1c1ea8de = VfxSystemDefinitionData {
    ComplexEmitterDefinitionData: list[pointer] = {
      VfxEmitterDefinitionData {
        Primitive: pointer = VfxPrimitiveMesh {
          mMesh: embed = VfxMeshDefinitionData {
            mMeshName: string = "test.skn"
            mSubmeshesToDraw: list[hash] = {
              "Base_mat"
            }
          }
        }
      }
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    expect(parsed.rootSchemaIds.has('main')).toBe(true)
    expect(parsed.rootSchemaIds.has('vfx-system-definition-data')).toBe(false)
    const mesh = findParsedSchemaInRegistry(parsed.registry,'vfx-mesh-definition-data')
    const sub = mesh?.parameters.find((p) => p.name === 'mSubmeshesToDraw')
    expect(sub?.type).toBe('listHash')
    expect(sub?.defaultValue).toBe('Base_mat')
  })

  it('list[hash] vira listHash com nomes e hex', () => {
    const text = `
entries: map[hash,embed] = {
  "K" = IsAnimationPlayingDynamicMaterialBoolDriver {
    mAnimationNames: list[hash] = {
      "Spell4"
      0x792ee8b0
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const driver = findParsedSchemaInRegistry(parsed.registry,'is-animation-playing-dynamic-material-bool-driver')
    const names = driver!.parameters.find((p) => p.name === 'mAnimationNames')
    expect(names?.type).toBe('listHash')
    expect(names?.defaultValue).toBe('Spell4\n0x792ee8b0')
    expect(driver!.internalStructures.length).toBe(0)
  })

  it('list[f32] e list[string] viram listF32 e listString', () => {
    const text = `
entries: map[hash,embed] = {
  "K" = VfxEmitterDefinitionData {
    Times: list[f32] = {
      0
      0.5
      1
    }
    TagEventList: list[string] = {
      "Zac"
      "Other"
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const emitter = findParsedSchemaInRegistry(parsed.registry,'vfx-emitter-definition-data')
    const times = emitter!.parameters.find((p) => p.name === 'Times')
    const tags = emitter!.parameters.find((p) => p.name === 'TagEventList')
    expect(times?.type).toBe('listF32')
    expect(times?.defaultValue).toBe('0\n0.5\n1')
    expect(tags?.type).toBe('listString')
    expect(tags?.defaultValue).toBe('Zac\nOther')
    expect(emitter!.internalStructures.length).toBe(0)
  })

  it('option[f32], option[string] e option[vec3] viram optionF32, optionString e optionVector3', () => {
    const text = `
entries: map[hash,embed] = {
  "K" = SkinCharacterDataProperties {
    IconCircle: option[string] = {
      "ASSETS/icon.tex"
    }
  }
  "M" = SkinMeshDataProperties {
    OverrideBoundingBox: option[vec3] = {
      { 115, 260, 115 }
    }
  }
  "V" = VfxEmitterDefinitionData {
    Lifetime: option[f32] = {
      1
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const skin = findParsedSchemaInRegistry(parsed.registry,'skin-character-data-properties')
    const mesh = findParsedSchemaInRegistry(parsed.registry,'skin-mesh-data-properties')
    const vfx = findParsedSchemaInRegistry(parsed.registry,'vfx-emitter-definition-data')

    const icon = skin!.parameters.find((p) => p.name === 'IconCircle')
    expect(icon?.type).toBe('optionString')
    expect(icon?.defaultValue).toBe('ASSETS/icon.tex')

    const bbox = mesh!.parameters.find((p) => p.name === 'OverrideBoundingBox')
    expect(bbox?.type).toBe('optionVector3')
    expect(bbox?.defaultValue).toBe('115, 260, 115')

    const lifetime = vfx!.parameters.find((p) => p.name === 'Lifetime')
    expect(lifetime?.type).toBe('optionF32')
    expect(lifetime?.defaultValue).toBe('1')
  })

  it('map[hash,link] vira mapHashLink com pares chave-valor tab', () => {
    const text = `
entries: map[hash,embed] = {
  "R" = ResourceResolver {
    ResourceMap: map[hash,link] = {
      "Zac_E_Moving" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_E_Moving"
      "Zac_E_tar" = "Zac_E_tar"
      0x1c1ea8de = 0x1c1ea8de
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const resolver = findParsedSchemaInRegistry(parsed.registry,'resource-resolver')
    const resourceMap = resolver!.parameters.find((p) => p.name === 'ResourceMap')
    expect(resourceMap?.type).toBe('mapHashLink')
    expect(resourceMap?.defaultValue).toContain('Zac_E_Moving\tCharacters/Zac')
    expect(resourceMap?.defaultValue).toContain('Zac_E_tar\tZac_E_tar')
    expect(resourceMap?.defaultValue).toContain('0x1c1ea8de\t0x1c1ea8de')
    expect((resourceMap?.defaultValue?.length ?? 0) > 100).toBe(true)
  })
})

describe('convertRitobinStructureTextToNodeSchemas (stack)', () => {
  it('expõe rootSchemaIds com Main como única raiz quando há entries: map', () => {
    const text = `
entries: map[hash,embed] = {
  "A" = SkinCharacterDataProperties {
    SkinClassification: u32 = 1
  }
}
`.trim()

    const out = convertRitobinStructureTextToNodeSchemas(text)
    expect(out.ok).toBe(true)
    if (!out.ok) {
      return
    }
    expect(out.rootSchemaIds).toContain('main')
    expect(out.rootSchemaIds).not.toContain('skin-character-data-properties')
    expect(out.schemas.some((s) => s.id === 'main')).toBe(true)
    expect(
      out.schemas.some(
        (s) =>
          s.id === 'skin-character-data-properties' ||
          s.id.startsWith('skin-character-data-properties__'),
      ),
    ).toBe(true)
  })
})

describe('Class Group nomenclatura + filtro Elemento (list[pointer])', () => {
  it('VfxSystem filtra filhos Collection/Pointer após nomenclatura', () => {
    const text = `
entries: map[hash,embed] = {
  "Vfx/Key" = VfxSystemDefinitionData {
    ComplexEmitterDefinitionData: list[pointer] = {
      VfxEmitterDefinitionData {
        EmitterName: string = "Ring"
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

    const vfx = out.schemas.find((s) => s.title === 'VfxSystemDefinitionData')
    const emitter = out.schemas.find((s) => s.title === 'VfxEmitterDefinitionData')
    expect(vfx).toBeDefined()
    expect(emitter).toBeDefined()

    const listPtr = vfx!.listPointer?.find((b) => b.title === 'ComplexEmitterDefinitionData')
    expect(listPtr?.internalStructures.some((c) => c.schemaId === emitter!.id)).toBe(true)
    expect(emitter?.nomenclature?.collection).toBe('#3 Collection Block')
  })

  it('embed simples vira embed[] com slot inicial; não vai para internalStructures', () => {
    const text = `
entries: map[hash,embed] = {
  "Characters/Zac/Skins/Skin0" = SkinCharacterDataProperties {
    Loadscreen: embed = CensoredImage {
      Image: string = "splash"
    }
    SkinMeshProperties: pointer = SkinMeshDataProperties {
      ReflectionFresnel: f32 = 0.5
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const skin = findParsedSchemaInRegistry(parsed.registry,'skin-character-data-properties')
    expect(skin).toBeDefined()
    expect(skin!.internalStructures.some((x) => x.name === 'Loadscreen')).toBe(false)
    expect(skin!.internalStructures.some((x) => x.name === 'SkinMeshProperties')).toBe(false)

    const loadscreen = skin!.embed.find((b) => b.title === 'Loadscreen')
    expect(loadscreen).toBeDefined()
    expect(loadscreen!.internalStructures[0]!.name).toBe('CensoredImage')
    expect(loadscreen!.slots).toHaveLength(1)
    expect(loadscreen!.slots![0]!.name).toBe('CensoredImage')

    const meshPointer = skin!.pointer.find((b) => b.title === 'SkinMeshProperties')
    expect(meshPointer).toBeDefined()
    expect(meshPointer!.internalStructures[0]!.name).toBe('SkinMeshDataProperties')
    expect(meshPointer!.slots).toHaveLength(1)
  })

  it('list[embed] MaterialOverride vira listEmbed com title do campo e name do tipo filho', () => {
    const text = `
entries: map[hash,embed] = {
  "Characters/Zac/Skins/Skin0" = SkinCharacterDataProperties {
    SkinMeshProperties: embed = SkinMeshDataProperties {
      MaterialOverride: list[embed] = {
        SkinMeshDataProperties_MaterialOverride {
          Submesh: string = "Puddle"
        }
        SkinMeshDataProperties_MaterialOverride {
          Submesh: string = "Ult"
        }
      }
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const mesh = findParsedSchemaInRegistry(parsed.registry,'skin-mesh-data-properties')
    expect(mesh).toBeDefined()
    expect(mesh!.internalStructures.some((x) => x.name === 'MaterialOverride')).toBe(false)

    const block = mesh!.listEmbed.find((b) => b.title === 'MaterialOverride')
    expect(block).toBeDefined()
    expect(block!.internalStructures).toHaveLength(2)
    expect(block!.internalStructures.every((x) => x.name === 'SkinMeshDataProperties_MaterialOverride')).toBe(
      true,
    )
    expect(block!.internalStructures[0]!.schemaId).toMatch(
      /^skin-mesh-data-properties-material-override(__|$)/,
    )
  })

  it('pointer vazio na mesma linha (Tipo {}) cria bloco POINTER, slot e schema filho', () => {
    const text = `
entries: map[hash,embed] = {
  "Characters/Zac/Animations/Skin0" = AnimationGraphData {
    mClipDataMap: map[hash,embed] = {
      "Spell3_Back" = ParametricClipData {
        mTrackDataName: hash = "Default"
        Updater: pointer = IsMovingParametricUpdater {}
        mParametricPairDataList: list[embed] = {
          ParametricPairData {
            mClipName: hash = "x"
          }
        }
      }
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const clip = findParsedSchemaInRegistry(parsed.registry,'parametric-clip-data')
    expect(clip).toBeDefined()
    expect(clip!.internalStructures.some((x) => x.name === 'Updater')).toBe(false)

    const updater = clip!.pointer.find((b) => b.title === 'Updater')
    expect(updater).toBeDefined()
    expect(updater!.id).toBe('ParametricClipData_pointer_Updater')
    expect(updater!.internalStructures).toHaveLength(1)
    expect(updater!.internalStructures[0]!.name).toBe('IsMovingParametricUpdater')
    expect(updater!.internalStructures[0]!.schemaId).toBe('is-moving-parametric-updater')
    expect(updater!.slots).toHaveLength(1)
    expect(updater!.slots![0]!.schemaId).toBe('is-moving-parametric-updater')

    const child = findParsedSchemaInRegistry(parsed.registry,'is-moving-parametric-updater')
    expect(child).toBeDefined()
    expect(child!.title).toBe('IsMovingParametricUpdater')
    expect(child!.parameters).toHaveLength(0)

    const schemas = schemasFromClassGroupStackParse(parsed)
    expect(schemas.some((s) => s.id === 'is-moving-parametric-updater')).toBe(true)
  })

  it('map[hash,pointer] vira mapHashPointer com entradas hash → schema filho', () => {
    const text = `
entries: map[hash,embed] = {
  "Characters/Zac/Animations/Skin0" = AnimationGraphData {
    mClipDataMap: map[hash,embed] = {
      "Spell3_BackRun" = AtomicClipData {
        mTrackDataName: hash = "Default"
        mEventDataMap: map[hash,pointer] = {
          0xb638e658 = SubmeshVisibilityEventData {
            mEndFrame: f32 = 13
            mShowSubmeshList: list[hash] = {
              "Puddle"
            }
          }
        }
      }
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const clip = findParsedSchemaInRegistry(parsed.registry,'atomic-clip-data')
    expect(clip).toBeDefined()

    const eventMap = clip!.parameters.find((p) => p.name === 'mEventDataMap')
    expect(eventMap?.type).toBe('mapHashPointer')
    const entries = eventMap?.defaultValue.split('\n') ?? []
    expect(entries.length).toBeGreaterThanOrEqual(1)
    expect(entries[0]).toContain('0xb638e658')
    expect(entries[0]).toContain('submesh-visibility-event-data')

    const child = findParsedSchemaInRegistry(parsed.registry,'submesh-visibility-event-data')
    expect(child).toBeDefined()
    expect(child!.parameters.some((p) => p.name === 'mEndFrame')).toBe(true)

    const schemas = schemasFromClassGroupStackParse(parsed)
    expect(
      schemas.some(
        (s) =>
          s.id === 'submesh-visibility-event-data' ||
          s.id.startsWith('submesh-visibility-event-data__'),
      ),
    ).toBe(true)
  })

  it('map[hash,embed] vira mapHashEmbed com entradas hash → schema filho', () => {
    const text = `
entries: map[hash,embed] = {
  "Characters/Zac/Animations/Skin0" = AnimationGraphData {
    mClipDataMap: map[hash,embed] = {
      "Spell3_BackRun" = AtomicClipData {
        mTrackDataName: hash = "Default"
      }
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const anim = findParsedSchemaInRegistry(parsed.registry,'animation-graph-data')
    expect(anim).toBeDefined()

    const clipMap = anim!.parameters.find((p) => p.name === 'mClipDataMap')
    expect(clipMap?.type).toBe('mapHashEmbed')
    const entries = clipMap?.defaultValue.split('\n') ?? []
    expect(entries.length).toBeGreaterThanOrEqual(1)
    expect(entries[0]).toContain('Spell3_BackRun')
    expect(entries[0]).toContain('atomic-clip-data')

    const clip = findParsedSchemaInRegistry(parsed.registry,'atomic-clip-data')
    expect(clip).toBeDefined()
  })

  it('i16 vira parâmetro i16', () => {
    const text = `
BlendData {
  Pass: i16 = 5
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const schema = findParsedSchemaInRegistry(parsed.registry,'blend-data')
    expect(schema).toBeDefined()
    const pass = schema!.parameters.find((p) => p.name === 'Pass')
    expect(pass?.type).toBe('i16')
    expect(pass?.defaultValue).toBe('5')
  })

  it('map[u64,pointer] vira mapU64Pointer com chave decimal', () => {
    const text = `
BlendData {
  mBlendDataTable: map[u64,pointer] = {
    574043308619688281 = TimeBlendData {
      mTime: f32 = 0
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const schema = findParsedSchemaInRegistry(parsed.registry,'blend-data')
    expect(schema).toBeDefined()
    const mapParam = schema!.parameters.find((p) => p.name === 'mBlendDataTable')
    expect(mapParam?.type).toBe('mapU64Pointer')
    const entries = mapParam?.defaultValue.split('\n') ?? []
    expect(entries.length).toBeGreaterThanOrEqual(1)
    expect(entries[0]).toContain('574043308619688281')
    expect(entries[0]).toContain('time-blend-data')
    expect(findParsedSchemaInRegistry(parsed.registry,'time-blend-data')).toBeDefined()
  })

  it('tipo ritual não identificado vira parâmetro string', () => {
    const text = `
TestType {
  mKnown: u32 = 1
  mUnknown: VfxEmitterEnum = SomeValue
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const schema = findParsedSchemaInRegistry(parsed.registry,'test-type')
    expect(schema).toBeDefined()

    const known = schema!.parameters.find((p) => p.name === 'mKnown')
    expect(known?.type).toBe('u32')

    const unknown = schema!.parameters.find((p) => p.name === 'mUnknown')
    expect(unknown?.type).toBe('string')
    expect(unknown?.defaultValue).toBe('SomeValue')
  })
})

describe('normalizeStandaloneClassGroupRitual', () => {
  const vfxJadeStandalone = `
"Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_tar" = VfxSystemDefinitionData {
  complexEmitterDefinitionData: list[pointer] = {
    VfxEmitterDefinitionData {
      emitterName: string = "Ring"
    }
    VfxEmitterDefinitionData {
      emitterName: string = "Splat"
    }
  }
  particleName: string = "Zac_Base_Q_tar"
  flags: u16 = 198
}
`.trim()

  it('envolve ritual com chave string quando não há entries: map', () => {
    const wrapped = normalizeStandaloneClassGroupRitual(vfxJadeStandalone)
    expect(wrapped).toMatch(/entries:\s*map\[hash,embed\]/i)
    expect(wrapped).toContain('VfxSystemDefinitionData')
  })

  it('não altera ritual que já tem entries: map', () => {
    const withEntries = `
entries: map[hash,embed] = {
  "K" = VfxEmitterDefinitionData {
    emitterName: string = "Ring"
  }
}
`.trim()
    expect(normalizeStandaloneClassGroupRitual(withEntries)).toBe(withEntries)
  })

  it('parse standalone: emitters aninhados não são rootSchemaIds', () => {
    const parsed = parseClassGroupRitualWithStack(vfxJadeStandalone)
    const rootTitles = [...parsed.rootSchemaIds].map(
      (id) => parsed.registry.get(id)?.title ?? id,
    )

    expect(rootTitles.some((t) => t === 'VfxSystemDefinitionData')).toBe(true)
    expect(rootTitles.some((t) => t === 'VfxEmitterDefinitionData')).toBe(false)
  })
})
