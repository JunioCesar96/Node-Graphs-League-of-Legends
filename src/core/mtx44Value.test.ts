import { describe, expect, it } from 'vitest'

import {
  buildMtx44FromSemantic,
  identityMtx44Values,
  normalizeMtx44String,
  parseMtx44String,
  semanticFromMtx44,
} from '@/core/mtx44Value'

describe('mtx44Value', () => {
  it('parse vazio devolve identidade', () => {
    expect(parseMtx44String('')).toEqual([...identityMtx44Values()])
  })

  it('build impõe estrutura afim (zeros e w=1)', () => {
    const values = buildMtx44FromSemantic({
      scaleX: 2,
      scaleY: 3,
      scaleZ: 0.5,
      positionX: 10,
      positionY: -5,
      positionZ: 250,
    })
    expect(values).toEqual([
      2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0.5, 0, 10, -5, 250, 1,
    ])
  })

  it('semanticFromMtx44 lê diagonal e translação', () => {
    const raw = '2, 0, 0, 0 0, 1, 0, 0 0, 0, -1, 0 0, 15.5, -42.1, 1'
    const semantic = semanticFromMtx44(parseMtx44String(raw))
    expect(semantic.scaleX).toBe(2)
    expect(semantic.scaleY).toBe(1)
    expect(semantic.scaleZ).toBe(-1)
    expect(semantic.positionY).toBe(15.5)
    expect(semantic.positionZ).toBe(-42.1)
  })

  it('normalize reconstrói matriz válida a partir de ritual colapsado', () => {
    const normalized = normalizeMtx44String(
      '1, 0, 0, 0 0, 1, 0, 0 0, 0, 1, 0 0, 15.5, -42.1, 1',
    )
    expect(normalized).toBe('1, 0, 0, 0 0, 1, 0, 0 0, 0, 1, 0 0, 15.5, -42.1, 1')
    const rebuilt = buildMtx44FromSemantic(semanticFromMtx44(parseMtx44String(normalized)))
    expect(rebuilt[13]).toBe(15.5)
    expect(rebuilt[14]).toBe(-42.1)
  })

  it('espelhamento: escala negativa em dois eixos', () => {
    const values = buildMtx44FromSemantic({
      scaleX: -1,
      scaleY: -1,
      scaleZ: 1,
      positionX: 0,
      positionY: 0,
      positionZ: 0,
    })
    expect(values[0]).toBe(-1)
    expect(values[5]).toBe(-1)
    expect(values[10]).toBe(1)
  })
})
