import { describe, expect, it } from 'vitest'

import { validateAddonParamLiteral } from './addonParamValueValidation'

describe('validateAddonParamLiteral', () => {
  it('aceita string numa linha', () => {
    expect(validateAddonParamLiteral('string', 'hello')).toEqual({
      ok: true,
      value: 'hello',
    })
  })

  it('rejeita u8 fora do intervalo', () => {
    expect(validateAddonParamLiteral('u8', '256').ok).toBe(false)
    expect(validateAddonParamLiteral('u8', '10').ok).toBe(true)
  })

  it('rejeita bool inválido', () => {
    expect(validateAddonParamLiteral('bool', 'yes').ok).toBe(false)
    expect(validateAddonParamLiteral('bool', 'true').ok).toBe(true)
  })

  it('rejeita f32 incompleto', () => {
    expect(validateAddonParamLiteral('f32', '-').ok).toBe(false)
    expect(validateAddonParamLiteral('f32', '1.5').ok).toBe(true)
  })

  it('valida vec3 com três componentes', () => {
    expect(validateAddonParamLiteral('vec3', '1, 2').ok).toBe(false)
    expect(validateAddonParamLiteral('vec3', '1, 2, 3').ok).toBe(true)
  })

  it('normaliza vec3 ao confirmar', () => {
    const result = validateAddonParamLiteral('vec3', '1,2,3')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe('1, 2, 3')
    }
  })

  it('valida mtx44 com 16 componentes', () => {
    expect(validateAddonParamLiteral('mtx44', '1, 0, 0, 0').ok).toBe(false)
    const identity =
      '1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1'
    const result = validateAddonParamLiteral('mtx44', identity)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe(identity)
    }
  })
})
