import type { GroupInspectorSlotTag, GroupParameterIconHint, GroupSlotRules } from './groupSchema'

export const GROUP_ICON_PRESETS: readonly { id: string; label: string }[] = [
  { id: '', label: 'Sem ícone' },
  { id: 'Img', label: 'Imagem' },
  { id: 'Text', label: 'Texto' },
  { id: 'Input', label: 'Input' },
  { id: 'blend.png', label: 'blend.png' },
  { id: 'texture.png', label: 'texture.png' },
  { id: 'color.png', label: 'color.png' },
  { id: 'slot.png', label: 'slot.png' },
]

export const GROUP_SLOT_OUTPUT_PRESETS = ['vec4', 'vec4list', 'vec', 'vec3', 'f32', 'f32range', 'Img', 'string', 'u8']
export const GROUP_SLOT_INPUT_PRESETS = ['multiplyVec4', 'vec4', 'vec', 'f32', 'u8', 'string']

export function GroupSlotPresetsForDirection(direction: 'input' | 'output'): readonly string[] {
  return direction === 'output' ? GROUP_SLOT_OUTPUT_PRESETS : GROUP_SLOT_INPUT_PRESETS
}

export function resolveGroupIconHint(iconId: string): GroupParameterIconHint {
  if (iconId === 'Img' || iconId === 'Text' || iconId === 'Input') {
    return iconId
  }
  if (iconId.trim()) {
    return 'Img'
  }
  return null
}

export function slotTagKey(tag: Pick<GroupInspectorSlotTag, 'direction' | 'type'>): string {
  return `${tag.direction}:${tag.type}`
}

export function slotRulesToTags(rules?: GroupSlotRules): GroupInspectorSlotTag[] {
  const tags: GroupInspectorSlotTag[] = []
  for (const type of rules?.outputs ?? []) {
    tags.push({ direction: 'output', type, active: true })
  }
  for (const type of rules?.inputs ?? []) {
    tags.push({ direction: 'input', type, active: true })
  }
  return tags
}

export function slotTagsToRules(tags: readonly GroupInspectorSlotTag[]): GroupSlotRules | undefined {
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
  slotTags?: GroupInspectorSlotTag[]
  slotRules?: GroupSlotRules
}): GroupInspectorSlotTag[] {
  if (entry.slotTags && entry.slotTags.length > 0) {
    return entry.slotTags
  }
  return slotRulesToTags(entry.slotRules)
}

/** Par IN/OUT do tipo do parâmetro — ambos desactivados por defeito. */
export function defaultGroupInspectorSlotTags(typeParameter: string): GroupInspectorSlotTag[] {
  return [
    { direction: 'input', type: typeParameter, active: false },
    { direction: 'output', type: typeParameter, active: false },
  ]
}

/** Normaliza tags do inspetor de grupo: só IN e OUT com o typeParameter. */
export function groupInspectorTagsFromEntry(entry: {
  typeParameter: string
  slotTags?: GroupInspectorSlotTag[]
  slotRules?: GroupSlotRules
}): GroupInspectorSlotTag[] {
  const base = defaultGroupInspectorSlotTags(entry.typeParameter)

  if (entry.slotTags?.length) {
    return base.map((tag) => {
      const match = entry.slotTags!.find((candidate) => candidate.direction === tag.direction)
      return match ? { ...tag, active: match.active } : tag
    })
  }

  if (entry.slotRules) {
    const hasIn = (entry.slotRules.inputs?.length ?? 0) > 0
    const hasOut = (entry.slotRules.outputs?.length ?? 0) > 0
    return base.map((tag) => ({
      ...tag,
      active: tag.direction === 'input' ? hasIn : hasOut,
    }))
  }

  return base
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
  tags: readonly GroupInspectorSlotTag[],
  parsed: { direction: 'input' | 'output'; type: string },
): GroupInspectorSlotTag[] {
  const key = slotTagKey(parsed)
  const existingIndex = tags.findIndex((tag) => slotTagKey(tag) === key)
  if (existingIndex >= 0) {
    return tags.map((tag, index) => (index === existingIndex ? { ...tag, active: true } : tag))
  }
  return [...tags, { ...parsed, active: true }]
}

export function toggleSlotTagActive(
  tags: readonly GroupInspectorSlotTag[],
  key: string,
): GroupInspectorSlotTag[] {
  return tags.map((tag) => (slotTagKey(tag) === key ? { ...tag, active: !tag.active } : tag))
}

export function iconIdFromDraft(iconId: string | undefined, iconHint: GroupParameterIconHint): string {
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

export function isGroupInspectorPointerEntry(entry: {
  sourcePath: { kind: string }
}): boolean {
  return entry.sourcePath.kind === 'pointerChild'
}

/** Slot IN obrigatório para entradas pointer — tipo = nome da estrutura interna. */
export function mandatoryPointerSlotTags(structureName: string): GroupInspectorSlotTag[] {
  return [{ direction: 'input', type: structureName, active: true }]
}
