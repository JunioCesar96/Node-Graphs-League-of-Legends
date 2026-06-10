import { describe, expect, it } from 'vitest'

import {
  addonSlotTypesAreCompatible,
  isAllowedAddonSlotType,
} from './addonRitualSlotTypes'

describe('addonRitualSlotTypes', () => {
  it('aceita tipos legados e ritual no manifest', () => {
    expect(isAllowedAddonSlotType('string')).toBe(true)
    expect(isAllowedAddonSlotType('u8')).toBe(true)
    expect(isAllowedAddonSlotType('vec3')).toBe(true)
    expect(isAllowedAddonSlotType('unknown')).toBe(false)
  })

  it('liga tipos ritual iguais', () => {
    expect(addonSlotTypesAreCompatible('u8', 'u8')).toBe(true)
    expect(addonSlotTypesAreCompatible('vec3', 'vec3')).toBe(true)
    expect(addonSlotTypesAreCompatible('vec3', 'vec')).toBe(true)
  })

  it('não liga tipos ritual diferentes', () => {
    expect(addonSlotTypesAreCompatible('u8', 'f32')).toBe(false)
    expect(addonSlotTypesAreCompatible('vec3', 'vec4')).toBe(false)
  })

  it('mantém compatibilidade legada number↔ritual numérico', () => {
    expect(addonSlotTypesAreCompatible('number', 'f32')).toBe(true)
    expect(addonSlotTypesAreCompatible('u8', 'number')).toBe(true)
  })

  it('bool e flag são intercambiáveis', () => {
    expect(addonSlotTypesAreCompatible('bool', 'flag')).toBe(true)
    expect(addonSlotTypesAreCompatible('boolean', 'bool')).toBe(true)
  })
})
