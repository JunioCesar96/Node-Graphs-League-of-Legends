import { describe, expect, it } from 'vitest'

import {
  analyzeRitualTextBinNomecratura,
  applyClassGroupNomenclatureFromSchemaPaths,
  applyNomenclatureFromBinRitualText,
  mapCollectionNomenclatureToGroup,
} from '@/core/binNomenclatureAnalyzer'
import { convertRitualTextToNodeSchemas } from '@/core/convertRitualTextToNodeStructures'
import {
  buildVfxJadeNomenclaturePathHierarchy,
  buildVfxJadePathHierarchySteps,
  VFX_JADE_EMITTER_EMBED_COLLECTION,
  VFX_JADE_EMITTER_EMBED_GROUP,
  VFX_JADE_SYSTEM_ROOT_COLLECTION,
  VFX_JADE_SYSTEM_ROOT_GROUP,
} from '@/core/vfxJadeNomenclature'

describe('mapCollectionNomenclatureToGroup', () => {
  it('mapeia níveis #1–#4 para conjuntos nomecratura.md', () => {
    expect(mapCollectionNomenclatureToGroup('#1 Root Map')).toBe('#1 Classes')
    expect(mapCollectionNomenclatureToGroup('#2 Root Entry')).toBe('#2 Entidades')
    expect(mapCollectionNomenclatureToGroup('#3 Embed Block')).toBe('#3 Internal Structures')
    expect(mapCollectionNomenclatureToGroup('#4 Primitive Field')).toBe('#4 Parameters')
  })
})

