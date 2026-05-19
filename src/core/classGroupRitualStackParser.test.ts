import { describe, expect, it } from 'vitest'

import { parseClassGroupRitualWithStack, schemasFromClassGroupStackParse } from '@/core/classGroupRitualStackParser'
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
    const deepest = parsed.registry.get('level4')
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
    const mesh = parsed.registry.get('skin-mesh-data-properties')
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

  it('bool e flag true/false viram parâmetros type bool', () => {
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
    const bank = parsed.registry.get('bank-unit')
    expect(bank).toBeDefined()

    const voiceOver = bank!.parameters.find((p) => p.name === 'VoiceOver')
    const enabled = bank!.parameters.find((p) => p.name === 'Enabled')
    const singleParticle = bank!.parameters.find((p) => p.name === 'IsSingleParticle')

    expect(voiceOver?.type).toBe('bool')
    expect(voiceOver?.defaultValue).toBe('true')
    expect(enabled?.type).toBe('bool')
    expect(enabled?.defaultValue).toBe('false')
    expect(singleParticle?.type).toBe('bool')
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
    const skin = parsed.registry.get('skin-character-data-properties')

    expect(skin).toBeDefined()
    expect(skin!.parameters.some((p) => p.name === 'armorMaterial')).toBe(true)
    expect(skin!.parameters.some((p) => p.name === 'flags')).toBe(true)
    expect(parsed.rootSchemaIds.has('skin-character-data-properties')).toBe(true)
    expect(parsed.rootSchemaIds.has('bank-unit')).toBe(false)

    const schemas = schemasFromClassGroupStackParse(parsed)
    expect(schemas.some((s) => s.id === 'main-node')).toBe(false)
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
    const audio = parsed.registry.get('skin-audio-properties')
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
    const vfx = parsed.registry.get('vfx-system-definition-data')
    const emitter = parsed.registry.get('vfx-emitter-definition-data')

    expect(vfx).toBeDefined()
    expect(emitter).toBeDefined()
    expect(vfx!.parameters.some((p) => p.name === 'particleLifetime')).toBe(true)
    const listPtr = vfx!.listPointer.find((b) => b.title === 'ComplexEmitterDefinitionData')
    expect(listPtr).toBeDefined()
    expect(listPtr!.internalStructures.some((c) => c.schemaId === emitter!.id)).toBe(true)
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
    const anim = parsed.registry.get('animation-graph-data')
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
    const emitter = parsed.registry.get('vfx-emitter-definition-data')
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
    const anim = parsed.registry.get('vfx-animated-color-variable-data')
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
    const emitter = parsed.registry.get('vfx-emitter-definition-data')

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
    expect(parsed.rootSchemaIds.has('vfx-system-definition-data')).toBe(true)
    const mesh = parsed.registry.get('vfx-mesh-definition-data')
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
    const driver = parsed.registry.get('is-animation-playing-dynamic-material-bool-driver')
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
    const emitter = parsed.registry.get('vfx-emitter-definition-data')
    const times = emitter!.parameters.find((p) => p.name === 'Times')
    const tags = emitter!.parameters.find((p) => p.name === 'TagEventList')
    expect(times?.type).toBe('listF32')
    expect(times?.defaultValue).toBe('0\n0.5\n1')
    expect(tags?.type).toBe('listString')
    expect(tags?.defaultValue).toBe('Zac\nOther')
    expect(emitter!.internalStructures.length).toBe(0)
  })
})

describe('convertRitobinStructureTextToNodeSchemas (stack)', () => {
  it('expõe rootSchemaIds para entidades do mapa', () => {
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
    expect(out.rootSchemaIds).toContain('skin-character-data-properties')
    expect(out.schemas.length).toBeGreaterThanOrEqual(1)
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
    const skin = parsed.registry.get('skin-character-data-properties')
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
    const mesh = parsed.registry.get('skin-mesh-data-properties')
    expect(mesh).toBeDefined()
    expect(mesh!.internalStructures.some((x) => x.name === 'MaterialOverride')).toBe(false)

    const block = mesh!.listEmbed.find((b) => b.title === 'MaterialOverride')
    expect(block).toBeDefined()
    expect(block!.internalStructures).toHaveLength(2)
    expect(block!.internalStructures.every((x) => x.name === 'SkinMeshDataProperties_MaterialOverride')).toBe(
      true,
    )
    expect(block!.internalStructures[0]!.schemaId).toBe('skin-mesh-data-properties-material-override')
  })
})
