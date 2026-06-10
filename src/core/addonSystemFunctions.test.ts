import { describe, expect, it } from 'vitest'

import {
  isKnownAddonSystemFunction,
  listKnownAddonSystemFunctions,
} from './addonSystemFunctions'

describe('addonSystemFunctions', () => {
  it('regista funções de sistema conhecidas', () => {
    expect(listKnownAddonSystemFunctions()).toContain('codeToNodeBlock')
    expect(listKnownAddonSystemFunctions()).toContain('jsonToNodeBlock')
    expect(isKnownAddonSystemFunction('codeToNodeBlock')).toBe(true)
    expect(isKnownAddonSystemFunction('jsonToNodeBlock')).toBe(true)
    expect(isKnownAddonSystemFunction('unknown')).toBe(false)
  })
})