describe('applyNomenclatureFromBinRitualText', () => {
  it('preenche group/collection nos schemas VFX na ordem do conversor', () => {
    const text = `
"DATA/Test/Particle" = VfxSystemDefinitionData {
particleName: string = "MyFx"
"Vfx_emitter_one" = VfxEmitterDefinitionData {
emitterName: string = "spark"
particleLifetime: embed = ValueFloat {
constantValue: f32 = 1.25
}
}
}
`.trim()

    const conv = convertRitualTextToNodeSchemas(text)
    expect(conv.ok).toBe(true)
    if (!conv.ok) {
      return
    }

    const { schemas, appliedCount, warnings } = applyNomenclatureFromBinRitualText(text, conv.schemas)
    expect(appliedCount).toBe(conv.schemas.length)
    expect(warnings[0]).toMatch(/actualizados/)

    const system = schemas.find((s) => s.id.startsWith('vfx-sys-'))
    const emitter = schemas.find((s) => s.id.startsWith('vfx-em-'))

    expect(system?.nomenclature).toEqual({
      group: VFX_JADE_SYSTEM_ROOT_GROUP,
      collection: VFX_JADE_SYSTEM_ROOT_COLLECTION,
      collectionType: 'VFX',
      pathHierarchy: buildVfxJadeNomenclaturePathHierarchy('system', text),
      pathHierarchySteps: buildVfxJadePathHierarchySteps('system', text, {
        systemKey: 'DATA/Test/Particle',
      }),
    })
    expect(emitter?.nomenclature).toEqual({
      group: VFX_JADE_EMITTER_EMBED_GROUP,
      collection: VFX_JADE_EMITTER_EMBED_COLLECTION,
      collectionType: 'Emitter',
      pathHierarchy: buildVfxJadeNomenclaturePathHierarchy('emitter', text),
      pathHierarchySteps: buildVfxJadePathHierarchySteps('emitter', text, {
        systemKey: 'DATA/Test/Particle',
        emitterName: 'spark',
      }),
    })
  })

  it('com entries: map no ritual, pathHierarchy inclui #1 Root Entry', () => {
    const text = `
entries: map[hash, embed] {
"DATA/Test/Particle" = VfxSystemDefinitionData {
particleName: string = "MyFx"
"Vfx_emitter_one" = VfxEmitterDefinitionData {
emitterName: string = "spark"
}
}
}
`.trim()

    const conv = convertRitualTextToNodeSchemas(text)
    expect(conv.ok).toBe(true)
    if (!conv.ok) {
      return
    }
    const { schemas } = applyNomenclatureFromBinRitualText(text, conv.schemas)
    const emitter = schemas.find((s) => s.id.startsWith('vfx-em-'))
    expect(emitter?.nomenclature?.pathHierarchy).toBe(buildVfxJadeNomenclaturePathHierarchy('emitter', text))
    expect(emitter?.nomenclature?.pathHierarchySteps).toEqual(
      buildVfxJadePathHierarchySteps('emitter', text, {
        systemKey: 'DATA/Test/Particle',
        emitterName: 'spark',
      }),
    )
    expect(emitter?.nomenclature?.pathHierarchy).toMatch(/#1 Root Entry/)
  })

  it('sem VFX no texto, não altera schemas e avisa', () => {
    const schemas = [{ id: 'x', title: 'X', parameters: [], internalStructures: [] }]
    const out = applyNomenclatureFromBinRitualText('BankUnit { id: string = "a" }', schemas)
    expect(out.appliedCount).toBe(0)
    expect(out.warnings.some((w) => /VfxSystemDefinitionData/i.test(w) || /VFX/i.test(w))).toBe(true)
    expect(out.schemas[0]!.nomenclature).toBeUndefined()
  })
})

describe('applyClassGroupNomenclatureFromSchemaPaths', () => {
  it('preenche collection/pathHierarchy a partir das pilhas do conversor', () => {
    const schemas = [
      {
        id: 'skin-character-data-properties',
        title: 'SkinCharacterDataProperties',
        parameters: [],
        internalStructures: [],
      },
    ]
    const pathById = {
      'skin-character-data-properties': [
        { id: 'entries', type: '#1 Root Entry' },
        { id: 'K', type: '#2 Root Entry (SkinCharacterDataProperties)' },
      ] as const,
    }
    const { schemas: next, appliedCount } = applyClassGroupNomenclatureFromSchemaPaths(schemas, pathById)
    expect(appliedCount).toBe(1)
    expect(next[0]!.nomenclature?.group).toBe('#2 Entidades')
    expect(next[0]!.nomenclature?.pathHierarchy).toBe('entries > K')
    expect(next[0]!.nomenclature?.pathHierarchySteps?.length).toBe(2)
  })
})

describe('analyzeRitualTextBinNomecratura', () => {
  it('classifica cabeçalho, root map e entrada VFX vs outra', () => {
    const src = `
type: string = "x"
version: u32 = 1
linked: list[string] = {}
entries: map[hash, embed] {
  "A" = VfxSystemDefinitionData {
    particleName: string = "p"
  }
  "B" = OtherData {
    n: u32 = 1
  }
}
`.trim()

    const tags = analyzeRitualTextBinNomecratura(src)
    const collections = tags.map((t) => t.collection)
    expect(collections).toContain('#1 Header Metadata')
    expect(collections).toContain('#1 Dependency Array')
    expect(collections).toContain('#1 Root Map')
    expect(collections).toContain('#2 VFX Definition Root')
    expect(collections).toContain('#2 Root Entry')
  })

  it('classifica VfxEmitterDefinitionData aninhado como #3 Embed Block', () => {
    const src = `
type: string = "x"
version: u32 = 1
linked: list[string] = {}
entries: map[hash, embed] {
  "DATA/X" = VfxSystemDefinitionData {
    particleName: string = "MyFx"
    "Vfx_e" = VfxEmitterDefinitionData {
      emitterName: string = "spark"
    }
  }
}
`.trim()

    const tags = analyzeRitualTextBinNomecratura(src)
    expect(tags.some((t) => t.collection === '#3 Embed Block' && /VfxEmitterDefinitionData/.test(t.line))).toBe(
      true,
    )
  })
})

