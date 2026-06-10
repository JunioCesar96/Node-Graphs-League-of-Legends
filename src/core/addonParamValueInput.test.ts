import { describe, expect, it } from 'vitest'

import {
  isAddonValueInputFilterType,
  projectInputValueAfterEdit,
} from '@/core/addonParamValueInput'

describe('addonParamValueInput', () => {
  it('isAddonValueInputFilterType cobre inteiros, floats e vetores', () => {
    expect(isAddonValueInputFilterType('u8')).toBe(true)
    expect(isAddonValueInputFilterType('i32')).toBe(true)
    expect(isAddonValueInputFilterType('f32')).toBe(true)
    expect(isAddonValueInputFilterType('vector3')).toBe(true)
    expect(isAddonValueInputFilterType('rgba')).toBe(true)
    expect(isAddonValueInputFilterType('string')).toBe(false)
    expect(isAddonValueInputFilterType('bool')).toBe(false)
  })

  it('projectInputValueAfterEdit projeta inserção e apagamento', () => {
    const input = document.createElement('input')
    input.value = '12'
    input.setSelectionRange(2, 2)

    const insert = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: '3',
      bubbles: true,
    })
    expect(projectInputValueAfterEdit(input, insert)).toBe('123')

    input.setSelectionRange(1, 1)
    const backspace = new InputEvent('beforeinput', {
      inputType: 'deleteContentBackward',
      bubbles: true,
    })
    expect(projectInputValueAfterEdit(input, backspace)).toBe('2')
  })
})
