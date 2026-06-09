import { beforeEach, describe, expect, it } from 'vitest'

import { registerInputAddonManifest } from '@/blockStructures/inputAddonRegistry'
import {
  findMatchingInputAddons,
  inputAddonMatchesParameter,
  nodeDataTypeToRitualAddonType,
  resolveBlockParameterInputAddonBinding,
} from '@/core/inputAddonMatcher'
import type { InputAddonManifest } from '@/services/inputAddonLoader.service'

const colorVec4Manifest: InputAddonManifest = {
  id: 'input-addon-color-vec4',
  type: 'input',
  name: 'Cor Vec4',
  category: 'Values',
  input: {
    block: 'ValueColor',
    parameter: 'constantValue',
    type: 'vec4',
    change: 'inputaddon',
  },
}

describe('inputAddonMatcher', () => {
  beforeEach(() => {
    registerInputAddonManifest(colorVec4Manifest)
  })

  it('normaliza vector4 para vec4', () => {
    expect(nodeDataTypeToRitualAddonType('vector4')).toBe('vec4')
  })

  it('faz match de ValueColor.constantValue vec4', () => {
    expect(
      inputAddonMatchesParameter(colorVec4Manifest, 'ValueColor', 'constantValue', 'vec4'),
    ).toBe(true)
    expect(
      inputAddonMatchesParameter(colorVec4Manifest, 'ValueColor', 'dynamics', 'vec4'),
    ).toBe(false)
  })

  it('lista manifests compatíveis', () => {
    const matches = findMatchingInputAddons('ValueColor', 'constantValue', 'vec4')
    expect(matches.some((manifest) => manifest.id === 'input-addon-color-vec4')).toBe(true)
  })

  it('resolve binding activo para parâmetro de bloco', () => {
    const binding = resolveBlockParameterInputAddonBinding(
      'ValueColor',
      'constantValue',
      'vec4',
    )
    expect(binding?.activeInputAddonId).toBe('input-addon-color-vec4')
    expect(binding?.activeManifest.id).toBe('input-addon-color-vec4')
  })

  it('ignora tipos estruturais embed', () => {
    expect(
      resolveBlockParameterInputAddonBinding('VfxEmitter', 'birthColor', 'ValueColor{}'),
    ).toBeNull()
  })
})
