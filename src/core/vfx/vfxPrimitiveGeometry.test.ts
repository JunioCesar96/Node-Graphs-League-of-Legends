import { describe, expect, it } from 'vitest'

import { primitiveBoxArgs, primitiveLocalRotation } from './vfxPrimitiveGeometry'

describe('primitiveBoxArgs', () => {
  it('eixo longo em Three Z (LoL Y)', () => {
    const [x, y, z] = primitiveBoxArgs('beam')
    expect(z).toBeGreaterThan(x)
    expect(z).toBeGreaterThan(y)
  })

  it('ray e trail seguem o mesmo mapeamento', () => {
    expect(primitiveBoxArgs('ray')[2]).toBeGreaterThan(primitiveBoxArgs('ray')[0])
    expect(primitiveBoxArgs('trail')[2]).toBeGreaterThan(primitiveBoxArgs('trail')[1])
  })
})

describe('primitiveLocalRotation', () => {
  it('quad ground: sem rotação (plano XY, normal +Z)', () => {
    expect(primitiveLocalRotation('plane', 'ground')).toEqual([0, 0, 0])
  })

  it('quad câmara: deita para plano XZ (normal LoL Z → Three Y)', () => {
    const [rx] = primitiveLocalRotation('plane', 'camera')
    expect(rx).toBeCloseTo(-Math.PI / 2, 5)
  })

  it('cilindro vertical: eixo Y Three → Z Three', () => {
    const [rx] = primitiveLocalRotation('cylinder', 'camera')
    expect(rx).toBeCloseTo(-Math.PI / 2, 5)
  })

  it('beam sem rotação extra (dimensões já em LoL)', () => {
    expect(primitiveLocalRotation('beam', 'camera')).toEqual([0, 0, 0])
  })

  it('mesh carregada: sem rotação primitiva (orientação na geometria)', () => {
    expect(primitiveLocalRotation('mesh', 'camera')).toEqual([0, 0, 0])
    expect(primitiveLocalRotation('mesh', 'ground')).toEqual([0, 0, 0])
  })
})
