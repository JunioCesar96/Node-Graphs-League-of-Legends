import type { BlockInspectorSlotTag, BlockParameterIconHint, BlockSlotRules } from './blockSchema'

export const BLOCK_ICON_PRESETS: readonly { id: string; label: string }[] = [
  { id: '', label: 'Sem ícone' },
  { id: 'Img', label: 'Imagem' },
  { id: 'Text', label: 'Texto' },
  { id: 'Input', label: 'Input' },
  { id: 'blend.png', label: 'blend.png' },
  { id: 'texture.png', label: 'texture.png' },
  { id: 'color.png', label: 'color.png' },
  { id: 'slot.png', label: 'slot.png' },
]

export const BLOCK_SLOT_OUTPUT_PRESETS = ['vec4', 'vec4list', 'vec', 'vec3', 'f32', 'f32range', 'Img', 'string', 'u8']
export const BLOCK_SLOT_INPUT_PRESETS = ['multiplyVec4', 'vec4', 'vec', 'f32', 'u8', 'string']

export function blockSlotPresetsForDirection(direction: 'input' | 'output'): readonly string[] {
  return direction === 'output' ? BLOCK_SLOT_OUTPUT_PRESETS : BLOCK_SLOT_INPUT_PRESETS
}

export function resolveBlockIconHint(iconId: string): BlockParameterIconHint {
  if (iconId === 'Img' || iconId === 'Text' || iconId === 'Input') {
    return iconId
  }
  if (iconId.trim()) {
    return 'Img'
  }
  return null
}

export function slotTagKey(tag: Pick<BlockInspectorSlotTag, 'direction' | 'type'>): string {
  return `${tag.direction}:${tag.type}`
}

export function slotRulesToTags(rules?: BlockSlotRules): BlockInspectorSlotTag[] {
  const tags: BlockInspectorSlotTag[] = []
  for (const type of rules?.outputs ?? []) {
    tags.push({ direction: 'output', type, active: true })
  }
  for (const type of rules?.inputs ?? []) {
    tags.push({ direction: 'input', type, active: true })
  }
  return tags
}

export function slotTagsToRules(tags: readonly BlockInspectorSlotTag[]): BlockSlotRules | undefined {
  const outputs = tags.filter((tag) => tag.direction === 'output' && tag.active).map((tag) => tag.type)
  const inputs = tags.filter((tag) => tag.direction === 'input' && tag.active).map((tag) => tag.type)
  if (outputs.length === 0 && inputs.length === 0) {
    return undefined
  }
  return {
    outputs: outputs.length > 0 ? outputs : undefined,
    inputs: inputs.length > 0 ? inputs : undefined,
  }
}

export function normalizeDraftEntrySlots(entry: {
  slotTags?: BlockInspectorSlotTag[]
  slotRules?: BlockSlotRules
}): BlockInspectorSlotTag[] {
  if (entry.slotTags && entry.slotTags.length > 0) {
    return entry.slotTags
  }
  return slotRulesToTags(entry.slotRules)
}

/** Interpreta texto do campo slot; `{…}` é ignorado na tag (ex.: `in{1}vec` → `in:vec`). */
export function parseSlotDraftInput(
  raw: string,
  toggleDirection: 'input' | 'output',
): { direction: 'input' | 'output'; type: string } | null {
  let text = raw.trim()
  if (!text) {
    return null
  }

  let direction = toggleDirection
  if (/^in:/i.test(text)) {
    direction = 'input'
    text = text.slice(3)
  } else if (/^out:/i.test(text)) {
    direction = 'output'
    text = text.slice(4)
  } else if (/^in(?=\{|:|\w)/i.test(text)) {
    direction = 'input'
    text = text.replace(/^in/i, '')
  } else if (/^out(?=\{|:|\w)/i.test(text)) {
    direction = 'output'
    text = text.replace(/^out/i, '')
  }

  text = text.replace(/\{[^}]*\}/g, '').trim()
  if (!text) {
    return null
  }

  return { direction, type: text }
}

export function addSlotTag(
  tags: readonly BlockInspectorSlotTag[],
  parsed: { direction: 'input' | 'output'; type: string },
): BlockInspectorSlotTag[] {
  const key = slotTagKey(parsed)
  const existingIndex = tags.findIndex((tag) => slotTagKey(tag) === key)
  if (existingIndex >= 0) {
    return tags.map((tag, index) => (index === existingIndex ? { ...tag, active: true } : tag))
  }
  return [...tags, { ...parsed, active: true }]
}

export function toggleSlotTagActive(
  tags: readonly BlockInspectorSlotTag[],
  key: string,
): BlockInspectorSlotTag[] {
  return tags.map((tag) => (slotTagKey(tag) === key ? { ...tag, active: !tag.active } : tag))
}

export function iconIdFromDraft(iconId: string | undefined, iconHint: BlockParameterIconHint): string {
  if (iconId !== undefined) {
    return iconId
  }
  return iconHint ?? ''
}

export function filterComboOptions(query: string, options: readonly string[]): string[] {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return [...options]
  }
  return options.filter((option) => option.toLowerCase().includes(needle))
}

export function isBlockInspectorPointerEntry(entry: {
  sourcePath: { kind: string }
}): boolean {
  return entry.sourcePath.kind === 'pointerChild'
}

/** Slot IN obrigatório para entradas pointer — tipo = nome da estrutura interna. */
export function mandatoryPointerSlotTags(structureName: string): BlockInspectorSlotTag[] {
  return [{ direction: 'input', type: structureName, active: true }]
}
