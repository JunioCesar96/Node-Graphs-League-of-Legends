import { describe, expect, it } from 'vitest'

import {
  addSlotTag,
  defaultGroupInspectorSlotTags,
  groupInspectorTagsFromEntry,
  parseSlotDraftInput,
  slotTagsToRules,
  toggleSlotTagActive,
} from './groupInspectorUi'

describe('GroupInspectorUi', () => {
  it('cria par IN/OUT desactivado por defeito', () => {
    expect(defaultGroupInspectorSlotTags('u8')).toEqual([
      { direction: 'input', type: 'u8', active: false },
      { direction: 'output', type: 'u8', active: false },
    ])
  })

  it('normaliza entrada existente para par IN/OUT', () => {
    const tags = groupInspectorTagsFromEntry({
      typeParameter: 'vec4',
      slotRules: { outputs: ['vec4', 'vec4list'], inputs: ['multiplyVec4'] },
    })
    expect(tags).toEqual([
      { direction: 'input', type: 'vec4', active: true },
      { direction: 'output', type: 'vec4', active: true },
    ])
  })

  it('parseia slot ignorando valores entre chaves', () => {
    expect(parseSlotDraftInput('in{1}vec', 'output')).toEqual({ direction: 'input', type: 'vec' })
    expect(parseSlotDraftInput('vec{1}', 'output')).toEqual({ direction: 'output', type: 'vec' })
    expect(parseSlotDraftInput('in{1}', 'output')).toBeNull()
  })

  it('adiciona tag activa e reactiva existente', () => {
    const first = addSlotTag([], { direction: 'output', type: 'vec' })
    expect(first).toEqual([{ direction: 'output', type: 'vec', active: true }])

    const second = addSlotTag(
      [{ direction: 'output', type: 'vec', active: false }],
      { direction: 'output', type: 'vec' },
    )
    expect(second[0]?.active).toBe(true)
  })

  it('alterna selecção de tag', () => {
    const tags = [{ direction: 'input' as const, type: 'f32', active: true }]
    const toggled = toggleSlotTagActive(tags, 'input:f32')
    expect(toggled[0]?.active).toBe(false)
  })

  it('converte tags activas para slotRules', () => {
    const rules = slotTagsToRules([
      { direction: 'output', type: 'vec', active: true },
      { direction: 'input', type: 'f32', active: false },
    ])
    expect(rules?.outputs).toEqual(['vec'])
    expect(rules?.inputs).toBeUndefined()
  })
})
